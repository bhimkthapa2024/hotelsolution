import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkCOA() {
  const { db } = await import('../src/lib/firebase-admin');
  try {
    const snap = await db.collection('accounts').limit(5).get();
    if (snap.empty) {
       console.log('No accounts found.');
    } else {
       snap.forEach(doc => console.log(`Account: ${doc.data().name} [${doc.id}]`));
    }
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

checkCOA();
