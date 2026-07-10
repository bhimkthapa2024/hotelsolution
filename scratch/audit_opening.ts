import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

async function auditOpening() {
  const entriesSnap = await db.collection('ledger_entries')
    .where('description', '==', 'Opening Balance Migration')
    .get();
  
  const entries = entriesSnap.docs.map(d => d.data());
  let sumDebit = 0;
  let sumCredit = 0;

  entries.forEach(e => {
    sumDebit += (e.debit || 0);
    sumCredit += (e.credit || 0);
    console.log(`- ${e.id}: Account ${e.accountName}, Debit: ${e.debit}, Credit: ${e.credit}`);
  });

  console.log(`TOTAL OPENING DEBIT:  ${sumDebit}`);
  console.log(`TOTAL OPENING CREDIT: ${sumCredit}`);
  console.log(`MISMATCH:             ${sumDebit - sumCredit}`);
}

auditOpening();
