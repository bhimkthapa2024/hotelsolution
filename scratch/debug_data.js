import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function debugData() {
  const { db } = await import('../src/lib/firebase-admin');
  try {
    const sSnap = await db.collection('sales').get();
    const eSnap = await db.collection('expenses').get();
    const lSnap = await db.collection('ledger_entries').get();

    console.log(`Sales Count: ${sSnap.size}`);
    console.log(`Expense Count: ${eSnap.size}`);
    console.log(`Ledger Count: ${lSnap.size}`);

    if (sSnap.size > 0) {
      console.log('--- LATEST SALE ---');
      console.log(JSON.stringify(sSnap.docs[0].data(), null, 2));
    }
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

debugData();
