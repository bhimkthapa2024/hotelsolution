import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && privateKey && clientEmail) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log("EXEC_AUTH_SEED: FIREBASE_ADMIN_INITIALIZED");
    } else {
      console.error("CRITICAL_ERROR: MISSING_FIREBASE_CREDENTIALS_IN_ENV");
      process.exit(1);
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error);
    process.exit(1);
  }
}

const auth = admin.auth();
const db = admin.firestore();

async function main() {
  const adminEmail = 'admin@property.com';
  const adminPassword = 'PASSWORD123';
  const adminUid = 'USR-ADMIN';

  console.log(`EXEC_AUTH_SEED: SYNCING IDENTITY [${adminEmail}]...`);

  try {
    // 1. Sync Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(adminEmail);
      console.log("- IDENTITY_FOUND: UPDATING_PASSWORD...");
      await auth.updateUser(userRecord.uid, {
        password: adminPassword,
        displayName: 'SYSTEM ADMINISTRATOR'
      });
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.log("- IDENTITY_NOT_FOUND: CREATING_NEW_USER...");
        userRecord = await auth.createUser({
          uid: adminUid,
          email: adminEmail,
          password: adminPassword,
          displayName: 'SYSTEM ADMINISTRATOR',
        });
      } else {
        throw error;
      }
    }

    // 2. Sync Firestore Meta-data
    console.log("- SYNCING_FIRESTORE_META...");
    await db.collection('users').doc(userRecord.uid).set({
      id: userRecord.uid,
      email: adminEmail,
      fullName: 'SYSTEM ADMINISTRATOR',
      username: 'ADMIN',
      roles: ['R-ADMIN'],
      permissions: ['admin.root', 'setup.manage'],
      isActive: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // 3. Ensure Roles Exist
    console.log("- ENSURING_ROLES_EXIST...");
    await db.collection('roles').doc('R-ADMIN').set({
      id: 'R-ADMIN',
      name: 'ADMINISTRATOR',
      description: 'FULL SYSTEM OVERRIDE ACCESS',
      permissions: ['admin.root', 'setup.manage', 'users.manage', 'dashboard.view']
    }, { merge: true });

    console.log("EXEC_AUTH_SEED: PROTOCOL_COMPLETE");
    console.log("-----------------------------------");
    console.log(`IDENTITY: ${adminEmail}`);
    console.log(`PASSWORD: ${adminPassword}`);
    console.log("-----------------------------------");
    
  } catch (error) {
    console.error("EXEC_AUTH_SEED: FAILED", error);
  } finally {
    process.exit(0);
  }
}

main();
