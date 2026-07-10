import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function findAdmin() {
  const { db } = await import('../src/lib/firebase-admin');
  try {
    const snapshot = await db.collection('users').where('permissions', 'array-contains', 'admin.root').get();
    if (snapshot.empty) {
      console.log('No Admin users found.');
    } else {
      snapshot.forEach(doc => console.log(`Admin found: ${doc.data().username}`));
    }
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

findAdmin();
