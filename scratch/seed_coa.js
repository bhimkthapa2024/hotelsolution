import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function seedCOA() {
  const { seedStandardAccounts } = await import('../src/actions/hotel');
  try {
    const result = await seedStandardAccounts();
    console.log('✅ Standard Accounts Seeded:', result);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

seedCOA();
