// config/credentials.ts
export interface AdminCredentials {
  phone: string;
  name: string;
  password: string;
  role: 'admin' | 'user';
  isActive: boolean;
}

// Default admin credentials - Update these as needed
export const DEFAULT_ADMIN: AdminCredentials = {
  phone: '8004608951', // 👈 Change this to your phone number
  name: 'Anmol',
  password: '#Anmol080$Sweet080', // 👈 Change this to your password
  role: 'admin',
  isActive: true,
};

// Additional seed users (optional)
export const SEED_USERS: AdminCredentials[] = [
  // Add more users here if needed
  {
    phone: '7459999998',
    name: 'Star Vegetables',
    password: 'dPtXQXZq',
    role: 'user',
    isActive: true,
  },
];

export const ShopInfo = {
  // Hardcoded because Blogger doesn't support import.meta.env
  Restaurant_message: '7459999998',
  Shop_name: 'Star Vegetables Online',
  Shop_tagline: 'Green . Fresh . Healthy',
  Delivery_fee: 20,
  Discount_percentage: 100
};