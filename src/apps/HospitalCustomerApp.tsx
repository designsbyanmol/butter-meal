// src/apps/HospitalCustomerApp.tsx
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { supabaseService } from '../services/supabase.service';
import { supabase } from '../services/supabase.client';
import {
  Button,
  Input,
  Modal,
  FormField,
  Card,
  Badge,
  Banner,
  Sheet,
  Select,
  Spinner,
  EmptyState,
  Chip,
} from '../components/ui';
import { useIsMobile } from '../hooks/useIsMobile';
import { formatRupees } from '../utils/subscription';
import { DownloadIcon, CloseIcon } from '../assets/svgs';
import menuLocal from '../components/Menu/Menu.module.scss';
import detailLocal from '../components/MenuDetail/MenuDetail.module.scss';
import pageLocal from './HospitalCustomerApp.module.scss';

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const ACTIVE_TOKEN_KEY = 'hospital_active_token';

// ── Cache config ─────────────────────────────────────────
// sessionStorage cache is per-tab, per-origin. Closing the tab
// clears it — that's fine, the next visit refetches once.
const CATALOG_CACHE_TTL_MS = 15 * 60_000; // 15 min
const CATALOG_CACHE_PREFIX = 'hosp_customer_catalog_v1:';
// Fallback poll only fires if Realtime is unavailable.
const TOKEN_FALLBACK_POLL_MS = 90_000;

const GENDER_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

// ── Cached catalog helpers ───────────────────────────────
interface CachedCatalog {
  services: any[];
  doctors: any[];
  categories: { name: string; sort_order: number; hidden: boolean }[];
  at: number;
}

function readCatalogCache(slug: string): CachedCatalog | null {
  try {
    const raw = sessionStorage.getItem(CATALOG_CACHE_PREFIX + slug);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray(parsed.services) ||
      !Array.isArray(parsed.doctors) ||
      !Array.isArray(parsed.categories) ||
      typeof parsed.at !== 'number'
    ) {
      return null;
    }
    return parsed as CachedCatalog;
  } catch {
    return null;
  }
}

function writeCatalogCache(slug: string, data: CachedCatalog) {
  try {
    sessionStorage.setItem(CATALOG_CACHE_PREFIX + slug, JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}

export default function HospitalCustomerApp() {
  const { tenant } = useTenant();
  const isMobile = useIsMobile();

  // ── Data ────────────────────────────────────────────────
  const [services, setServices] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<
    { name: string; sort_order: number; hidden: boolean }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  // ── Detail view ─────────────────────────────────────────
  const [viewingService, setViewingService] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // ── Booking flow ────────────────────────────────────────
  const [selectedService, setSelectedService] = useState<any>(null);
  const [bookingStep, setBookingStep] = useState<'form' | 'payment' | 'waiting'>(
    'form',
  );
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    doctor: '',
    age: '',
    gender: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // ── Live token ──────────────────────────────────────────
  const [myToken, setMyToken] = useState<any>(null);
  const [currentToken, setCurrentToken] = useState(0);

  // Derived set of hidden categories
  const removedCategories = useMemo(
    () =>
      new Set(
        dbCategories.filter((c) => c.hidden).map((c) => c.name),
      ),
    [dbCategories],
  );

  // ── Catalog fetch + cache ───────────────────────────────
  // Called on mount and when the tab becomes visible again.
  // Uses sessionStorage so navigating away and back is free.
  const fetchCatalog = useCallback(
    async (opts: { force?: boolean } = {}) => {
      if (!tenant) return;

      const cached = readCatalogCache(tenant.slug);
      const isFresh =
        cached &&
        Date.now() - cached.at < CATALOG_CACHE_TTL_MS;

      if (isFresh && !opts.force) {
        setServices(cached!.services);
        setDoctors(cached!.doctors);
        setDbCategories(cached!.categories);
        setIsLoading(false);
        hasLoadedRef.current = true;
        return;
      }

      // Show whatever we have while revalidating
      if (cached) {
        setServices(cached.services);
        setDoctors(cached.doctors);
        setDbCategories(cached.categories);
        setIsLoading(false);
        hasLoadedRef.current = true;
      } else if (!hasLoadedRef.current) {
        setIsLoading(true);
      }

      const [servicesData, doctorsData, categoriesData] = await Promise.all([
        supabaseService.getHospitalServices(tenant.slug),
        supabaseService.getHospitalDoctors(tenant.slug),
        supabaseService.getHospitalServiceCategories(tenant.slug),
      ]);

      setServices(servicesData);
      setDoctors(doctorsData || []);
      setDbCategories(categoriesData || []);
      setIsLoading(false);
      hasLoadedRef.current = true;

      writeCatalogCache(tenant.slug, {
        services: servicesData,
        doctors: doctorsData || [],
        categories: categoriesData || [],
        at: Date.now(),
      });
    },
    [tenant?.slug],
  );

  // Initial catalog fetch — once per tenant change.
  useEffect(() => {
    if (!tenant) return;
    fetchCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.slug]);

  // Re-fetch when the tab becomes visible again.
  // This replaces the aggressive 60s poll.
  useEffect(() => {
    if (!tenant) return;

    const onVisibility = () => {
      if (document.hidden) return;
      fetchCatalog(); // will hit cache if fresh
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () =>
      document.removeEventListener('visibilitychange', onVisibility);
  }, [tenant?.slug, fetchCatalog]);

  // ── Restore active token ───────────────────────────────
  useEffect(() => {
    if (!tenant || !supabase) return;

    const savedId = sessionStorage.getItem(ACTIVE_TOKEN_KEY);
    if (!savedId) return;

    (async () => {
      const { data } = await supabase
        .from('star_veg_hospital_appointments')
        .select('*')
        .eq('id', savedId)
        .maybeSingle();

      if (data) {
        setMyToken(data);
        if (!['resolved', 'failed'].includes(data.status)) {
          setBookingStep('waiting');
        }
      } else {
        sessionStorage.removeItem(ACTIVE_TOKEN_KEY);
      }
    })();
  }, [tenant]);

  // ── Realtime subscription for the customer's own token ──
  // Replaces the 60s double-poll. We still fetch the "now serving"
  // counter once at subscribe time, then update on any row change
  // for this tenant's today appointments.
  useEffect(() => {
  if (bookingStep !== 'waiting' || !tenant || !myToken || !supabase) return;
  const client = supabase;         // now typed as SupabaseClient
  const tenantId = tenant.id;
  const myTokenId = myToken.id;

  let isMounted = true;
  let fallbackTimer: number | null = null;

  const today = new Date().toISOString().split('T')[0];

  const fetchCurrentToken = async () => {
    const { data: resolved } = await client
      .from('star_veg_hospital_appointments')
      .select('token_no')
      .eq('tenant_id', tenantId)
      .eq('booking_date', today)
      .eq('status', 'resolved')
      .order('token_no', { ascending: false })
      .limit(1);

    if (isMounted && resolved && resolved.length > 0) {
      setCurrentToken(resolved[0].token_no);
    }
  };

  const fetchMyToken = async () => {
    const { data: myLatest } = await client
      .from('star_veg_hospital_appointments')
      .select('*')
      .eq('id', myTokenId)
      .single();
    if (isMounted && myLatest) setMyToken(myLatest);
  };

  fetchCurrentToken();
  fetchMyToken();

  const channel = client
    .channel(`customer-token:${tenantId}:${myTokenId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'star_veg_hospital_appointments',
        filter: `tenant_id=eq.${tenantId}`,
      },
      (payload) => {
        const newRow = payload.new as any;
        const oldRow = payload.old as any;

        const changedId = newRow?.id ?? oldRow?.id;
        if (changedId === myTokenId) {
          if (newRow) setMyToken(newRow);
          else fetchMyToken();
        }

        const becameResolved =
          newRow &&
          newRow.status === 'resolved' &&
          newRow.booking_date === today;
        const stoppedResolved =
          oldRow &&
          oldRow.status === 'resolved' &&
          oldRow.booking_date === today;

        if (becameResolved || stoppedResolved) {
          fetchCurrentToken();
        }
      },
    )
    .subscribe();

  fallbackTimer = window.setInterval(() => {
    if (!document.hidden) {
      fetchCurrentToken();
      fetchMyToken();
    }
  }, TOKEN_FALLBACK_POLL_MS);

  return () => {
    isMounted = false;
    if (fallbackTimer !== null) window.clearInterval(fallbackTimer);
    client.removeChannel(channel);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [bookingStep, tenant?.id, myToken?.id]);

  // ── Derived data ────────────────────────────────────────
  const filteredDoctors = useMemo(() => {
    if (!selectedService) return [];
    return doctors.filter(
      (d) =>
        d.category &&
        d.category.toLowerCase() === selectedService.category.toLowerCase(),
    );
  }, [doctors, selectedService]);

  const todayStr = DAYS[new Date().getDay()];

  const activeServices = useMemo(() => {
    return services.filter((s) => {
      if (!s.daily_limits) return false;
      if (s.category && removedCategories.has(s.category)) return false;
      const limit =
        s.daily_limits[todayStr] ??
        s.daily_limits[todayStr.charAt(0).toUpperCase() + todayStr.slice(1)] ??
        0;
      return Number(limit) > 0;
    });
  }, [services, removedCategories, todayStr]);

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(activeServices.map((s) => s.category)))
      .filter((c) => !removedCategories.has(c))
      .sort();
  }, [activeServices, removedCategories]);

  // ── Handlers ────────────────────────────────────────────
  const openDetails = (service: any) => {
    setViewingService(service);
    setIsDetailOpen(true);
  };

  const handleStartBooking = () => {
    setSelectedService(viewingService);
    setIsDetailOpen(false);
    setBookingStep('form');
    setError('');
    setFormData((prev) => ({ ...prev, doctor: '' }));
  };

  const handleBook = () => {
    if (!formData.name || !formData.phone) {
      setError('Name and Phone number are required.');
      return;
    }
    setError('');
    setBookingStep('payment');
  };

  // src/apps/HospitalCustomerApp.tsx — handlePay()

const handlePay = async () => {
  if (!tenant || !selectedService || !supabase) return;
  setIsProcessing(true);
  setError('');

  const client = supabase;        // ← non-null narrow for TS
  const ageYears =
    formData.age !== '' ? Number(formData.age) || null : null;

  try {
    const tokenNo = await supabaseService.getNextHospitalToken(tenant.slug);
    const today = new Date().toISOString().split('T')[0];

    const { data, error: insertErr } = await client
      .from('star_veg_hospital_appointments')
      .insert({
        tenant_id: tenant.id,
        service_id: selectedService.id,
        category: selectedService.category,
        token_no: tokenNo,
        patient_name: formData.name,
        phone: formData.phone,
        address: formData.address,
        doctor_name: formData.doctor,
        age: ageYears,
        gender: formData.gender || null,
        payment_status: 'pending',
        status: 'new',
        booking_date: today,
        price: selectedService.price,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    await supabaseService.upsertHospitalPatientByPhone(tenant.slug, {
      name: formData.name,
      phone: formData.phone,
      address: formData.address,
      age_years: ageYears,
      age_months: null,
      gender: formData.gender || null,
    });

    sessionStorage.setItem(ACTIVE_TOKEN_KEY, data.id);
    setMyToken(data);
    setBookingStep('waiting');
  } catch (err) {
    console.error(err);
    setError('Failed to book appointment. Please try again.');
    setBookingStep('form');
  } finally {
    setIsProcessing(false);
  }
};

  const handleCloseSuccess = () => {
    sessionStorage.removeItem(ACTIVE_TOKEN_KEY);
    setBookingStep('form');
    setMyToken(null);
    setSelectedService(null);
    setFormData({
      name: '',
      phone: '',
      address: '',
      doctor: '',
      age: '',
      gender: '',
    });
    setCurrentToken(0);
  };

  const handleDownloadToken = () => {
    if (!myToken) return;
    const text = `Token No: ${myToken.token_no}\nPatient: ${myToken.patient_name}\nDate: ${new Date().toLocaleString()}\nDoctor: ${myToken.doctor_name || 'N/A'}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Token-${myToken.token_no}.txt`;
    a.click();
  };

  // Manual refresh button for the waiting screen (no cost except
  // when the customer actually asks).
  const handleManualRefresh = async () => {
  if (!tenant || !myToken || !supabase) return;
  const client = supabase;         // ← non-null narrow
  const today = new Date().toISOString().split('T')[0];

  const { data: resolved } = await client
    .from('star_veg_hospital_appointments')
    .select('token_no')
    .eq('tenant_id', tenant.id)
    .eq('booking_date', today)
    .eq('status', 'resolved')
    .order('token_no', { ascending: false })
    .limit(1);
  if (resolved && resolved.length > 0) {
    setCurrentToken(resolved[0].token_no);
  }

  const { data: myLatest } = await client
    .from('star_veg_hospital_appointments')
    .select('*')
    .eq('id', myToken.id)
    .single();
  if (myLatest) setMyToken(myLatest);
};

  // ================================================================
  // RENDER: live token screen
  // ================================================================
  if (bookingStep === 'waiting' && myToken) {
    if (myToken.status === 'resolved') {
      return (
        <div className={`${pageLocal.waitingScreen} ${pageLocal.successBg}`}>
          <div className={pageLocal.emoji}>✅</div>
          <h1 className={pageLocal.statusHeading}>Appointment Successful!</h1>
          <p className={pageLocal.statusSubtext}>
            Thank you for visiting {tenant?.displayName}.
          </p>
          <Button onClick={handleCloseSuccess} className={pageLocal.primaryCta}>
            Close &amp; Book Another
          </Button>
        </div>
      );
    }

    if (myToken.status === 'failed') {
      return (
        <div className={`${pageLocal.waitingScreen} ${pageLocal.failedBg}`}>
          <div className={pageLocal.emoji}>❌</div>
          <h1
            className={`${pageLocal.statusHeading} ${pageLocal.statusFailed}`}
          >
            Booking Failed
          </h1>
          <p className={pageLocal.statusSubtext}>
            The staff could not verify your payment. Please contact the counter.
          </p>
          <Button onClick={handleCloseSuccess} className={pageLocal.primaryCta}>
            Close
          </Button>
        </div>
      );
    }

    const isMyTurn = currentToken === myToken.token_no;
const peopleAhead = Math.max(0, myToken.token_no - currentToken);
const isClose = peopleAhead > 0 && peopleAhead <= 3;
const expectedTime = new Date(
  Date.now() + peopleAhead * 60_000,
).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// One-line status replaces the two separate banners.
const statusText = isMyTurn
  ? "It's your turn — please proceed to the doctor."
  : isClose
    ? `Almost there — ${peopleAhead} ${peopleAhead === 1 ? 'person' : 'people'} ahead.`
    : peopleAhead > 0
      ? `~${peopleAhead} min wait - ${peopleAhead} ${peopleAhead === 1 ? 'person' : 'people'} ahead`
      : 'Waiting for staff to call your token.';

const statusTone = isMyTurn ? 'success' : isClose ? 'warning' : 'neutral';

return (
  <div className={pageLocal.waitingScreen}>
    <div className={pageLocal.tokenHeader}>
      <Badge tone="info" size="md">
        Token #{myToken.token_no}
      </Badge>
    </div>

    <div className={pageLocal.nowServingCard}>
      <p className={pageLocal.nowServingLabel}>Now Serving</p>
      <div className={pageLocal.nowServingNumber}>
        {currentToken ? currentToken : '—'}
      </div>
      <p
        className={[
          pageLocal.statusLine,
          statusTone === 'success' ? pageLocal.statusLineSuccess : '',
          statusTone === 'warning' ? pageLocal.statusLineWarning : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {statusText}
      </p>
    </div>

    <Card className={pageLocal.appointmentCard}>
      <h3 className={pageLocal.appointmentTitle}>Your Appointment</h3>

      <div className={pageLocal.row}>
        <span className={pageLocal.rowKey}>Patient</span>
        <strong>{myToken.patient_name}</strong>
      </div>

      {myToken.doctor_name && (
        <div className={pageLocal.row}>
          <span className={pageLocal.rowKey}>Doctor</span>
          <strong>{myToken.doctor_name}</strong>
        </div>
      )}

      <div className={pageLocal.row}>
        <span className={pageLocal.rowKey}>Expected</span>
        <strong className={pageLocal.rowValue}>
          {isMyTurn ? 'Now' : expectedTime}
        </strong>
      </div>

      <div className={pageLocal.row}>
        <span className={pageLocal.rowKey}>Payment</span>
        <Badge
          tone={
            myToken.payment_status === 'confirmed'
              ? 'success'
              : myToken.payment_status === 'rejected'
                ? 'danger'
                : 'warning'
          }
        >
          {(myToken.payment_status || 'pending').toUpperCase()}
        </Badge>
      </div>
    </Card>

    <div className={pageLocal.waitingActions}>
      <Button
        variant="ghost"
        className={pageLocal.refreshBtn}
        onClick={handleManualRefresh}
      >
        Refresh
      </Button>
      <Button
        variant="secondary"
        className={pageLocal.downloadBtn}
        leftIcon={<DownloadIcon width={16} height={16} fill="#0f172a" />}
        onClick={handleDownloadToken}
      >
        Download slip
      </Button>
    </div>
  </div>
);
  }

  // ================================================================
  // Shared detail body / footer
  // ================================================================
  const detailBody = viewingService && (
    <div className={detailLocal.content}>
      <div className={detailLocal.imageWrapper}>
        <img
          className={pageLocal.detailImage}
          src={
            viewingService.image ||
            'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=80'
          }
          alt={viewingService.name}
        />
      </div>

      <div className={pageLocal.detailBody}>
        <h2 className={pageLocal.detailTitle}>{viewingService.name}</h2>
        <div className={pageLocal.detailPrice}>
          {formatRupees(viewingService.price)}
        </div>

        {viewingService.description && (
          <p className={detailLocal.description}>
            {viewingService.description}
          </p>
        )}

        <div className={detailLocal.tags}>
          <Chip as="span" tone="primary" shape="rounded">
            {viewingService.category}
          </Chip>
        </div>
      </div>
    </div>
  );

  const detailFooter = (
    <div className={detailLocal.btnWrap}>
      <Button
        variant="ghost"
        onClick={() => setIsDetailOpen(false)}
        leftIcon={<CloseIcon width={16} height={16} fill="currentColor" />}
      >
        Close
      </Button>
      <Button onClick={handleStartBooking}>Book Now</Button>
    </div>
  );

  // ================================================================
  // RENDER: home / catalog
  // ================================================================
  return (
    <div className={pageLocal.pageWrap}>
      <header className={pageLocal.header}>
        <h1 className={pageLocal.pageTitle}>Book Appointment</h1>
        <p className={pageLocal.pageSubtitle}>
          Select a problem to consult a doctor at {tenant?.displayName}.
        </p>
      </header>

      {isLoading ? (
        <div className={pageLocal.loaderWrap}>
          <Spinner size="md" />
        </div>
      ) : activeServices.length === 0 ? (
        <EmptyState
          title="No services available today"
          description="No services are available for booking today. Please check back tomorrow."
        />
      ) : (
        uniqueCategories.map((cat) => {
          const catServices = activeServices.filter((s) => s.category === cat);
          if (catServices.length === 0) return null;

          return (
            <section key={cat} className={pageLocal.categorySection}>
              <h3 className={pageLocal.categoryHeading}>{cat}</h3>

              <div className={menuLocal.menuGrid}>
                {catServices.map((s) => (
                  <div key={s.id} className={menuLocal.itemCard}>
                    <div
                      className={menuLocal.imageWrapper}
                      onClick={() => openDetails(s)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openDetails(s);
                        }
                      }}
                    >
                      <div className={menuLocal.itemImg}>
                        <img
                          src={
                            s.image ||
                            'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=80'
                          }
                          alt={s.name}
                          loading="lazy"
                        />
                      </div>
                    </div>

                    <div
                      className={menuLocal.itemInfo}
                      onClick={() => openDetails(s)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openDetails(s);
                        }
                      }}
                    >
                      <div className={menuLocal.itemNameWrap}>
                        <div className={menuLocal.itemName}>{s.name}</div>
                      </div>
                      <p className={menuLocal.itemDesc}>
                        {s.description || 'Consultation with a doctor.'}
                      </p>
                    </div>

                    <div className={menuLocal.itemFooter}>
                      <span className={menuLocal.price}>
                        <span>{formatRupees(s.price)}</span>
                      </span>
                      <div className={menuLocal.actions}>
                        <button
                          type="button"
                          className={menuLocal.btnCustomize}
                          onClick={() => openDetails(s)}
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })
      )}

      {/* ───── Detail modal ───── */}
      {isMobile ? (
        <Sheet
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={viewingService?.name}
          mobileFullScreen
          maxHeightVh={85}
          footer={detailFooter}
        >
          {detailBody}
        </Sheet>
      ) : (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          mobileFullScreen
          title={viewingService?.name}
          size="lg"
          footer={detailFooter}
        >
          {detailBody}
        </Modal>
      )}

      {/* ───── Booking modal ───── */}
      <Modal
        isOpen={!!selectedService}
        onClose={() => {
          if (!isProcessing) setSelectedService(null);
        }}
        title={`Book: ${selectedService?.name}`}
        disableBackdropClose
        footer={
          bookingStep === 'form' ? (
            <Button block onClick={handleBook}>
              Proceed to Pay {formatRupees(selectedService?.price || 0)}
            </Button>
          ) : (
            <Button
              block
              variant="success"
              onClick={handlePay}
              loading={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Pay Now & Confirm'}
            </Button>
          )
        }
      >
        {error && (
          <Banner variant="error" onDismiss={() => setError('')}>
            {error}
          </Banner>
        )}

        {bookingStep === 'form' ? (
          <div className={pageLocal.formStack}>
            <FormField label="Patient Name *">
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </FormField>

            <FormField label="Mobile Number *">
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </FormField>

            <div className={pageLocal.twoCol}>
              <FormField label="Age">
                <Input
                  type="number"
                  min="0"
                  max="120"
                  value={formData.age}
                  onChange={(e) =>
                    setFormData({ ...formData, age: e.target.value })
                  }
                  placeholder="e.g. 32"
                />
              </FormField>

              <FormField label="Gender">
                <Select
                  value={formData.gender}
                  onChange={(e) =>
                    setFormData({ ...formData, gender: e.target.value })
                  }
                  options={GENDER_OPTIONS}
                />
              </FormField>
            </div>

            <FormField label="Address">
              <Input
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </FormField>

            <FormField
              label="Doctor Name (Optional)"
              hint={
                filteredDoctors.length === 0
                  ? `No doctors available in ${selectedService?.category}. Leave blank or type a name.`
                  : undefined
              }
            >
              <Input
                value={formData.doctor}
                onChange={(e) =>
                  setFormData({ ...formData, doctor: e.target.value })
                }
                list="customer-doctor-list"
                placeholder={
                  filteredDoctors.length > 0
                    ? 'Select or type doctor name...'
                    : 'No doctors available for this category'
                }
              />
              <datalist id="customer-doctor-list">
                {filteredDoctors.map((d) => (
                  <option key={d.id} value={d.name} />
                ))}
              </datalist>
            </FormField>
          </div>
        ) : (
          <div className={pageLocal.paymentSummary}>
            <h2 className={pageLocal.paymentAmount}>
              {formatRupees(selectedService?.price || 0)}
            </h2>
            <p className={pageLocal.paymentHint}>
              Click "Pay Now" to confirm your appointment.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}