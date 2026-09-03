// utils/debug.ts
import { DEFAULT_ADMIN } from '../config/credentials';

export const showCredentials = () => {
  console.log('📱 Admin Credentials:');
  console.log(`   Phone: ${DEFAULT_ADMIN.phone}`);
  console.log(`   Password: ${DEFAULT_ADMIN.password}`);
  console.log(`   Name: ${DEFAULT_ADMIN.name}`);
  console.log(`   Role: ${DEFAULT_ADMIN.role}`);
  console.log('\n💡 You can change these in config/credentials.ts');
};

// Call this in development
if (import.meta.env.DEV) {
  showCredentials();
}