import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkEntries() {
  const { db } = await import('../src/lib/firebase-admin');
  try {
    const salesSnap = await db.collection('sales').where('guest', '==', 'TEST GUEST').get();
    const expSnap = await db.collection('expenses').where('vendor', '==', 'MAIN SUPPLIER').get();

    console.log('--- NEW SALES ENTRIES ---');
    salesSnap.forEach(doc => console.log(JSON.stringify({id: doc.id, ...doc.data()}, null, 2)));

    console.log('\n--- NEW EXPENSE ENTRIES ---');
    expSnap.forEach(doc => console.log(JSON.stringify({id: doc.id, ...doc.data()}, null, 2)));

  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

checkEntries();
