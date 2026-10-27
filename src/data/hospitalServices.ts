// src/data/hospitalServices.ts

export interface HospitalServiceSeed {
  name: string;
  category: string;
  price: number;
  image: string; // <-- ADDED
  description: string;
  daily_limits: Record<string, number>;
}

const DEFAULT_LIMITS = {
  mon: 40, tue: 40, wed: 40, thu: 40, fri: 40, sat: 20, sun: 0
};

// Helper for Unsplash URLs
const u = (id: string) => `https://images.unsplash.com/photo-${id}?w=600&q=80&auto=format&fit=crop`;

export const HOSPITAL_SERVICES_SEED: HospitalServiceSeed[] = [
  // ==========================================
  // 1. GENERAL MEDICINE
  // ==========================================
  {
    name: 'Fever & Cold',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'General Medicine',
    price: 500,
    image: u('1584362917165-526a968579e8'), // thermometer
    daily_limits: { ...DEFAULT_LIMITS },
  },
  {
    name: 'Cough & Throat Infection',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'General Medicine',
    price: 500,
    image: u('1584982751601-97dcc096659c'), // doctor checking throat
    daily_limits: { ...DEFAULT_LIMITS, sun: 20 },
  },
  {
    name: 'Stomach Pain & Acidity',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'General Medicine',
    price: 600,
    image: u('1576091160399-112ba8d25d1d'), // stomach
    daily_limits: { ...DEFAULT_LIMITS },
  },
  {
    name: 'Food Poisoning / Diarrhea',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'General Medicine',
    price: 700,
    image: u('1512069772995-ec65ed45afd6'), // medicine/water
    daily_limits: { ...DEFAULT_LIMITS, wed: 0 }, 
  },
  {
    name: 'Body Ache & Fatigue',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'General Medicine',
    price: 500,
    image: u('1579684385127-1ef15d508118'), // doctor
    daily_limits: { ...DEFAULT_LIMITS },
  },
  {
    name: 'Headache & Migraine',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'General Medicine',
    price: 600,
    image: u('1559757148-5c350d0d3c56'), // holding head
    daily_limits: { ...DEFAULT_LIMITS },
  },
  {
    name: 'Allergies & Skin Rash',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'General Medicine',
    price: 550,
    image: u('1551076805-e1869033e561'), // skin
    daily_limits: { ...DEFAULT_LIMITS },
  },
  {
    name: 'Diabetes Consultation',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'General Medicine',
    price: 800,
    image: u('1576091160550-2173dba999ef'), // blood sugar test
    daily_limits: { mon: 15, tue: 15, wed: 15, thu: 15, fri: 15, sat: 10, sun: 0 },
  },

  // ==========================================
  // 2. PEDIATRICS
  // ==========================================
  {
    name: 'Child Fever',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'Pediatrics',
    price: 600,
    image: u('1503919545889-aef636e10ad4'), // baby
    daily_limits: { ...DEFAULT_LIMITS },
  },
  {
    name: 'Vaccination / Immunization',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'Pediatrics',
    price: 400,
    image: u('1612349317150-e413f6a5b16d'), // vaccine
    daily_limits: { ...DEFAULT_LIMITS },
  },
  {
    name: 'Child Nutrition & Growth',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'Pediatrics',
    price: 700,
    image: u('1516627145497-ae6968895b74'), // healthy food
    daily_limits: { ...DEFAULT_LIMITS, sun: 10 },
  },
  {
    name: 'Cough & Cold (Pediatric)',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'Pediatrics',
    price: 500,
    image: u('1519689680058-324335c77eba'), // baby
    daily_limits: { ...DEFAULT_LIMITS },
  },
  {
    name: 'Stomach Infection (Pediatric)',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'Pediatrics',
    price: 550,
    image: u('1526630000-05786bbf385c'), // baby stomach
    daily_limits: { ...DEFAULT_LIMITS },
  },
  {
    name: 'Newborn Care Consultation',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'Pediatrics',
    price: 900,
    image: u('1555252333-9f8e92e65df9'), // newborn
    daily_limits: { ...DEFAULT_LIMITS },
  },

  // ==========================================
  // 3. ORTHOPEDICS
  // ==========================================
  {
    name: 'Fracture / Bone Injury',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'Orthopedics',
    price: 1000,
    image: u('1579684453423-f84349ef60b0'), // x-ray
    daily_limits: { ...DEFAULT_LIMITS, sun: 10 },
  },
  {
    name: 'Knee Pain / Joint Pain',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'Orthopedics',
    price: 800,
    image: u('1559757175-5700dde675bc'), // knee
    daily_limits: { ...DEFAULT_LIMITS },
  },
  {
    name: 'Back Pain & Spine Issues',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'Orthopedics',
    price: 900,
    image: u('1581093458791-9f3c3900df4b'), // back
    daily_limits: { ...DEFAULT_LIMITS },
  },
  {
    name: 'Sports Injury',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'Orthopedics',
    price: 850,
    image: u('1517836357463-d25dfeac3438'), // sports
    daily_limits: { ...DEFAULT_LIMITS },
  },
  {
    name: 'Arthritis Consultation',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'Orthopedics',
    price: 750,
    image: u('1559757148-5c350d0d3c56'), // hands
    daily_limits: { ...DEFAULT_LIMITS },
  },
  {
    name: 'Sprain / Muscle Pull',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'Orthopedics',
    price: 600,
    image: u('1517836357463-d25dfeac3438'), // muscle
    daily_limits: { ...DEFAULT_LIMITS },
  },

  // ==========================================
  // 4. DERMATOLOGY
  // ==========================================
  {
    name: 'Acne & Pimples Treatment',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'Dermatology',
    price: 800,
    image: u('1616394584738-fc6e612e71b9'), // face
    daily_limits: { ...DEFAULT_LIMITS },
  },
  {
    name: 'Hair Fall & Dandruff',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'Dermatology',
    price: 700,
    image: u('1522337360788-8b13dee7a37e'), // hair
    daily_limits: { ...DEFAULT_LIMITS },
  },
  {
    name: 'Skin Allergy & Eczema',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'Dermatology',
    price: 750,
    image: u('1551076805-e1869033e561'), // skin
    daily_limits: { ...DEFAULT_LIMITS },
  },
  {
    name: 'Fungal Infection',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'Dermatology',
    price: 650,
    image: u('1576091160399-112ba8d25d1d'), // skin
    daily_limits: { ...DEFAULT_LIMITS },
  },
  {
    name: 'Psoriasis Consultation',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'Dermatology',
    price: 900,
    image: u('1551076805-e1869033e561'), // skin
    daily_limits: { ...DEFAULT_LIMITS },
  },
  {
    name: 'Pigmentation & Dark Spots',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'Dermatology',
    price: 850,
    image: u('1616394584738-fc6e612e71b9'), // face
    daily_limits: { ...DEFAULT_LIMITS },
  },

  // ==========================================
  // 5. CARDIOLOGY
  // ==========================================
  {
    name: 'Chest Pain Evaluation',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'Cardiology',
    price: 1200,
    image: u('1628348068343-c6a848d2b6dd'), // heart/chest
    daily_limits: { ...DEFAULT_LIMITS, sat: 15, sun: 0 },
  },
  {
    name: 'High Blood Pressure (Hypertension)',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'Cardiology',
    price: 1000,
    image: u('1576091160550-2173dba999ef'), // bp monitor
    daily_limits: { ...DEFAULT_LIMITS, sat: 15, sun: 0 },
  },
  {
    name: 'Heart Palpitations',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'Cardiology',
    price: 1100,
    image: u('1628348068343-c6a848d2b6dd'), // heart
    daily_limits: { ...DEFAULT_LIMITS, sat: 15, sun: 0 },
  },
  {
    name: 'ECG & Heart Checkup',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'Cardiology',
    price: 1500,
    image: u('1579684385127-1ef15d508118'), // ecg
    daily_limits: { ...DEFAULT_LIMITS, sat: 10, sun: 0 },
  },
  {
    name: 'Cholesterol Management',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'Cardiology',
    price: 900,
    image: u('1576091160550-2173dba999ef'), // blood test
    daily_limits: { ...DEFAULT_LIMITS, sat: 10, sun: 0 },
  },
  {
    name: 'Shortness of Breath',
    description: 'Consultation for high temperature, body ache, and common cold symptoms.',
    category: 'Cardiology',
    price: 1000,
    image: u('1584982751601-97dcc096659c'), // breathing
    daily_limits: { ...DEFAULT_LIMITS, sat: 10, sun: 0 },
  },
];