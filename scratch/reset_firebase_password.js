const firebaseAdmin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

if (!firebaseAdmin.apps.length) {
  firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const auth = firebaseAdmin.auth();

async function resetAdmin() {
  const email = 'admin@property.com';
  const password = 'PASSWORD123';
  
  try {
    const user = await auth.getUserByEmail(email);
    console.log(`User found: ${user.uid}. Updating password...`);
    await auth.updateUser(user.uid, { password });
    console.log('Password updated successfully.');
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.log('User not found. Creating new admin user...');
      await auth.createUser({
        uid: 'USR-ADMIN',
        email,
        password,
        displayName: 'SYSTEM ADMINISTRATOR'
      });
      console.log('Admin user created successfully.');
    } else {
      console.error('Error:', err);
    }
  }
}

resetAdmin();
