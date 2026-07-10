import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkMiley() {
  const { db } = await import('../src/lib/firebase-admin');
  try {
    const snapshot = await db.collection('users').where('username', '==', 'MILEY').get();
    if (snapshot.empty) {
      console.log('User MILEY not found in Firestore.');
    } else {
      console.log(JSON.stringify(snapshot.docs[0].data(), null, 2));
    }
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

checkMiley();
