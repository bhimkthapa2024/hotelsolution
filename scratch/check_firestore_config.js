import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
  const { db } = await import('../src/lib/firebase-admin');
  try {
    const doc = await db.collection('config').doc('main').get();
    console.log(JSON.stringify(doc.data(), null, 2));
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

check();
