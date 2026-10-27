// src/components/Pages/Signup/Steps/DetailsStep.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StoreCategory } from '../../../../types';
import {
  STORE_CATEGORIES,
  getCategoryDef,
} from '../../../../data/storeCategories';
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

// Module-level cache so a slug resolved once doesn't hit the server
// again on the same page session.
const slugCache = new Map<string, string>();
const slugCacheTimestamps = new Map<string, number>();
const SLUG_CACHE_TTL_MS = 5 * 60_000;

const readCachedSlug = (slug: string): string | undefined => {
  const at = slugCacheTimestamps.get(slug);
  if (at !== undefined && Date.now() - at > SLUG_CACHE_TTL_MS) {
    slugCache.delete(slug);
    slugCacheTimestamps.delete(slug);
    return undefined;
  }
  return slugCache.get(slug);
};

const writeCachedSlug = (slug: string, resolved: string) => {
  slugCache.set(slug, resolved);
  slugCacheTimestamps.set(slug, Date.now());
};

const DetailsStep: React.FC<DetailsStepProps> = ({
  initial,
  onContinue,
  onFieldChange,
}) => {
  const [form, setForm] = useState<SignupDetails>(initial);
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const [autoSuffixNote, setAutoSuffixNote] = useState<string | null>(null);
  const slugCheckRef = useRef<number | null>(null);
  const skipInitialCheckRef = useRef(true);

  const selectedCategoryDef = getCategoryDef(
    form.storeCategory || undefined,
  );

  useEffect(() => {
    setForm(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  useEffect(() => {
    if (slugTouched) return;
    const next = slugify(form.storeName);
    if (next !== form.slug) {
      setForm((f) => ({ ...f, slug: next }));
      onFieldChange?.({ slug: next });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.storeName, slugTouched]);

  // Slug availability + auto-suffix
  useEffect(() => {
    if (skipInitialCheckRef.current) {
      skipInitialCheckRef.current = false;
      return;
    }

    const slug = form.slug.trim();
    setAutoSuffixNote(null);

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

    // Fast path: module cache
    const cached = readCachedSlug(slug);
    if (cached !== undefined) {
      if (cached !== slug) {
        setForm((f) => ({ ...f, slug: cached }));
        onFieldChange?.({ slug: cached });
        setAutoSuffixNote(
          `"${slug}" was taken - using "${cached}" instead`,
        );
      }
      setSlugStatus('available');
      return;
    }

    setSlugStatus('checking');

    slugCheckRef.current = window.setTimeout(async () => {
      try {
        if (!supabase) {
          setSlugStatus('error');
          return;
        }

        const { data, error } = await supabase.rpc('next_available_slug', {
          base_slug_in: slug,
          max_suffix_in: 20,
        });

        if (error) {
          console.warn('[Signup] slug check failed:', error.message);
          setSlugStatus('error');
          return;
        }

        if (typeof data !== 'string' || !data) {
          // Every candidate up to base-20 is taken.
          setSlugStatus('taken');
          return;
        }

        writeCachedSlug(slug, data);

        if (data !== slug) {
          setForm((f) => ({ ...f, slug: data }));
          onFieldChange?.({ slug: data });
          setAutoSuffixNote(
            `"${slug}" was taken - using "${data}" instead`,
          );
        }
        setSlugStatus('available');
      } catch (err) {
        console.warn('[Signup] slug check threw:', err);
        setSlugStatus('error');
      } finally {
        slugCheckRef.current = null;
      }
    }, 600);

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
              setSlugTouched(true);
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

      {autoSuffixNote && (
        <Banner variant="info" inline>
          {autoSuffixNote}
        </Banner>
      )}

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

          {selectedCategoryDef && (
            <div className={local.categoryBanner}>
              <span className={local.categoryBannerIcon} aria-hidden>
                <img src={selectedCategoryDef.image} alt="" />
              </span>
              <div className={local.categoryBannerText}>
                <strong>{selectedCategoryDef.label}</strong>
                <p>{selectedCategoryDef.description}</p>
              </div>
            </div>
          )}
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