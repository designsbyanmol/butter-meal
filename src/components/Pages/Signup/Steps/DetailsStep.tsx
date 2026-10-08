// components/Pages/Signup/Steps/DetailsStep.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StoreCategory } from '../../../../types';
import { STORE_CATEGORIES } from '../../../../data/storeCategories';
import { FormField, Input, Button, Banner, Select } from '../../../ui';
import { RightArrow } from '../../../../assets/svgs';
import { supabase } from '../../../../services/supabase.client';
import local from '../Signup.module.scss';

export interface SignupDetails {
  storeName: string;
  slug: string;
  storeCategory: StoreCategory | '';
  ownerName: string;
  ownerPhone: string;
  ownerPassword: string;
  confirmPassword: string;
}

interface DetailsStepProps {
  initial: SignupDetails;
  onContinue: (details: SignupDetails) => void;
  /**
   * Fires on every keystroke so the parent can mirror the form
   * into localStorage (survives reload).
   */
  onFieldChange?: (partial: Partial<SignupDetails>) => void;
  onBack?: () => void;
}

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

const generatePassword = (length = 10): string => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
};

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const DetailsStep: React.FC<DetailsStepProps> = ({
  initial,
  onContinue,
  onFieldChange,
}) => {
  const [form, setForm] = useState<SignupDetails>(initial);
  // Starts false on every mount. Only flips to true when the USER
  // physically types in the slug field.
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const slugCheckRef = useRef<number | null>(null);
  const skipInitialCheckRef = useRef(true);

  // Re-hydrate if the parent hands us a different `initial`
  // (e.g. after a reset or a cross-tab storage event).
  // NOTE: do NOT touch slugTouched here.
  useEffect(() => {
    setForm(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  // Auto-generate slug from store name (only while the user hasn't
  // manually touched the slug field).
  useEffect(() => {
    if (slugTouched) return;
    const next = slugify(form.storeName);
    if (next !== form.slug) {
      setForm((f) => ({ ...f, slug: next }));
      onFieldChange?.({ slug: next });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.storeName, slugTouched]);

  // Debounced slug uniqueness check.
  useEffect(() => {
    if (skipInitialCheckRef.current) {
      skipInitialCheckRef.current = false;
      return;
    }

    const slug = form.slug.trim();

    if (slugCheckRef.current !== null) {
      window.clearTimeout(slugCheckRef.current);
      slugCheckRef.current = null;
    }

    if (!slug) {
      setSlugStatus('idle');
      return;
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      setSlugStatus('idle');
      return;
    }

    setSlugStatus('checking');

    slugCheckRef.current = window.setTimeout(async () => {
      try {
        if (!supabase) {
          setSlugStatus('error');
          return;
        }

        const { data, error } = await supabase
          .from('star_veg_tenants')
          .select('slug')
          .eq('slug', slug)
          .maybeSingle();

        if (error) {
          console.warn('[Signup] slug check failed:', error.message);
          setSlugStatus('error');
          return;
        }

        setSlugStatus(data ? 'taken' : 'available');
      } catch (err) {
        console.warn('[Signup] slug check threw:', err);
        setSlugStatus('error');
      } finally {
        slugCheckRef.current = null;
      }
    }, 400);

    return () => {
      if (slugCheckRef.current !== null) {
        window.clearTimeout(slugCheckRef.current);
        slugCheckRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.slug]);

  const update = <K extends keyof SignupDetails>(
    key: K,
    value: SignupDetails[K],
  ) => {
    setForm((f) => ({ ...f, [key]: value }));
    onFieldChange?.({ [key]: value } as Partial<SignupDetails>);
    setErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.storeName.trim()) e.storeName = 'Store name is required';
    if (!form.slug.trim()) e.slug = 'URL slug is required';
    if (!/^[a-z0-9-]+$/.test(form.slug))
      e.slug = 'Only lowercase letters, numbers and hyphens';
    if (!form.storeCategory) e.storeCategory = 'Store type is required';
    if (!form.ownerName.trim()) e.ownerName = 'Owner name is required';
    if (!/^\d{10}$/.test(form.ownerPhone))
      e.ownerPhone = 'Enter a 10-digit phone number';
    if (form.ownerPassword.length < 6)
      e.ownerPassword = 'Password must be at least 6 characters';
    if (form.ownerPassword !== form.confirmPassword)
      e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = () => {
    if (slugStatus === 'taken') return;
    if (validate()) onContinue(form);
  };

  const allFieldsFilled = useMemo(() => {
    return (
      form.storeName.trim() !== '' &&
      form.slug.trim() !== '' &&
      form.storeCategory !== '' &&
      form.ownerName.trim() !== '' &&
      /^\d{10}$/.test(form.ownerPhone) &&
      form.ownerPassword.length >= 6 &&
      form.ownerPassword === form.confirmPassword
    );
  }, [
    form.storeName,
    form.slug,
    form.storeCategory,
    form.ownerName,
    form.ownerPhone,
    form.ownerPassword,
    form.confirmPassword,
  ]);

  const canContinue =
    allFieldsFilled && slugStatus !== 'taken' && slugStatus !== 'checking';

  const slugError =
    slugStatus === 'taken'
      ? 'Domain already present, please change the slug'
      : errors.slug;

  const categoryOptions = useMemo(
    () =>
      STORE_CATEGORIES.map((c) => ({
        value: c.value,
        label: `${c.label} - ${c.hint}`,
      })),
    [],
  );

  return (
    <div className={local.stepWrap}>
      <div className={local.stepHeader}>
        <h2>Create your store</h2>
        <p>Let's start with the basics.</p>
      </div>

      <div className={local.grid2}>
        <FormField label="Store Name" required error={errors.storeName}>
          <Input
            value={form.storeName}
            onChange={(e) => update('storeName', e.target.value)}
            placeholder="e.g., Soma Electric"
            invalid={!!errors.storeName}
          />
        </FormField>

        <FormField
          label="URL Slug"
          required
          error={slugError}
          hint={
            slugStatus === 'checking'
              ? 'Checking availability...'
              : slugStatus === 'available'
              ? 'Yes! This slug is available'
              : 'Your store URL will end with this'
          }
        >
          <Input
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true); // manual edit - stop auto-sync
              update(
                'slug',
                e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
              );
            }}
            placeholder="e.g., soma-electric"
            invalid={!!errors.slug || slugStatus === 'taken'}
          />
        </FormField>
      </div>

      <div className={local.grid2}>
        <FormField
          label="Store Type"
          required
          error={errors.storeCategory}
          hint="This decides the default catalog layout."
        >
          <Select
            value={form.storeCategory}
            onChange={(e) =>
              update('storeCategory', e.target.value as StoreCategory)
            }
            placeholder="- Select your store type -"
            options={categoryOptions}
            invalid={!!errors.storeCategory}
          />
        </FormField>

        <FormField label="Owner Name" required error={errors.ownerName}>
          <Input
            value={form.ownerName}
            onChange={(e) => update('ownerName', e.target.value)}
            placeholder="e.g., Soma Das"
            invalid={!!errors.ownerName}
          />
        </FormField>
      </div>

      <div className={local.grid2}>
        <FormField label="Phone Number" required error={errors.ownerPhone}>
          <Input
            type="tel"
            value={form.ownerPhone}
            onChange={(e) =>
              update(
                'ownerPhone',
                e.target.value.replace(/\D/g, '').slice(0, 10),
              )
            }
            placeholder="10-digit phone"
            maxLength={10}
            invalid={!!errors.ownerPhone}
          />
        </FormField>

        <FormField label="Password" required error={errors.ownerPassword}>
          <div className={local.passwordRow}>
            <Input
              type="text"
              value={form.ownerPassword}
              onChange={(e) => update('ownerPassword', e.target.value)}
              placeholder="Min 6 characters"
              invalid={!!errors.ownerPassword}
            />
            <Button
              variant="ghost"
              onClick={() => {
                const pw = generatePassword(10);
                update('ownerPassword', pw);
                update('confirmPassword', pw);
              }}
              title="Generate password"
              aria-label="Generate password"
            >
              🎲
            </Button>
          </div>
        </FormField>
      </div>

      <FormField
        label="Confirm Password"
        required
        error={errors.confirmPassword}
      >
        <Input
          type="text"
          value={form.confirmPassword}
          onChange={(e) => update('confirmPassword', e.target.value)}
          placeholder="Repeat password"
          invalid={!!errors.confirmPassword}
        />
      </FormField>

      <div className={local.stepActions}>
        <Button
          onClick={handleContinue}
          disabled={!canContinue}
          rightIcon={<RightArrow width={16} height={16} fill="#fff" />}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default DetailsStep;