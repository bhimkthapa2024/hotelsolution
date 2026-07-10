import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function promoteMiley() {
  const { db } = await import('../src/lib/firebase-admin');
  try {
    const snapshot = await db.collection('users').where('username', '==', 'MILEY').get();
    if (snapshot.empty) {
      console.log('User MILEY not found.');
    } else {
      const userDoc = snapshot.docs[0];
      await userDoc.ref.update({
        permissions: [
          "ledger.view",
          "sales.post",
          "sales.entry.post",
          "purchase.post",
          "setup.manage",
          "admin.root"
        ],
        roles: ["R-ADMIN"]
      });
      console.log('✅ MILEY promoted to ADMINISTRATOR.');
    }
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

promoteMiley();
