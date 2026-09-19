// pages/Signup/Steps/DetailsStep.tsx
import React, { useEffect, useState } from 'react';
import { CloseIcon } from '../../../../../assets/svgs';
import styles from '../Signup.module.scss';

export interface SignupDetails {
  storeName: string;
  slug: string;
  ownerName: string;
  ownerPhone: string;
  ownerPassword: string;
  confirmPassword: string;
}

interface DetailsStepProps {
  initial: SignupDetails;
  onContinue: (details: SignupDetails) => void;
  onBack?: () => void;
}

const generatePassword = (length = 10): string => {
  const chars =
    'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
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
}) => {
  const [form, setForm] = useState<SignupDetails>(initial);
  const [slugTouched, setSlugTouched] = useState(initial.slug.length > 0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!slugTouched) {
      setForm((f) => ({ ...f, slug: slugify(f.storeName) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.storeName]);

  const update = <K extends keyof SignupDetails>(
    key: K,
    value: SignupDetails[K],
  ) => {
    setForm((f) => ({ ...f, [key]: value }));
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
    if (validate()) onContinue(form);
  };

  return (
    <div className={styles.stepWrap}>
      <div className={styles.stepHeader}>
        <h2>Create your store</h2>
        <p>Let's start with the basics.</p>
      </div>

      <div className={styles.grid2}>
        <div className={styles.field}>
          <label>Store Name *</label>
          <input
            type="text"
            value={form.storeName}
            onChange={(e) => update('storeName', e.target.value)}
            placeholder="e.g., Soma Electric"
          />
          {errors.storeName && (
            <span className={styles.fieldError}>{errors.storeName}</span>
          )}
        </div>

        <div className={styles.field}>
          <label>URL Slug *</label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true);
              update('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
            }}
            placeholder="e.g., soma-electric"
          />
          {errors.slug && (
            <span className={styles.fieldError}>{errors.slug}</span>
          )}
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.field}>
          <label>Owner Name *</label>
          <input
            type="text"
            value={form.ownerName}
            onChange={(e) => update('ownerName', e.target.value)}
            placeholder="e.g., Soma Das"
          />
          {errors.ownerName && (
            <span className={styles.fieldError}>{errors.ownerName}</span>
          )}
        </div>

        <div className={styles.field}>
          <label>Phone Number *</label>
          <input
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
          />
          {errors.ownerPhone && (
            <span className={styles.fieldError}>{errors.ownerPhone}</span>
          )}
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.field}>
          <label>Password *</label>
          <div className={styles.passwordRow}>
            <input
              type="text"
              value={form.ownerPassword}
              onChange={(e) => update('ownerPassword', e.target.value)}
              placeholder="Min 6 characters"
            />
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => {
                const pw = generatePassword(10);
                update('ownerPassword', pw);
                update('confirmPassword', pw);
              }}
              title="Generate password"
            >
              🎲
            </button>
          </div>
          {errors.ownerPassword && (
            <span className={styles.fieldError}>{errors.ownerPassword}</span>
          )}
        </div>

        <div className={styles.field}>
          <label>Confirm Password *</label>
          <input
            type="text"
            value={form.confirmPassword}
            onChange={(e) => update('confirmPassword', e.target.value)}
            placeholder="Repeat password"
          />
          {errors.confirmPassword && (
            <span className={styles.fieldError}>{errors.confirmPassword}</span>
          )}
        </div>
      </div>

      <div className={styles.stepActions}>
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={handleContinue}
        >
          Continue RightArrowHoga
        </button>
      </div>
    </div>
  );
};

export default DetailsStep;