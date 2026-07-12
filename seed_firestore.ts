import { seedAuthSystem } from './src/actions/auth';
import { seedStandardAccounts } from './src/actions/hotel';

async function main() {
  console.log('Seeding Firestore Database...');
  
  try {
    await seedAuthSystem();
    console.log('✅ Auth System Seeded');
  } catch (e) {
    console.log('Auth Seed Error:', e);
  }

  try {
    await seedStandardAccounts();
    console.log('✅ Standard Accounts Seeded');
  } catch (e) {
    console.log('Accounts Seed Error:', e);
  }
  
  console.log('Done!');
  process.exit(0);
}

main();
