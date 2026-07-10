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

const mapModeToAccount = (mode: string) => {
  const m = mode.toUpperCase().trim();
  if (m === 'CASH') return 'PETTY CASH ';
  if (m === 'CARD HBL' || m === 'HIMALAYAN BANK' || m === 'HBL') return 'HIMALAYAN BANK LIMITED';
  if (m === 'FONEPAY KSBBL' || m === 'KSBBL') return 'KAMANA SEWA BIKAS BANK LTD';
  if (m === 'BANK' || m === 'CHEQUE' || m === 'E-BANKING') return 'HIMALAYAN BANK LIMITED';
  if (m === 'PAYABLE' || m === 'CITY LEDGER' || m === 'BILL TO COMPANY') return 'Accounts Receivable';
  return mode;
};

async function repair() {
  console.log("🛠️ STARTING LEDGER REPAIR PROTOCOL...");
  
  const entriesSnap = await db.collection('ledger_entries').get();
  const entries = entriesSnap.docs.map(d => d.data());
  
  const groups: Record<string, any[]> = {};
  entries.forEach(e => {
    if (!groups[e.refId]) groups[e.refId] = [];
    groups[e.refId].push(e);
  });

  const accountsSnap = await db.collection('accounts').get();
  const accounts = accountsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

  for (const refId in groups) {
    const txEntries = groups[refId];
    const totalDebit = txEntries.reduce((s, e) => s + (e.debit || 0), 0);
    const totalCredit = txEntries.reduce((s, e) => s + (e.credit || 0), 0);
    const diff = totalDebit - totalCredit;

    if (Math.abs(diff) > 0.01 && refId.startsWith('SAL-')) {
      console.log(`- Repairing Sale: ${refId} (Mismatch: ${diff})`);
      
      const saleDoc = await db.collection('sales').doc(refId).get();
      if (!saleDoc.exists) {
        console.log(`  ⚠️ Sale doc not found! Using 'Petty Cash / House Bank' as fallback.`);
        await postLeg(refId, 'Petty Cash / House Bank', Math.abs(diff), accounts);
        continue;
      }

      const sale = saleDoc.data() as any;
      if (sale.settlements && sale.settlements.length > 0) {
        for (const s of sale.settlements) {
          const accName = s.mode === 'Bill to Company' ? (s.debtorAccountId || 'Accounts Receivable') : mapModeToAccount(s.mode);
          await postLeg(refId, accName, s.amount, accounts, `Settlement Repair: ${s.mode}`);
        }
      } else {
        await postLeg(refId, 'Petty Cash / House Bank', Math.abs(diff), accounts, 'Settlement Repair: CASH');
      }
    }
  }
}

async function postLeg(refId: string, accountName: string, amount: number, accounts: any[], desc = 'Legacy Settlement Repair') {
  let acc = accounts.find(a => a.name === accountName || a.code === accountName || a.id === accountName);
  if (!acc) {
    // Try fuzzy match or fallback
    console.log(`  ❌ Account ${accountName} not found. Attempting fallback...`);
    acc = accounts.find(a => a.name === 'Petty Cash / House Bank');
  }

  if (!acc) {
    console.log(`  💀 CRITICAL: NO FALLBACK ACCOUNT FOUND.`);
    return;
  }

  const entryId = `ENT-REPAIR-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  await db.collection('ledger_entries').doc(entryId).set({
    id: entryId,
    date: '2026-04-26', // Use a consistent repair date
    accountId: acc.id,
    accountName: acc.name,
    description: desc,
    refId,
    debit: amount,
    credit: 0,
    balanceAfter: (acc.balance || 0) + amount, // Note: This balanceAfter might be inaccurate relative to other entries, but balance fields in accounts are already updated or can be synced.
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Sync the account balance field too
  await db.collection('accounts').doc(acc.id).update({
    balance: admin.firestore.FieldValue.increment(amount)
  });

  console.log(`  ✅ Posted Debit to ${acc.name} for ${amount}`);
}

repair().then(() => console.log("DONE"));
