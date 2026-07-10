/**
 * seed_superadmin.ts
 * Run once: npx ts-node -e "require('./seed_superadmin.ts')"
 * Or: npx tsx seed_superadmin.ts
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import * as admin from 'firebase-admin';

const SUPER_ADMIN_UID = 'Qy3KnstPwyUaQkWTSDa5dWDXMUN2';

// Initialize Firebase Admin using the individual env vars in .env.local
if (!admin.apps.length) {
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase Admin credentials. Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set in .env.local'
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

const db = admin.firestore();
const auth = admin.auth();

const ALL_PERMISSIONS = [
  'admin.root', 'admin.audit',
  'setup.manage', 'users.manage',
  'dashboard.view',
  'sales.post', 'sales.void',
  'expense.post',
  'reception.checkin', 'reception.checkout',
  'housekeeping.view', 'housekeeping.update', 'housekeeping.audit',
  'reports.view',
  'ledger.view',
];

async function seedSuperAdmin() {
  console.log('🔐 Seeding Super Admin...');
  console.log(`   UID: ${SUPER_ADMIN_UID}`);

  // 1. Fetch Firebase Auth user info
  let authUser: admin.auth.UserRecord;
  try {
    authUser = await auth.getUser(SUPER_ADMIN_UID);
    console.log(`   Email: ${authUser.email}`);
    console.log(`   Display Name: ${authUser.displayName || '(not set)'}`);
  } catch (err: any) {
    console.error('❌ Firebase Auth user not found:', err.message);
    process.exit(1);
  }

  // 2. Ensure R-ADMIN role exists
  await db.collection('roles').doc('R-ADMIN').set({
    id: 'R-ADMIN',
    name: 'ADMINISTRATOR',
    description: 'FULL SYSTEM OVERRIDE ACCESS',
    permissions: ALL_PERMISSIONS,
  }, { merge: true });
  console.log('   ✓ R-ADMIN role ensured');

  // 3. Upsert user document with super admin status
  await db.collection('users').doc(SUPER_ADMIN_UID).set({
    id: SUPER_ADMIN_UID,
    fullName: authUser.displayName || 'Super Admin',
    email: authUser.email || '',
    username: (authUser.email || '').split('@')[0].toUpperCase(),
    status: 'active',
    roles: ['R-ADMIN'],
    permissions: ALL_PERMISSIONS,
    department: 'Management',
    isSuperAdmin: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log('   ✓ Firestore user document set (status: active, roles: [R-ADMIN])');

  // 4. Set Firebase Auth custom claims for server-side permission checks
  await auth.setCustomUserClaims(SUPER_ADMIN_UID, {
    role: 'superadmin',
    permissions: ALL_PERMISSIONS,
  });
  console.log('   ✓ Firebase Auth custom claims set (role: superadmin)');

  // 5. Mark email as verified if not already
  if (!authUser.emailVerified) {
    await auth.updateUser(SUPER_ADMIN_UID, { emailVerified: true });
    console.log('   ✓ Email marked as verified');
  } else {
    console.log('   ✓ Email already verified');
  }

  // 6. Remove from signup_requests if present (they are already approved)
  await db.collection('signup_requests').doc(SUPER_ADMIN_UID).delete().catch(() => null);
  console.log('   ✓ Cleared any pending signup request');

  console.log('\n✅ Super Admin seeded successfully!');
  console.log(`   You can now log in with: ${authUser.email}`);
}

seedSuperAdmin().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
