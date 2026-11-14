// src/data/hospitalParticulars.ts
import type { HospitalParticular } from '../types';

/**
 * Default IPD particulars seeded the first time a hospital tenant
 * opens Hospital Billing. Idempotent: only inserted when the tenant
 * has zero rows in `star_veg_hospital_particulars`.
 */
export const DEFAULT_HOSPITAL_PARTICULARS: Array<
  Omit<HospitalParticular, 'id'>
> = [
  { name: 'Registration Fee',         type: 'one-time', charge: 200  },
  { name: 'Doctor Consultation',      type: 'one-time', charge: 500  },
  { name: 'Room Rent (General)',      type: 'per-day',  charge: 1500 },
  { name: 'Room Rent (Private)',      type: 'per-day',  charge: 3500 },
  { name: 'Nursing Charges',          type: 'per-day',  charge: 800  },
  { name: 'IV Fluids',                type: 'per-day',  charge: 450  },
  { name: 'Dressing Charges',         type: 'one-time', charge: 300  },
  { name: 'Lab Tests',                type: 'one-time', charge: 1200 },
  { name: 'X-Ray / Imaging',          type: 'one-time', charge: 900  },
  { name: 'Attendant Charges',        type: 'per-day',  charge: 500  },
  { name: 'Oxygen Charges',           type: 'per-day',  charge: 600  },
  { name: 'Physiotherapy Session',    type: 'one-time', charge: 700  },
];

export const DEFAULT_IPD_ROWS: Array<Omit<HospitalParticular, "id">> = [
  { name: "Registration Fee",    type: "one-time", charge: 200 },
  { name: "Doctor Consultation", type: "one-time", charge: 500 },
  { name: "Room Rent (General)", type: "per-day",  charge: 1500 },
  { name: "Nursing Charges",     type: "per-day",  charge: 800 },
];