const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "hotel-vantage",
      clientEmail: "firebase-adminsdk-fbsvc@hotel-vantage.iam.gserviceaccount.com",
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

async function diagnose() {
  console.log("🔍 DIAGNOSING LEDGER INTEGRITY...");
  
  const [entriesSnap, accountsSnap] = await Promise.all([
    db.collection('ledger_entries').get(),
    db.collection('accounts').get()
  ]);

  const entries = entriesSnap.docs.map(d => d.data());
  const accounts = accountsSnap.docs.map(d => d.data());
  const accountIds = new Set(accounts.map(a => a.id));

  let orphans = 0;
  let totalDebit = 0;
  let totalCredit = 0;

  entries.forEach(e => {
    totalDebit += (e.debit || 0);
    totalCredit += (e.credit || 0);
    if (!accountIds.has(e.accountId)) {
      console.log(`❌ ORPHANED ENTRY: ${e.id} (Account: ${e.accountId})`);
      orphans++;
    }
  });

  console.log(`-----------------------------------`);
  console.log(`TOTAL ENTRIES: ${entries.length}`);
  console.log(`TOTAL DEBIT:   ${totalDebit}`);
  console.log(`TOTAL CREDIT:  ${totalCredit}`);
  console.log(`DIFFERENCE:    ${totalDebit - totalCredit}`);
  console.log(`ORPHANS:       ${orphans}`);
  console.log(`-----------------------------------`);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    console.log("🚨 ALERT: GLOBAL DEBIT/CREDIT MISMATCH!");
  } else {
    console.log("✅ GLOBAL LEDGER BALANCE OK.");
  }
}

diagnose();
