const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const auth = admin.auth();
const db = admin.firestore();

async function createAdmin() {
  const email = 'admin@vantage.com';
  const password = 'Password123!';
  const uid = 'USR-ADMIN-TASK';

  try {
    await auth.createUser({
      uid,
      email,
      password,
      displayName: 'System Admin'
    }).catch(e => console.log('User might already exist in Auth'));

    await db.collection('users').doc(uid).set({
      username: 'admin',
      fullName: 'SYSTEM_ADMIN',
      email,
      roles: ['R-ADMIN'],
      permissions: ['admin.root'],
      isActive: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log('✅ Admin Created: admin@vantage.com / Password123!');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

createAdmin();
