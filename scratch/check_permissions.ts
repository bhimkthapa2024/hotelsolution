import { db } from '../src/lib/firebase-admin';

async function check() {
  try {
    const doc = await db.collection('permissions').get();
    console.log(JSON.stringify(doc.docs.map(d => ({id: d.id, ...d.data()})), null, 2));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

check();
