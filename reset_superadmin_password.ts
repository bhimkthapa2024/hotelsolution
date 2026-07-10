/**
 * reset_superadmin_password.ts
 * Sets a known temporary password for the super admin so they can log in.
 * Run: npx tsx reset_superadmin_password.ts
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import * as admin from 'firebase-admin';

const SUPER_ADMIN_UID  = 'Qy3KnstPwyUaQkWTSDa5dWDXMUN2';
const TEMP_PASSWORD    = 'Admin@12345';   // ← change after first login!

if (!admin.apps.length) {
  const projectId   = process.env.FIREBASE_PROJECT_ID!;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n');
  admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
}

async function run() {
  await admin.auth().updateUser(SUPER_ADMIN_UID, {
    password: TEMP_PASSWORD,
    emailVerified: true,
  });
  console.log('✅ Password reset successfully!');
  console.log(`   Email   : bkumarthapa.icon@gmail.com`);
  console.log(`   Password: ${TEMP_PASSWORD}`);
  console.log('\n⚠️  Change this password after logging in!');
}

run().catch(e => { console.error(e); process.exit(1); });
