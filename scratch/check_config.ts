import { db } from '../src/lib/firebase-admin';

async function check() {
  try {
    const doc = await db.collection('config').doc('main').get();
    console.log(JSON.stringify(doc.data(), null, 2));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

check();
