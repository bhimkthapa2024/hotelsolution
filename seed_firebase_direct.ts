import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const projectId  = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  const formattedKey = privateKey?.includes('\\n') 
    ? privateKey.replace(/\\n/g, '\n') 
    : privateKey;
    
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: formattedKey,
    }),
  });
}

const db = admin.firestore();

async function seed() {
  console.log('Seeding Firestore...');
  const batch = db.batch();

  // Seed Roles
  const rolesList = [
    { id: 'R-ADMIN', name: 'ADMINISTRATOR', description: 'FULL SYSTEM OVERRIDE ACCESS', permissions: ['admin.root'] },
  ];
  for (const r of rolesList) {
    batch.set(db.collection('roles').doc(r.id), r, { merge: true });
  }

  // Seed user
  const adminUid = 'USR-ADMIN';
  batch.set(db.collection('users').doc(adminUid), {
    id: adminUid,
    username: 'admin',
    email: 'admin@hotel.com',
    isActive: true,
    roles: ['R-ADMIN']
  }, { merge: true });

  // Seed Accounts
  const standard = [
    { code: '1010', name: 'Main Operational Bank', type: 'ASSET', normal: 'Debit', category: 'CASH & EQUIVALENTS' },
    { code: '1200', name: 'Accounts Receivable', type: 'ASSET', normal: 'Debit', category: 'TRADE RECEIVABLES' },
    { code: '1300', name: 'Petty Cash / House Bank', type: 'ASSET', normal: 'Debit', category: 'CASH & EQUIVALENTS' },
    { code: '2100', name: 'VAT Payable (13%)', type: 'LIABILITY', normal: 'Credit', category: 'TAX OBLIGATIONS' },
    { code: '2200', name: 'Service Charge Payable', type: 'LIABILITY', normal: 'Credit', category: 'TAX OBLIGATIONS' },
    { code: '2300', name: 'Accounts Payable', type: 'LIABILITY', normal: 'Credit', category: 'TRADE PAYABLES' },
    { code: '4100', name: 'Accommodation Revenue', type: 'REVENUE', normal: 'Credit', category: 'CORE OPERATING INCOME' },
    { code: '4200', name: 'F&B Sales Revenue', type: 'REVENUE', normal: 'Credit', category: 'OPERATING INCOME' },
  ];
  for (const acc of standard) {
    const id = `ACC-${acc.code}`;
    batch.set(db.collection('accounts').doc(id), { ...acc, id, balance: 0, isActive: true }, { merge: true });
  }

  await batch.commit();
  console.log('Successfully seeded database!');
}

seed().catch(console.error);
