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
  phone: '100', // 👈 Change this to your phone number
  name: 'Admin',
  password: '100', // 👈 Change this to your password
  role: 'admin',
  isActive: true,
};

// Additional seed users (optional)
export const SEED_USERS: AdminCredentials[] = [
  // Add more users here if needed
  {
    phone: '123456',
    name: 'Staff User',
    password: '123456',
    role: 'user',
    isActive: true,
  },
];