import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function listAllAccounts() {
  const { db } = await import('../src/lib/firebase-admin');
  try {
    const snap = await db.collection('accounts').get();
    const names = snap.docs.map(doc => doc.data().name);
    console.log(JSON.stringify(names, null, 2));
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

listAllAccounts();
