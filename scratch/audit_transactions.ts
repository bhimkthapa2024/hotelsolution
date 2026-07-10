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

async function auditTransactions() {
  const entriesSnap = await db.collection('ledger_entries').get();
  const entries = entriesSnap.docs.map(d => d.data());
  
  const groups: Record<string, any[]> = {};
  entries.forEach(e => {
    if (!groups[e.refId]) groups[e.refId] = [];
    groups[e.refId].push(e);
  });

  console.log("🔍 TRANSACTION BALANCE AUDIT:");
  console.log("==============================");

  for (const refId in groups) {
    const txEntries = groups[refId];
    const totalDebit = txEntries.reduce((s, e) => s + (e.debit || 0), 0);
    const totalCredit = txEntries.reduce((s, e) => s + (e.credit || 0), 0);
    const diff = totalDebit - totalCredit;

    if (Math.abs(diff) > 0.01) {
      console.log(`❌ IMBALANCED: ${refId}`);
      console.log(`   Debit:  ${totalDebit.toFixed(2)}`);
      console.log(`   Credit: ${totalCredit.toFixed(2)}`);
      console.log(`   Diff:   ${diff.toFixed(2)}`);
      console.log(`   Entries: ${txEntries.length}`);
      txEntries.forEach(e => console.log(`     - [${e.accountId}] ${e.accountName}: D:${e.debit} C:${e.credit}`));
    }
  }
}

auditTransactions();
