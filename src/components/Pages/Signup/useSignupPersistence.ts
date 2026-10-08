// src/components/Pages/Signup/useSignupPersistence.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { Plan } from '../../../types';
import { SignupDetails } from './Steps/DetailsStep';

export type SignupStage = 'details' | 'plan' | 'building' | 'credentials';

export interface SignupConfirmed {
  months: number;
  expiresAt: string;
  planId: string;
}

export interface SignupPersistedState {
  stage: SignupStage;
  details: SignupDetails;
  selectedPlanId: string | null;
  months: number;
  confirmed: SignupConfirmed | null;
}

const STORAGE_KEY = 'signup:state:v1';

const DEFAULT_DETAILS: SignupDetails = {
  storeName: '',
  slug: '',
  storeCategory: '',
  ownerName: '',
  ownerPhone: '',
  ownerPassword: '',
  confirmPassword: '',
};

export const DEFAULT_SIGNUP_STATE: SignupPersistedState = {
  stage: 'details',
  details: DEFAULT_DETAILS,
  selectedPlanId: null,
  months: 1,
  confirmed: null,
};

const isSignupStage = (v: unknown): v is SignupStage =>
  v === 'details' || v === 'plan' || v === 'building' || v === 'credentials';

const readState = (): SignupPersistedState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SIGNUP_STATE;
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object') return DEFAULT_SIGNUP_STATE;

    const details: SignupDetails = {
      ...DEFAULT_DETAILS,
      ...(parsed.details && typeof parsed.details === 'object'
        ? parsed.details
        : {}),
    };

    const months =
      typeof parsed.months === 'number' && parsed.months > 0
        ? parsed.months
        : 1;

    const confirmed: SignupConfirmed | null =
      parsed.confirmed &&
      typeof parsed.confirmed === 'object' &&
      typeof parsed.confirmed.months === 'number' &&
      typeof parsed.confirmed.expiresAt === 'string' &&
      typeof parsed.confirmed.planId === 'string'
        ? {
            months: parsed.confirmed.months,
            expiresAt: parsed.confirmed.expiresAt,
            planId: parsed.confirmed.planId,
          }
        : null;

    // Guard: 'credentials' without a confirmed payload can't render - fall back
    let stage: SignupStage = isSignupStage(parsed.stage)
      ? parsed.stage
      : 'details';
    if (stage === 'credentials' && !confirmed) stage = 'plan';
    if (stage === 'building' && !confirmed) stage = 'plan';

    return {
      stage,
      details,
      selectedPlanId:
        typeof parsed.selectedPlanId === 'string'
          ? parsed.selectedPlanId
          : null,
      months,
      confirmed,
    };
  } catch {
    return DEFAULT_SIGNUP_STATE;
  }
};

const writeState = (state: SignupPersistedState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private-mode errors */
  }
};

export const clearSignupState = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

/**
 * State container for the signup flow, automatically mirrored to
 * localStorage. Every setter persists synchronously.
 */
export const useSignupPersistence = () => {
  const [state, setState] = useState<SignupPersistedState>(() => readState());

  // Keep a ref so setters can read the latest without stale closures.
  const stateRef = useRef(state);
  stateRef.current = state;

  // Persist on every change.
  useEffect(() => {
    writeState(state);
  }, [state]);

  // Sync across tabs (optional but harmless).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setState(readState());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const patch = useCallback(
    (partial: Partial<SignupPersistedState>) => {
      setState((prev) => ({ ...prev, ...partial }));
    },
    [],
  );

  const patchDetails = useCallback(
    (partial: Partial<SignupDetails>) => {
      setState((prev) => ({
        ...prev,
        details: { ...prev.details, ...partial },
      }));
    },
    [],
  );

  const reset = useCallback(() => {
    clearSignupState();
    setState(DEFAULT_SIGNUP_STATE);
  }, []);

  return { state, patch, patchDetails, reset };
};