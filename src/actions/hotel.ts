'use server';

import { auth as adminAuth, db as firestore } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { formatCurrency, serialize, getInstitutionalDate, getInstitutionalTimestamp } from '@/lib/utils';
import admin from 'firebase-admin';
import { getUsers, getRoles, getPermissions, getCurrentUser } from './auth';
import { redirect } from 'next/navigation';
import { enforcePermission } from '@/lib/session';

import { cache } from 'react';

async function enforceAuth() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      redirect('/login');
    }
    return currentUser;
  } catch (e) {
    console.log("enforceAuth bypassed for script");
    return { name: 'Admin', role: 'ADMIN' };
  }
}

// --- CONFIG ---
export const getConfig = cache(async () => {
  const doc = await firestore.collection('config').doc('main').get();
  const cfg = doc.data();
  if (!cfg) return null;
  
  return serialize({
    ...cfg,
    taxInclusive: cfg.taxInclusive ?? false,
    applyServiceCharge: cfg.applyServiceCharge ?? true,
    applyVat: cfg.applyVat ?? true,
    vatRate: cfg.vatRate ?? 13,
    serviceChargeRate: cfg.serviceChargeRate ?? 10,
    stayPlans: cfg.stayPlans || [],
    businessDate: cfg.businessDate || '1970-01-01',
  }) as any;
});

export async function getSetupRegistry() {
  // Parallel fetch on server to minimize latency
  const [r, c, a, cats, d, s, u, rs, prs, curr] = await Promise.all([
    getRooms(), 
    getConfig(), 
    getAccounts(), 
    getAccountCategories(),
    getDebtors(),
    getSuppliers(),
    getUsers(),
    getRoles(),
    getPermissions(),
    getCurrentUser()
  ]);
  return { rooms: r, config: c, accounts: a, categories: cats, debtors: d, suppliers: s, users: u, roles: rs, permissions: prs, currentUser: curr };
}

export async function getDashboardRegistry() {
  const [rooms, sales, accounts, config] = await Promise.all([
    getRooms(),
    getSales(),
    getAccounts(),
    getConfig()
  ]);
  return { rooms, sales, accounts, config };
}

export async function updateConfig(data: any) {
  await enforcePermission('setup.manage');
  await firestore.collection('config').doc('main').set(data, { merge: true });
  revalidatePath('/');
  return { success: true };
}

// --- ACCOUNTS ---
export const getAccounts = cache(async () => {
  const snapshot = await firestore.collection('accounts').orderBy('code').get();
  const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
  
  const hasSpa = list.some(a => (a.name || '').toUpperCase().includes('SPA') || a.code === '4300');
  if (!hasSpa) {
    const spaAccount = {
      id: 'ACC-4300',
      code: '4300',
      name: 'SPA SALES',
      type: 'REVENUE',
      normal: 'Credit',
      category: 'OPERATING INCOME',
      balance: 0,
      isActive: true
    };
    try {
      await firestore.collection('accounts').doc(spaAccount.id).set(spaAccount);
      list.push(spaAccount);
    } catch (e) {
      console.error("FAIL_AUTO_SEED_SPA_ACC:", e);
      list.push(spaAccount);
    }
  }
  
  return serialize(list) as any[];
});

export async function getPeriodBalances(from: string, to: string) {
  // Parallel fetch: accounts + all ledger entries up to 'to'
  const [accountsSnapshot, entriesSnapshot] = await Promise.all([
    firestore.collection('accounts').get(),
    firestore.collection('ledger_entries').where('date', '<=', to).get()
  ]);

  const accounts = accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
  const allEntries = entriesSnapshot.docs.map(d => d.data());

  // GROUP entries by accountId once (O(n)) instead of filtering per account (O(n*m))
  const entriesByAccount = new Map<string, any[]>();
  for (const e of allEntries) {
    if (!entriesByAccount.has(e.accountId)) entriesByAccount.set(e.accountId, []);
    entriesByAccount.get(e.accountId)!.push(e);
  }

  const flatBalances = accounts.map(acc => {
    const isPerformance = acc.type === 'REVENUE' || acc.type === 'EXPENSE';
    const relevantEntries = entriesByAccount.get(acc.id) || [];
    const filteredEntries = isPerformance
      ? relevantEntries.filter(e => e.date >= from)
      : relevantEntries;

    let totalDebit = 0, totalCredit = 0;
    for (const e of filteredEntries) {
      totalDebit += e.debit || 0;
      totalCredit += e.credit || 0;
    }

    const balance = acc.normal === 'Debit' ? totalDebit - totalCredit : totalCredit - totalDebit;
    return { ...acc, balance };
  });

  const balanceMap = new Map(flatBalances.map(a => [a.id, a]));
  // Pre-build children index (O(n)) to avoid repeated filter inside recursion (O(n*depth))
  const childrenIndex = new Map<string, any[]>();
  for (const acc of flatBalances) {
    if (acc.parentId) {
      if (!childrenIndex.has(acc.parentId)) childrenIndex.set(acc.parentId, []);
      childrenIndex.get(acc.parentId)!.push(acc);
    }
  }
  const memo = new Map<string, number>();

  const getAggBalance = (id: string): number => {
    if (memo.has(id)) return memo.get(id)!;
    const acc = balanceMap.get(id);
    if (!acc) return 0;
    const children = childrenIndex.get(id) || [];
    const childrenSum = children.reduce((sum, child) => {
      const childBal = getAggBalance(child.id);
      return acc.normal !== child.normal ? sum - childBal : sum + childBal;
    }, 0);
    const total = acc.balance + childrenSum;
    memo.set(id, total);
    return total;
  };

  return serialize(flatBalances.map(acc => ({
    ...acc,
    balance: getAggBalance(acc.id)
  })));
}


export async function getCashFlowReport(from: string, to: string) {
  // 1. Opening Balance: Sum of all CASH entries prior to 'from'
  const entriesBeforeSnapshot = await firestore.collection('ledger_entries')
    .where('date', '<', from)
    .get();
  
  const entriesBefore = entriesBeforeSnapshot.docs.map(d => d.data());
  
  // Get all cash accounts
  const accountsSnapshot = await firestore.collection('accounts').where('category', '==', 'CASH & EQUIVALENTS').get();
  const cashAccountIds = accountsSnapshot.docs.map(doc => doc.id);

  let openingBalance = 0;
  entriesBefore.filter(e => cashAccountIds.includes(e.accountId)).forEach(e => {
    openingBalance += ((e.debit || 0) - (e.credit || 0));
  });

  // 2. Period Transactions
  const entriesPeriodSnapshot = await firestore.collection('ledger_entries')
    .where('date', '>=', from)
    .where('date', '<=', to)
    .get();

  const entriesPeriod = entriesPeriodSnapshot.docs.map(d => d.data());
  const cashEntries = entriesPeriod.filter(e => cashAccountIds.includes(e.accountId));

  const inflow = cashEntries.filter(e => (e.debit || 0) > 0).map(e => ({
    date: e.date,
    ref: e.refId,
    desc: e.description,
    amount: e.debit
  }));

  const outflow = cashEntries.filter(e => (e.credit || 0) > 0).map(e => ({
    date: e.date,
    ref: e.refId,
    desc: e.description,
    amount: e.credit
  }));

  const totalInflow = inflow.reduce((s, i) => s + (i.amount || 0), 0);
  const totalOutflow = outflow.reduce((s, i) => s + (i.amount || 0), 0);
  const netChange = totalInflow - totalOutflow;

  return serialize({
    openingBalance,
    inflow,
    outflow,
    totalInflow,
    totalOutflow,
    netChange,
    closingBalance: openingBalance + netChange
  });
}

export async function upsertAccount(data: any) {
  await enforcePermission('setup.manage');
  const accountId = data.id || `ACC-${Date.now()}`;
  const accountRef = firestore.collection('accounts').doc(accountId);
  const existing = await accountRef.get();

  if (existing.exists) {
    const oldData = existing.data() as any;
    await accountRef.update(data);

    // Cascade type/category changes to children
    if (data.type !== oldData.type || data.category !== oldData.category) {
       const children = await firestore.collection('accounts').where('parentId', '==', accountId).get();
       if (!children.empty) {
          const batch = firestore.batch();
          children.forEach(doc => {
             batch.update(doc.ref, { 
                type: data.type, 
                category: data.category 
             });
          });
          await batch.commit();
       }
    }
  } else {
    await accountRef.set({ 
      ...data, 
      id: accountId,
      isActive: data.isActive ?? true,
      balance: data.balance || 0
    });

    if (data.balance && data.balance !== 0) {
      const config = await getConfig();
      const date = config?.businessDate || new Date().toISOString().split('T')[0];
      await firestore.collection('ledger_entries').doc(`ENT-OPEN-${Date.now()}`).set({
        id: `ENT-OPEN-${Date.now()}`,
        date,
        accountId: accountId,
        accountName: data.name,
        description: 'Opening Balance Migration',
        refId: 'SYSTEM-INIT',
        debit: data.normal === 'Debit' ? data.balance : 0,
        credit: data.normal === 'Credit' ? data.balance : 0,
        balanceAfter: data.balance,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  }
  revalidatePath('/admin');
  revalidatePath('/setup');
  revalidatePath('/ledger');
  return { success: true };
}

export async function deleteAccount(id: string) {
  await enforcePermission('setup.manage');
  const historyCheck = await firestore.collection('ledger_entries')
    .where('accountId', '==', id)
    .limit(1)
    .get();

  if (!historyCheck.empty) {
    return { 
      success: false, 
      error: "ACCOUNT_HAS_IDENTITY: Cannot delete account with historical ledger entries." 
    };
  }

  // Detach children
  const children = await firestore.collection('accounts').where('parentId', '==', id).get();
  const batch = firestore.batch();
  children.forEach(doc => batch.update(doc.ref, { parentId: null }));
  batch.delete(firestore.collection('accounts').doc(id));
  await batch.commit();

  revalidatePath('/setup');
  return { success: true };
}

// --- ROOMS ---
export const getRooms = cache(async () => {
  const snapshot = await firestore.collection('rooms').orderBy('number').get();
  return serialize(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))) as any[];
});

export async function updateRoomStatus(id: string, status: string, note?: string) {
  await enforceAuth();
  await enforcePermission('housekeeping.update');

  const roomRef = firestore.collection('rooms').doc(id);
  const roomDoc = await roomRef.get();
  if (!roomDoc.exists) return { success: false };

  const room = roomDoc.data();
  const config = await getConfig();
  const date = config?.businessDate || new Date().toISOString().split('T')[0];

  await roomRef.update({ status });

  await firestore.collection('housekeeping_logs').add({
    date,
    roomNumber: room?.number,
    prevStatus: room?.status,
    newStatus: status,
    actionedBy: 'ADMINISTRATOR',
    timestamp: getInstitutionalTimestamp(),
    note: note || 'Manual Recalibration',
    timestamp_full: admin.firestore.FieldValue.serverTimestamp()
  });

  revalidatePath('/housekeeping');
  return { success: true };
}

export async function getHousekeepingActivity() {
  const snapshot = await firestore.collection('housekeeping_logs')
    .orderBy('timestamp_full', 'desc')
    .limit(100)
    .get();
  return serialize(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))) as any[];
}

export async function upsertRoom(data: any) {
  await enforcePermission('setup.manage');
  const id = data.id || `R-${Date.now()}`;
  await firestore.collection('rooms').doc(id).set(data, { merge: true });
  revalidatePath('/setup');
  return { success: true };
}

export async function deleteRoom(id: string) {
  await enforcePermission('setup.manage');
  await firestore.collection('rooms').doc(id).delete();
  revalidatePath('/setup');
  return { success: true };
}

// --- SALES ---
export const getSales = cache(async (from?: string, to?: string) => {
  let query = firestore.collection('sales') as admin.firestore.Query;
  
  if (from) query = query.where('date', '>=', from);
  if (to) query = query.where('date', '<=', to);
  
  const snapshot = await query.orderBy('date', 'desc').get();
  return serialize(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))) as any[];
});

export async function getSalesReport(from?: string, to?: string) {
  return getSales(from, to);
}

export async function getUnpaidBillToRoomSales() {
  await enforceAuth();
  // Fetch all Unpaid sales
  const snapshot = await firestore.collection('sales')
    .where('status', '==', 'Unpaid')
    .get();
  
  const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
  
  // Filter to only those with a "Bill to Room" settlement and not voided
  const billToRoom = all.filter(s => 
    s.isVoided !== true && 
    Array.isArray(s.settlements) && 
    s.settlements.some((st: any) => st.mode === 'Bill to Room')
  );

  // Sort by date descending
  billToRoom.sort((a, b) => {
     const dateA = a.date ? new Date(a.date).getTime() : 0;
     const dateB = b.date ? new Date(b.date).getTime() : 0;
     return dateB - dateA;
  });
  
  return serialize(billToRoom) as any[];
}

// --- PURCHASES ---
export const getPurchases = cache(async (from?: string, to?: string) => {
  let query = firestore.collection('expenses') as admin.firestore.Query;
  
  if (from) query = query.where('date', '>=', from);
  if (to) query = query.where('date', '<=', to);
  
  const snapshot = await query.orderBy('date', 'desc').get();
  return serialize(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))) as any[];
});

export async function getPurchaseReport(from?: string, to?: string) {
  return getPurchases(from, to);
}

// Internal helper for financial transactions (Firestore Transaction-Aware)
// --- FINANCIAL POSTING CORE ---
// Helper to pre-fetch account documents safely
async function getAccountRefs(identifiers: string[]) {
  const accountsCol = firestore.collection('accounts');
  const results: Record<string, admin.firestore.DocumentSnapshot> = {};

  // Split into direct-id lookups and name/code lookups
  const directIds = identifiers.filter(id => id.startsWith('ACC-'));
  const indirectIds = identifiers.filter(id => !id.startsWith('ACC-'));

  // Fetch all direct-id accounts in parallel
  const directSnaps = await Promise.all(directIds.map(id => accountsCol.doc(id).get()));
  directSnaps.forEach((snap, i) => { if (snap.exists) results[directIds[i]] = snap; });

  // Fetch code-based lookups in parallel
  if (indirectIds.length > 0) {
    const codeSnaps = await Promise.all(indirectIds.map(id => accountsCol.where('code', '==', id).limit(1).get()));
    const remaining: string[] = [];
    codeSnaps.forEach((snap, i) => {
      if (!snap.empty) results[indirectIds[i]] = snap.docs[0];
      else remaining.push(indirectIds[i]);
    });

    // For remaining: try name lookup in parallel
    if (remaining.length > 0) {
      const nameSnaps = await Promise.all(remaining.map(id => accountsCol.where('name', '==', id).limit(1).get()));
      const stillMissing: string[] = [];
      nameSnaps.forEach((snap, i) => {
        if (!snap.empty) results[remaining[i]] = snap.docs[0];
        else stillMissing.push(remaining[i]);
      });

      // Fallbacks — fetch asset/liability collections once and search locally
      if (stillMissing.length > 0) {
        const [assets, liabilities] = await Promise.all([
          accountsCol.where('type', '==', 'ASSET').get(),
          accountsCol.where('type', '==', 'LIABILITY').get()
        ]);
        const assetDocs = assets.docs;
        const liabilityDocs = liabilities.docs;

        for (const id of stillMissing) {
          if (id === 'Petty Cash / House Bank') {
            const doc = assetDocs.find(d => d.data().name.toUpperCase().includes('CASH'));
            if (doc) results[id] = doc;
          } else if (id === 'Main Operational Bank') {
            const doc = assetDocs.find(d => d.data().name.toUpperCase().includes('BANK'));
            if (doc) results[id] = doc;
          } else if (id === 'Service Charge Payable') {
            const doc = liabilityDocs.find(d => {
              const n = d.data().name.toUpperCase();
              return n.includes('SERVICE CHARGE') || n.includes('SC PAYABLE');
            });
            if (doc) results[id] = doc;
          } else if (id === 'VAT Payable (13%)') {
            const doc = liabilityDocs.find(d => {
              const n = d.data().name.toUpperCase();
              return n.includes('VAT') || n.includes('TAX');
            });
            if (doc) results[id] = doc;
          } else if (id === 'Accounts Receivable') {
            const doc = assetDocs.find(d => {
              const n = d.data().name.toUpperCase();
              return n.includes('RECEIVABLE') || n.includes('SUNDRY DEBTOR');
            });
            if (doc) results[id] = doc;
          }
        }
      }
    }
  }

  return results;
}


const mapModeToAccount = (mode: string, config?: any) => {
  if (config && config.paymentModes) {
     const mapped = config.paymentModes.find((pm: any) => pm.label.toUpperCase() === mode.toUpperCase().trim());
     if (mapped && mapped.accountId) return mapped.accountId;
  }
  const m = mode.toUpperCase().trim();
  if (m === 'CASH') return 'Petty Cash / House Bank';
  if (m === 'CARD HBL' || m === 'HIMALAYAN BANK' || m === 'HBL' || m === 'FONEPAY KSBBL' || m === 'KSBBL' || m === 'BANK' || m === 'CHEQUE' || m === 'E-BANKING') {
    return 'Main Operational Bank';
  }
  if (m === 'PAYABLE' || m === 'CITY LEDGER' || m === 'BILL TO COMPANY') return 'Accounts Receivable';
  return mode;
};

export async function getSequenceNumber(
  transaction: admin.firestore.Transaction,
  prefix: string,
  padding: number = 2
): Promise<string> {
  const docRef = firestore.collection('counters').doc('sequences');
  const snap = await transaction.get(docRef);
  let current = 0;
  if (snap.exists) {
    current = snap.data()?.[prefix] || 0;
  }
  const nextVal = current + 1;
  transaction.set(docRef, { [prefix]: nextVal }, { merge: true });
  return `${prefix}-${nextVal.toString().padStart(padding, '0')}`;
}


function postToLedgerInternal(
  transaction: admin.firestore.Transaction,
  accountSnap: admin.firestore.DocumentSnapshot,
  amount: number,
  isDebit: boolean,
  config: any,
  description: string,
  refId: string,
  dateOverride?: string
) {
  const acc = accountSnap.data() as any;
  const date = dateOverride || config?.businessDate || getInstitutionalDate();
  
  if (typeof (accountSnap as any)._currentBalance === 'undefined') {
     (accountSnap as any)._currentBalance = acc.balance || 0;
  }
  
  let balanceImpact = acc.normal === 'Debit' ? (isDebit ? amount : -amount) : (isDebit ? -amount : amount);
  const anticipatedBalance = (accountSnap as any)._currentBalance + balanceImpact;
  (accountSnap as any)._currentBalance = anticipatedBalance;

  const entryId = `ENT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  transaction.set(firestore.collection('ledger_entries').doc(entryId), {
    id: entryId,
    date,
    accountId: accountSnap.id,
    accountName: acc.name,
    description,
    refId,
    debit: isDebit ? amount : 0,
    credit: isDebit ? 0 : amount,
    balanceAfter: anticipatedBalance,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  transaction.update(accountSnap.ref, { balance: anticipatedBalance });
}

export async function postSale(data: any) {
  await enforceAuth();
  await enforcePermission('sales.post');
  
  const user = await getCurrentUser();

  let id = '';
  const config = await getConfig();
  const date = data.date || config?.businessDate || getInstitutionalDate();
  const sale = { 
    ...data, 
    date, 
    isVoided: false,
    createdBy: user?.id || 'SYSTEM',
    createdByName: user?.fullName || user?.email || 'System Operation',
    createdAt: new Date().toISOString()
  };

  try {
    // 1. Identify all accounts involved
    const identifiers = new Set<string>();
    if (sale.items) sale.items.forEach((i: any) => {
       identifiers.add(i.category);
       if (i.isImported) identifiers.add('Accounts Receivable');
    });
    if (sale.sc > 0) identifiers.add('Service Charge Payable');
    if (sale.tax > 0) identifiers.add('VAT Payable (13%)');
    if (sale.settlements) sale.settlements.forEach((s: any) => {
      let modeAcc: string;
      if (s.mode === 'Bill to Company') {
        modeAcc = s.debtorAccountId || 'Accounts Receivable';
      } else if (s.mode === 'Bill to Room') {
        modeAcc = 'Accounts Receivable';
      } else {
        modeAcc = mapModeToAccount(s.mode, config);
      }
      identifiers.add(modeAcc);
    });

    // 2. Pre-fetch all accounts (OUTSIDE transaction to avoid inter-op issues in loops)
    const accRefs = await getAccountRefs(Array.from(identifiers));

    // 3. Pre-fetch Room Ref if needed
    let roomRef = null;
    if (sale.roomNumber) {
      const rQuery = await firestore.collection('rooms').where('number', '==', sale.roomNumber.toString()).limit(1).get();
      if (!rQuery.empty) roomRef = rQuery.docs[0].ref;
    }

    // 4. If this is a modification, pre-fetch original entries for reversal
    let entriesToReverse: any[] = [];
    if (data.originalId) {
       const entriesSnap = await firestore.collection('ledger_entries').where('refId', '==', data.originalId).get();
       entriesToReverse = entriesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
       // Add original account IDs to identifiers to ensure we have their refs
       entriesToReverse.forEach(e => identifiers.add(e.accountId));
       // Refresh accRefs to include any accounts from the original transaction
       const additionalAccRefs = await getAccountRefs(Array.from(identifiers));
       Object.assign(accRefs, additionalAccRefs);
    }

    await firestore.runTransaction(async (transaction) => {
      // PERFORM ALL READS (using transaction.get for atomicity)
      const txnAccSnaps: Record<string, admin.firestore.DocumentSnapshot> = {};
      for (const key in accRefs) {
        txnAccSnaps[key] = await transaction.get(accRefs[key].ref);
      }
      
      let txnRoomSnap = null;
      if (roomRef) txnRoomSnap = await transaction.get(roomRef);

      let originalSnap: admin.firestore.DocumentSnapshot | undefined;
      let originalDocRef: admin.firestore.DocumentReference | undefined;
      if (data.originalId) {
         originalDocRef = firestore.collection('sales').doc(data.originalId);
         originalSnap = await transaction.get(originalDocRef);
      }

      id = await getSequenceNumber(transaction, 'SJV');
      sale.id = id;

      // VOID ORIGINAL ENTRIES
      if (data.originalId && originalSnap && originalDocRef) {
         if (originalSnap.exists && !(originalSnap.data() as any).isVoided) {
            // Reverse ledger entries
            for (const entry of entriesToReverse) {
               const snap = txnAccSnaps[entry.accountId];
               if (snap?.exists) {
                  const isDebitReversal = entry.credit > 0;
                  const amount = entry.debit || entry.credit;
                  postToLedgerInternal(transaction, snap, amount, isDebitReversal, config, `MOD_VOID: Updated by ${id}`, data.originalId, date);
               }
            }
            // Mark as voided
            transaction.update(originalDocRef, { 
               isVoided: true, 
               voidReason: `MODIFIED_BY_${id}`, 
               voidedAt: admin.firestore.FieldValue.serverTimestamp() 
            });
         }
      }

      // PERFORM ALL WRITES
      if (sale.items) {
        const rawSubtotal = sale.items.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0);
        const discount = parseFloat(sale.discount || 0) || 0;
        let allocatedDiscountSum = 0;

        for (let idx = 0; idx < sale.items.length; idx++) {
          const item = sale.items[idx];
          const snap = txnAccSnaps[item.category];
          if (!item.isImported && !snap?.exists) throw new Error(`ACCOUNT_NOT_FOUND: ${item.category}`);

          let itemDiscount = 0;
          if (discount > 0 && rawSubtotal > 0) {
            if (idx === sale.items.length - 1) {
              itemDiscount = parseFloat((discount - allocatedDiscountSum).toFixed(2));
            } else {
              itemDiscount = parseFloat(((discount * (parseFloat(item.amount) || 0)) / rawSubtotal).toFixed(2));
              allocatedDiscountSum = parseFloat((allocatedDiscountSum + itemDiscount).toFixed(2));
            }
          }

          const netAmount = parseFloat(((parseFloat(item.amount) || 0) - itemDiscount).toFixed(2));
          
          if (item.isImported) {
             const arSnap = txnAccSnaps['Accounts Receivable'];
             if (arSnap?.exists) {
                // Credit Accounts Receivable (false = credit) to clear the unpaid balance
                postToLedgerInternal(transaction, arSnap, netAmount, false, config, `Settled Imported Charge: ${item.originalSaleId || 'Unknown'}`, id, date);
             }
             if (item.originalSaleId) {
                transaction.update(firestore.collection('sales').doc(item.originalSaleId), { status: 'Paid' });
             }
          } else {
             postToLedgerInternal(transaction, snap, netAmount, false, config, `Revenue: ${sale.guest}`, id, date);
          }
        }
      }

      if (sale.sc > 0) {
        const snap = txnAccSnaps['Service Charge Payable'];
        if (!snap?.exists) throw new Error("ACCOUNT_NOT_FOUND: Service Charge Payable");
        postToLedgerInternal(transaction, snap, sale.sc, false, config, `SC - Sale: ${id}`, id, date);
      }
      if (sale.tax > 0) {
        const snap = txnAccSnaps['VAT Payable (13%)'];
        if (!snap?.exists) throw new Error("ACCOUNT_NOT_FOUND: VAT Payable (13%)");
        postToLedgerInternal(transaction, snap, sale.tax, false, config, `Tax - Sale: ${id}`, id, date);
      }

      const rawSubtotal = (sale.items || []).reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0);
      const discount = parseFloat(sale.discount || 0) || 0;
      const totalSale = rawSubtotal - discount + (sale.sc || 0) + (sale.tax || 0);
      const totalSettled = (sale.settlements || []).reduce((acc: number, s: any) => acc + s.amount, 0);
      const unpaid = parseFloat((totalSale - totalSettled).toFixed(2));

      if (unpaid > 0) {
          let arAcc = 'Accounts Receivable';
          let arDesc = `Unpaid Balance: ${sale.guest || 'Walk-in'}`;
          
          const companySettlement = (sale.settlements || []).find((s: any) => s.mode === 'Bill to Company');
          if (companySettlement && companySettlement.debtorAccountId) {
              arAcc = companySettlement.debtorAccountId;
              arDesc = `Unpaid Balance: ${companySettlement.debtorName || sale.guest}`;
          }

          const arSnap = txnAccSnaps[arAcc] || txnAccSnaps['Accounts Receivable'];
          if (!arSnap?.exists) throw new Error(`ACCOUNT_NOT_FOUND: ${arAcc}`);
          
          postToLedgerInternal(transaction, arSnap, unpaid, true, config, arDesc, id, date);
      }

      if (sale.settlements) {
        for (const s of sale.settlements) {
          if (!s.amount || s.amount <= 0) continue;
          let debAcc: string;
          if (s.mode === 'Bill to Company') {
            debAcc = s.debtorAccountId || 'Accounts Receivable';
          } else if (s.mode === 'Bill to Room') {
            debAcc = 'Accounts Receivable';
          } else {
            debAcc = mapModeToAccount(s.mode, config);
          }
          const snap = txnAccSnaps[debAcc];
          if (!snap?.exists) throw new Error(`SETTLEMENT_ACCOUNT_NOT_FOUND: ${debAcc} — Please ensure an Asset account containing 'Receivable' or 'Sundry Debtor' exists in your Chart of Accounts.`);
          
          let description = `Settlement: ${s.mode}`;
          if (s.mode === 'Bill to Company') {
            const partyPart = s.debtorName ? `${s.debtorName}` : 'Unnamed Debtor';
            const guestPart = sale.guest ? ` [Guest: ${sale.guest}]` : '';
            description = `Settlement: Bill to Company - ${partyPart}${guestPart}`;
          } else if (s.mode === 'Bill to Room') {
            const roomNum = s.roomNumber || s.roomId || sale.guest || 'Unknown';
            description = `Settlement: Bill to Room - RM #${roomNum} [Guest: ${sale.guest}]`;
          }
          
          postToLedgerInternal(transaction, snap, s.amount, true, config, description, id, date);
        }
      }


      if (txnRoomSnap?.exists) {
        transaction.update(txnRoomSnap.ref, { status: 'Occupied' });
      }

      transaction.set(firestore.collection('sales').doc(id), sale);
    });

    revalidatePath('/');
    return { success: true, id };
  } catch (err: any) {
    console.error("SALE_TXN_CRASH:", err);
    return { success: false, error: err.message || 'SALE_TRANSACTION_FAILED' };
  }
}

export async function postExpense(data: any) {
  await enforceAuth();
  await enforcePermission('expense.post'); // Ensure expense.post exists or we'll add it in auth.ts
  
  const user = await getCurrentUser();

  let id = '';
  const config = await getConfig();
  const date = data.date || config?.businessDate || getInstitutionalDate();
  const totalAmount = data.items.reduce((sum: number, i: any) => sum + (parseFloat(i.amount) || 0), 0);
  const expense = { 
    ...data, 
    date, 
    amount: totalAmount, 
    isVoided: false,
    createdBy: user?.id || 'SYSTEM',
    createdByName: user?.fullName || user?.email || 'System Operation',
    createdAt: new Date().toISOString()
  };

  try {
    // 1. Identify all accounts
    const identifiers = new Set<string>();
    data.items.forEach((i: any) => identifiers.add(i.category));
    
    if (data.settlements && Array.isArray(data.settlements)) {
       data.settlements.forEach((s: any) => {
          const modeUpper = (s.mode || '').toUpperCase().trim();
          const acc = (modeUpper === 'PAYABLE' || modeUpper === 'CITY LEDGER') 
             ? (data.vendorAccountId || 'Accounts Payable') 
             : mapModeToAccount(s.mode, config);
          identifiers.add(acc);
          
          if (data.vendor) {
             identifiers.add(data.vendorAccountId || 'Accounts Payable');
          }
       });
    } else {
       const payMode = (data.payMode || data.paymentMode || '').toUpperCase().trim();
       const acc = (payMode === 'PAYABLE' || payMode === 'CITY LEDGER')
          ? (data.vendorAccountId || 'Accounts Payable')
          : mapModeToAccount(data.payMode || data.paymentMode, config);
       identifiers.add(acc);
       
       if (data.vendor) {
          identifiers.add(data.vendorAccountId || 'Accounts Payable');
       }
    }

    // 2. Pre-fetch
    const accRefs = await getAccountRefs(Array.from(identifiers));

    // 3. If modification, pre-fetch original entries
    let entriesToReverse: any[] = [];
    if (data.originalId) {
       const entriesSnap = await firestore.collection('ledger_entries').where('refId', '==', data.originalId).get();
       entriesToReverse = entriesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
       entriesToReverse.forEach(e => identifiers.add(e.accountId));
       const additionalAccRefs = await getAccountRefs(Array.from(identifiers));
       Object.assign(accRefs, additionalAccRefs);
    }

    await firestore.runTransaction(async (transaction) => {
      // READS
      const txnAccSnaps: Record<string, admin.firestore.DocumentSnapshot> = {};
      for (const key in accRefs) {
        txnAccSnaps[key] = await transaction.get(accRefs[key].ref);
      }

      let originalSnap: admin.firestore.DocumentSnapshot | undefined;
      let originalDocRef: admin.firestore.DocumentReference | undefined;
      if (data.originalId) {
         originalDocRef = firestore.collection('expenses').doc(data.originalId);
         originalSnap = await transaction.get(originalDocRef);
      }

      id = await getSequenceNumber(transaction, 'PJV');
      expense.id = id;

      // VOID ORIGINAL IF MODIFYING
      if (data.originalId && originalSnap && originalDocRef) {
         if (originalSnap.exists && !(originalSnap.data() as any).isVoided) {
            for (const entry of entriesToReverse) {
               const snap = txnAccSnaps[entry.accountId];
               if (snap?.exists) {
                  const isDebitReversal = entry.credit > 0;
                  const amount = entry.debit || entry.credit;
                  postToLedgerInternal(transaction, snap, amount, isDebitReversal, config, `MOD_VOID: Updated by ${id}`, data.originalId, date);
               }
            }
            transaction.update(originalDocRef, { isVoided: true, voidReason: `MODIFIED_BY_${id}`, voidedAt: admin.firestore.FieldValue.serverTimestamp() });
         }
      }

      // WRITES
      for (const item of data.items) {
        const snap = txnAccSnaps[item.category];
        if (snap?.exists) {
          postToLedgerInternal(transaction, snap, item.amount, true, config, `Pur: ${data.vendor} - ${item.note || ''}`, id, date);
        }
      }

      // 1. Unify settlements list
      let settlements = data.settlements;
      if (!settlements || !Array.isArray(settlements) || settlements.length === 0) {
         settlements = [{
            mode: data.payMode || data.paymentMode || 'Credit',
            amount: totalAmount,
            reference: data.reference || ''
         }];
      }

      // 2. Always Credit Vendor Ledger for the FULL invoice amount
      const vendorAcc = data.vendorAccountId || 'Accounts Payable';
      const vendorSnap = txnAccSnaps[vendorAcc];
      if (!vendorSnap?.exists) throw new Error(`EXPENSE_VENDOR_ACCOUNT_NOT_FOUND: ${vendorAcc}`);
      
      postToLedgerInternal(transaction, vendorSnap, totalAmount, false, config, `Purchase Invoice: ${data.vendor || 'Unknown'}`, id, date);

      // 3. Process payments to debit vendor and credit bank/cash
      for (const s of settlements) {
         if (!s.amount || s.amount <= 0) continue;
         
         const modeUpper = (s.mode || '').toUpperCase().trim();
         const isCredit = (modeUpper === 'PAYABLE' || modeUpper === 'CITY LEDGER' || modeUpper === 'CREDIT');
         
         if (!isCredit) {
            const settlementAcc = mapModeToAccount(s.mode, config);
            const setSnap = txnAccSnaps[settlementAcc];
            if (!setSnap?.exists) throw new Error(`EXPENSE_SETTLEMENT_ACCOUNT_NOT_FOUND: ${settlementAcc}`);

            // Debit Vendor Ledger (Settling a portion of the liability)
            postToLedgerInternal(transaction, vendorSnap, s.amount, true, config, `Payment (${s.mode}): ${data.vendor || 'Unknown'}`, id, date);
            
            // Credit Cash/Bank Ledger
            postToLedgerInternal(transaction, setSnap, s.amount, false, config, `Payment (${s.mode}): ${data.vendor || 'Unknown'}`, id, date);
         }
      }

      transaction.set(firestore.collection('expenses').doc(id), expense);
    });

    revalidatePath('/');
    revalidatePath('/procurement-report');
    return { success: true, id };
  } catch (err: any) {
    console.error("EXPENSE_TXN_CRASH:", err);
    return { success: false, error: err.message || 'EXPENSE_TRANSACTION_FAILED' };
  }
}

export async function voidTransaction(transactionId: string, type: 'SALE' | 'EXPENSE', reason: string) {
  await enforceAuth();
  await enforcePermission('admin.audit'); // Voiding requires high clearance

  const user = await getCurrentUser();
  const config = await getConfig();
  const collectionName = type === 'SALE' ? 'sales' : 'expenses';
  const docRef = firestore.collection(collectionName).doc(transactionId);
  
  try {
    const docSnap = await docRef.get();
    if (!docSnap.exists) throw new Error('TRANSACTION_NOT_FOUND');
    const txnData = docSnap.data() as any;
    if (txnData.isVoided) throw new Error('ALREADY_VOIDED');

    // 1. Find all related ledger entries to reverse them
    const entriesSnapshot = await firestore.collection('ledger_entries')
      .where('refId', '==', transactionId)
      .get();
    
    const entriesToReverse = entriesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const accountIds = Array.from(new Set(entriesToReverse.map((e: any) => e.accountId)));
    
    // 2. Pre-fetch account refs
    const accRefs = await getAccountRefs(accountIds);

    await firestore.runTransaction(async (transaction) => {
      // READS
      const txnAccSnaps: Record<string, admin.firestore.DocumentSnapshot> = {};
      for (const id of accountIds) {
        if (accRefs[id]) txnAccSnaps[id] = await transaction.get(accRefs[id].ref);
      }

      // WRITES
      // Reverse each entry
      for (const entry of entriesToReverse as any[]) {
        const snap = txnAccSnaps[entry.accountId];
        if (!snap?.exists) continue;

        const isDebitReversal = entry.credit > 0; // If original was credit, reversal is debit
        const amount = entry.debit || entry.credit;
        
        postToLedgerInternal(
          transaction, 
          snap, 
          amount, 
          isDebitReversal, 
          config, 
          `VOID: ${reason} (Ref: ${transactionId})`, 
          transactionId, 
          config?.businessDate || new Date().toISOString().split('T')[0]
        );
      }

      // Update Transaction Status
      transaction.update(docRef, { 
        isVoided: true, 
        voidReason: reason, 
        voidedAt: admin.firestore.FieldValue.serverTimestamp(),
        voidedBy: user?.id || 'SYSTEM',
        voidedByName: user?.fullName || user?.email || 'System Operation'
      });
    });

    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    console.error("VOID_TXN_FAILED:", err);
    return { success: false, error: err.message };
  }
}

// --- NIGHT AUDIT ---
export async function runNightAudit() {
  await enforceAuth();

  const config = await getConfig();
  if (!config) return { success: false, error: 'SYSTEM_CONFIG_NOT_FOUND' };

  const today = config.businessDate;
  
  // Fetch unpaid sales
  const unpaidSalesSnap = await firestore.collection('sales')
    .where('status', '==', 'Unpaid')
    .get();
  
  let auditRevenue = 0;
  const processedRooms: string[] = [];

  for (const doc of unpaidSalesSnap.docs) {
    const sale = doc.data();
    if (!sale.roomNumber) continue;

    // Simplified daily rate logic for Firestore Port
    const items = sale.items || [];
    items.push({ 
      category: 'Accommodation Charge', 
      amount: sale.subtotal, // Assume daily rate for demo port
      note: `Auto Audit [${today}]` 
    });

    const accRefs = await getAccountRefs(['Accommodation Charge']);
    const accRef = accRefs['Accommodation Charge'];

    await firestore.runTransaction(async (transaction) => {
        let txnAccSnap = accRef ? await transaction.get(accRef.ref) : null;
        if (!txnAccSnap?.exists) throw new Error("ACCOUNT_NOT_FOUND: Accommodation Charge");

        postToLedgerInternal(transaction, txnAccSnap, sale.subtotal, false, config, `Night Audit Rev`, doc.id, today);
        transaction.update(doc.ref, { items: items });
    });
    
    auditRevenue += sale.subtotal;
    processedRooms.push(sale.roomNumber);
  }

  // Rollover Date
  const nextDate = new Date(today);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextDateStr = nextDate.toISOString().split('T')[0];

  const systemDate = new Date().toISOString().split('T')[0];
  if (nextDateStr > systemDate) {
    return { 
      success: false, 
      error: `FUTURE_ROLLOVER_DENIED: The business date cannot be advanced beyond the current system date (${systemDate}).` 
    };
  }

  await firestore.collection('config').doc('main').update({ businessDate: nextDateStr });

  revalidatePath('/');
  return { success: true, nextDate: nextDateStr };
}


// --- DAY BOOK & CALCULATIONS ---
export async function getDayBook(from?: string, to?: string) {
  const [sales, config, expensesSnap] = await Promise.all([
    getSales(from, to),
    getConfig(),
    firestore.collection('expenses')
      .where('date', '>=', from || '1970-01-01')
      .where('date', '<=', to || '2099-12-31')
      .get()
  ]);
  
  const expenses = expensesSnap.docs.map(d => d.data());

  const transactions = [
    ...sales.map((s: any) => ({ 
      id: s.id, 
      date: s.date, 
      desc: `Sale: ${s.guest || 'Anonymous'}`, 
      type: 'INFLOW', 
      amount: s.amount, 
      category: 'Sales',
      room: s.roomNumber,
      mode: s.settlements && Array.isArray(s.settlements) ? s.settlements.filter((st: any) => (parseFloat(st.amount) || 0) > 0).map((st: any) => st.mode).join(', ') : (s.paymentMode || 'Cash'),
      isVoided: s.isVoided,
      source: s
    })),
    ...expenses.map((e: any) => {
      const eAmt = parseFloat(e.amount) || e.items?.reduce((sum: number, i: any) => sum + (parseFloat(i.amount) || 0), 0) || 0;
      return { 
        id: e.id, 
        date: e.date, 
        desc: `Expense: ${e.vendor || 'Unknown'}`, 
        type: 'OUTFLOW', 
        amount: eAmt, 
        category: e.items?.[0]?.category || e.category || 'Expenses',
        room: null,
        mode: e.settlements && Array.isArray(e.settlements) ? e.settlements.filter((st: any) => (parseFloat(st.amount) || 0) > 0).map((st: any) => st.mode).join(', ') : (e.payMode || e.paymentMode || 'Cash'),
        isVoided: e.isVoided,
        source: e
      };
    })
  ].sort((a, b) => b.date.localeCompare(a.date));

  const inflow = sales.filter((s: any) => !s.isVoided).reduce((sum, s: any) => sum + (s.amount || 0), 0);
  const outflow = expenses.filter((e: any) => !e.isVoided).reduce((sum, e: any) => sum + (parseFloat(e.amount) || e.items?.reduce((s: number, i: any) => s + (parseFloat(i.amount) || 0), 0) || 0), 0);

  return {
    transactions,
    summary: {
      openingBalance: 0,
      totalInflow: inflow,
      totalOutflow: outflow,
      closingBalance: (inflow - outflow)
    }
  };
}

export async function getDashboardStats() {
  const [accounts, sales, rooms] = await Promise.all([
    getAccounts(),
    getSales(),
    getRooms()
  ]);

  const totalRevenue = accounts.filter(a => a.type === 'REVENUE').reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalExpenses = accounts.filter(a => a.type === 'EXPENSE').reduce((sum, a) => sum + (a.balance || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  // ADR & RevPAR simple estimate
  const occupiedCount = rooms.filter(r => r.status === 'Occupied').length;
  const occupancyRate = rooms.length > 0 ? (occupiedCount / rooms.length) * 100 : 0;
  
  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    chartData: [], // Dashboard chart logic can be updated later
    occupancyRate: occupancyRate.toFixed(1) + '%',
    roomsReady: rooms.filter(r => r.status === 'Ready').length
  };
}

// --- SYSTEM ADMINISTRATION ---
export async function resetSystemData() {
  try {
    // Bulk delete logic for Firestore
    const batches: any[] = [];
    const collections = ['sales', 'expenses', 'audit_logs', 'ledger_entries'];
    
    for (const col of collections) {
      const snap = await firestore.collection(col).get();
      snap.forEach(doc => batches.push(doc.ref.delete()));
    }
    
    await Promise.all(batches);
    
    // Zero out account balances
    const accs = await firestore.collection('accounts').get();
    const accBatch = firestore.batch();
    accs.forEach(doc => accBatch.update(doc.ref, { balance: 0 }));
    await accBatch.commit();
    
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    console.error("RESET_SYSTEM_DATA_FAILED:", err);
    return { success: false, error: err.message };
  }
}

export async function getGuestDatabase() {
  const sales = await getSales();
  const guests: Record<string, any> = {};
  
  sales.forEach(s => {
    const gName = s.guest || 'ANONYMOUS SALES';
    if (!guests[gName]) {
      guests[gName] = {
        name: gName,
        phone: s.phone || 'N/A',
        lastVisit: s.date,
        totalTransacted: 0,
        history: []
      };
    }
    // Update last visit if more recent
    if (s.date > guests[gName].lastVisit) {
      guests[gName].lastVisit = s.date;
      if (s.phone && s.phone !== 'N/A') guests[gName].phone = s.phone;
    }

    guests[gName].totalTransacted += s.amount;
    guests[gName].history.push({ 
      id: s.id, 
      date: s.date, 
      amount: s.amount,
      status: s.status || 'Paid',
      roomNumber: s.roomNumber,
      mode: s.paymentMode || (s.settlements?.[0]?.mode),
      items: s.items || [],
      discount: s.discount || 0,
      sc: s.sc || 0,
      tax: s.tax || 0,
      subtotal: s.subtotal || 0,
      settlements: s.settlements || []
    });
  });
  
  return Object.values(guests);
}

export async function getLedgerEntries(accountId: string) {
  const snapshot = await firestore.collection('ledger_entries')
    .where('accountId', '==', accountId)
    .get();
  
  const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
  // In-memory sort: Oldest to Latest (Chronological)
  const sorted = data.sort((a, b) => a.date.localeCompare(b.date));
  return serialize(sorted);
}

export async function getNotifications() {
  const snapshot = await firestore.collection('notifications')
    .orderBy('timestamp', 'desc')
    .limit(20)
    .get();
  return serialize(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))) as any[];
}

export async function addNotification(type: string, message: string) {
  await firestore.collection('notifications').add({
    timestamp: new Date().toISOString(),
    type,
    message,
    read: false
  });
  revalidatePath('/');
}

export async function getAuditLogs() {
  const snapshot = await firestore.collection('audit_logs')
    .orderBy('date', 'desc')
    .limit(10)
    .get();
  return serialize(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))) as any[];
}

// --- SUPPLIERS ---
export const getSuppliers = cache(async () => {
  const snapshot = await firestore.collection('suppliers').orderBy('name').get();
  return serialize(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))) as any[];
});

export async function upsertSupplier(data: any) {
  const id = data.id || `SUP-${Date.now()}`;
  
  if (!data.accountId) {
    const accId = `ACC-${Date.now()}`;
    await upsertAccount({
      id: accId,
      name: `Vendor Ledger: ${data.name}`,
      code: `VL-${id.substring(4)}`,
      type: 'LIABILITY',
      category: 'Accounts Payable',
      normal: 'Credit',
      parentId: 'ACC-2300',
      balance: data.openingBalance || 0,
      isActive: true,
      description: `Auto-generated ledger for ${data.name}`
    });
    data.accountId = accId;
  }

  await firestore.collection('suppliers').doc(id).set(data, { merge: true });
  revalidatePath('/purchase');
  revalidatePath('/setup');
  return { success: true };
}

export async function deleteSupplier(id: string) {
  await firestore.collection('suppliers').doc(id).delete();
  revalidatePath('/purchase');
  revalidatePath('/setup');
  return { success: true };
}

export async function getSupplierBalance(supplierName: string, accountId?: string) {
  let entries: any[] = [];
  
  if (accountId && accountId !== '') {
    const snap = await firestore.collection('ledger_entries').where('accountId', '==', accountId).get();
    entries = snap.docs.map(doc => doc.data());
  } else {
    // Consolidated Accounts Payable (2300) matching vendor description
    const snap = await firestore.collection('ledger_entries').where('accountId', '==', '2300').get();
    entries = snap.docs.map(doc => doc.data()).filter((e: any) => 
      e.description?.toUpperCase().includes(supplierName.toUpperCase())
    );
  }

  const totalDebit = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
  const totalCredit = entries.reduce((sum, e) => sum + (e.credit || 0), 0);
  
  // Return Normal Credit Balance (Payables increase on Credit, decrease on Debit)
  return totalCredit - totalDebit;
}

export async function postSupplierSettlement(data: {
  supplierName: string;
  accountId?: string;
  paymentMode: 'CASH' | 'BANK' | 'CHEQUE' | 'E-BANKING';
  amount: number;
  date?: string;
  note?: string;
}) {
  await enforceAuth();
  await enforcePermission('expense.post');
  
  const user = await getCurrentUser();

  const config = await getConfig();
  const date = data.date || config?.businessDate || getInstitutionalDate();
  
  // Resolve the cash/bank account ID
  const settlementAccountName = mapModeToAccount(data.paymentMode, config);
  // Let's resolve the specific account from database for settlement account
  const accountsSnapshot = await firestore.collection('accounts').get();
  const accountsList = accountsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
  
  const paymentAccount = accountsList.find((a: any) => a.name === settlementAccountName || a.id === settlementAccountName);
  if (!paymentAccount) {
    throw new Error(`PAYMENT_ACCOUNT_NOT_FOUND: ${settlementAccountName}`);
  }
  
  // Resolve the supplier's liability account
  let liabilityAccountId = data.accountId;
  let liabilityAccountName = 'Accounts Payable';
  if (!liabilityAccountId) {
    const defaultLiability = accountsList.find((a: any) => a.name === 'Accounts Payable' || a.id === '2300');
    liabilityAccountId = defaultLiability?.id || '2300';
    liabilityAccountName = defaultLiability?.name || 'Accounts Payable';
  } else {
    const customLiability = accountsList.find((a: any) => a.id === liabilityAccountId);
    liabilityAccountName = customLiability?.name || 'Accounts Payable';
  }

  // Create the JV structure:
  // 1. Debit Vendor's Liability Account (reduces liability)
  // 2. Credit Payment Account (Cash/Bank) (outflow of asset)
  const items = [
    {
      accountId: liabilityAccountId,
      accountName: liabilityAccountName,
      description: `Settlement: Payment to ${data.supplierName} - ${data.note || ''}`,
      debit: data.amount,
      credit: 0
    },
    {
      accountId: paymentAccount.id,
      accountName: paymentAccount.name,
      description: `Payment Settlement: ${data.supplierName} - ${data.note || ''}`,
      debit: 0,
      credit: data.amount
    }
  ];

  return postJV({ items, date });
}

export async function markNotificationAsRead(id: string) {
  await firestore.collection('notifications').doc(id).update({ read: true });
  revalidatePath('/');
}

export async function getSuppliersBySearch(query: string) {
  if (!query) return [];
  const snapshot = await firestore.collection('suppliers').get();
  const searchLower = query.toLowerCase();
  const data = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as any))
    .filter(s => s.name?.toLowerCase().includes(searchLower) || s.phone?.includes(query))
    .slice(0, 10);
  return serialize(data);
}

export async function getAccountCategories() {
  const snapshot = await firestore.collection('account_categories').get();
  const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
  
  // Sort in-memory to avoid FAILED_PRECONDITION (composite index) errors
  const sorted = categories.sort((a, b) => {
    const typeCompare = (a.type || '').localeCompare(b.type || '');
    if (typeCompare !== 0) return typeCompare;
    return (a.name || '').localeCompare(b.name || '');
  });

  return serialize(sorted) as any[];
}

export async function upsertAccountCategory(data: any) {
  const id = data.id || `CAT-${Date.now()}`;
  await firestore.collection('account_categories').doc(id).set(data, { merge: true });
  revalidatePath('/');
}

export async function postJV(data: any) {
  const { items, date: dateOverride, entryType } = data;
  const entries = items;
  const totalDebit = entries.reduce((s: any, e: any) => s + (parseFloat(e.debit) || 0), 0);
  const totalCredit = entries.reduce((s: any, e: any) => s + (parseFloat(e.credit) || 0), 0);
  
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error('Unbalanced Journal: Debits must equal Credits.');
  }

  let refId = '';
  const config = await getConfig();
  const date = dateOverride || config?.businessDate || getInstitutionalDate();
  
  try {
    // 1. Identify all accounts
    const identifiers = new Set<string>();
    entries.forEach((e: any) => identifiers.add(e.accountId));
    
    // 2. Pre-fetch
    const accRefs = await getAccountRefs(Array.from(identifiers));

    await firestore.runTransaction(async (transaction) => {
      // READS
      const txnAccSnaps: Record<string, admin.firestore.DocumentSnapshot> = {};
      for (const key in accRefs) {
        txnAccSnaps[key] = await transaction.get(accRefs[key].ref);
      }

      let prefix = 'JV';
      if (entryType === 'PAYMENT') prefix = 'PMT';
      else if (entryType === 'RECEIPT') prefix = 'RV';
      else if (entryType === 'DEPOSIT') prefix = 'Contra';

      refId = await getSequenceNumber(transaction, prefix);

      // WRITES
      for (const entry of entries) {
        const snap = txnAccSnaps[entry.accountId];
        if (snap?.exists) {
          postToLedgerInternal(
            transaction,
            snap,
            entry.debit > 0 ? entry.debit : entry.credit,
            entry.debit > 0,
            config,
            entry.description || `JV Ref: ${refId}`,
            refId,
            date
          );
        } else {
           throw new Error(`ACCOUNT_NOT_FOUND: ${entry.accountId}`);
        }
      }
    });
    revalidatePath('/');
    return { success: true, refId };
  } catch (err: any) {
    console.error("JV_TXN_CRASH:", err);
    return { success: false, error: err.message || 'JV_TRANSACTION_FAILED' };
  }
}

export async function globalSearch(query: string) {
  if (!query || query.length < 2) return [];
  
  const [rooms, sales, accounts] = await Promise.all([
     getRooms(),
     getSales(),
     getAccounts()
  ]);

  const searchLower = query.toLowerCase();
  const results: any[] = [];

  // 1. Search Rooms
  rooms.filter(r => r.number.includes(query) || r.type.toLowerCase().includes(searchLower)).forEach(r => {
    results.push({ type: 'ROOM', title: `Room ${r.number}`, sub: `${r.type} - ${r.status}`, href: '/housekeeping', icon: 'BedDouble' });
  });

  // 2. Search Guests (Unique)
  const guests = new Set<string>();
  sales.filter(s => s.guest?.toLowerCase().includes(searchLower)).forEach(s => {
    if (!guests.has(s.guest!)) {
      guests.add(s.guest!);
      results.push({ type: 'GUEST', title: s.guest, sub: `Phone: ${s.phone || 'N/A'}`, href: '/guest-folio', icon: 'User' });
    }
  });

  // 3. Search Accounts (Ledger)
  accounts.filter(a => a.name.toLowerCase().includes(searchLower) || a.code.includes(query)).forEach(a => {
    results.push({ type: 'ACCOUNT', title: a.name, sub: `${a.type} | Code: ${a.code}`, href: '/ledger', icon: 'BookCheck' });
  });

  return results.slice(0, 8); // Top 8 results for the palette
}

export async function getSaleById(id: string) {
  const doc = await firestore.collection('sales').doc(id).get();
  return serialize(doc.exists ? { id: doc.id, ...doc.data() } : null);
}

export async function getExpenseById(id: string) {
  const doc = await firestore.collection('expenses').doc(id).get();
  return serialize(doc.exists ? { id: doc.id, ...doc.data() } : null);
}

export async function getJournalEntry(refId: string) {
  const snapshot = await firestore.collection('ledger_entries').where('refId', '==', refId).get();
  const data = snapshot.docs.map(doc => doc.data());
  
  const ref = data[0]?.refId || refId;
  const date = data[0]?.date || getInstitutionalDate();
  const memo = data[0]?.description || '';
  
  return serialize({
    ref,
    date,
    memo,
    data: data.map(d => ({
      accountName: d.accountName,
      description: d.description,
      debit: d.debit,
      credit: d.credit
    }))
  });
}

export async function getLedger() {
  return getAccounts();
}

export async function seedStandardAccounts() {
   const standard = [
      { code: '1010', name: 'Main Operational Bank', type: 'ASSET', normal: 'Debit', category: 'CASH & EQUIVALENTS' },
      { code: '1200', name: 'Accounts Receivable', type: 'ASSET', normal: 'Debit', category: 'TRADE RECEIVABLES' },
      { code: '1300', name: 'Petty Cash / House Bank', type: 'ASSET', normal: 'Debit', category: 'CASH & EQUIVALENTS' },
      { code: '2100', name: 'VAT Payable (13%)', type: 'LIABILITY', normal: 'Credit', category: 'TAX OBLIGATIONS' },
      { code: '2200', name: 'Service Charge Payable', type: 'LIABILITY', normal: 'Credit', category: 'TAX OBLIGATIONS' },
      { code: '2300', name: 'Accounts Payable', type: 'LIABILITY', normal: 'Credit', category: 'TRADE PAYABLES' },
      { code: '3000', name: 'Owner Capital Equity', type: 'EQUITY', normal: 'Credit', category: 'EQUITY RESERVES' },
      { code: '4100', name: 'Accommodation Revenue', type: 'REVENUE', normal: 'Credit', category: 'CORE OPERATING INCOME' },
      { code: '4200', name: 'F&B Sales Revenue', type: 'REVENUE', normal: 'Credit', category: 'OPERATING INCOME' },
      { code: '4300', name: 'SPA SALES', type: 'REVENUE', normal: 'Credit', category: 'OPERATING INCOME' },
      { code: '5010', name: 'Electricity / Power', type: 'EXPENSE', normal: 'Debit', category: 'UTILITIES' },
      { code: '5020', name: 'Water & Waste', type: 'EXPENSE', normal: 'Debit', category: 'UTILITIES' },
      { code: '5200', name: 'Payroll & Wages', type: 'EXPENSE', normal: 'Debit', category: 'LABOR COSTS' },
      { code: '5500', name: 'Repair & Maintenance', type: 'EXPENSE', normal: 'Debit', category: 'OPERATING OVERHEADS' },
      { code: '5600', name: 'Inventory Purchase', type: 'EXPENSE', normal: 'Debit', category: 'OPERATING OVERHEADS' },
   ];

   for (const acc of standard) {
      const derivedId = `ACC-${acc.code}`;
      const doc = await firestore.collection('accounts').doc(derivedId).get();
      if (!doc.exists) {
         await firestore.collection('accounts').doc(derivedId).set({ ...acc, id: derivedId, balance: 0, isActive: true });
      } else {
         await firestore.collection('accounts').doc(derivedId).update({ name: acc.name, code: acc.code });
      }
   }
   
   revalidatePath('/setup');
   revalidatePath('/ledger');
   return { success: true };
}

// --- GUEST PROFILING & LOYALTY ---
export async function getGuestProfiles() {
  const sales = await getSales();
  const unique = new Map<string, any>();
  
  sales.forEach(s => {
    if (s.guest && !unique.has(s.guest.toUpperCase())) {
      unique.set(s.guest.toUpperCase(), {
        guest: s.guest,
        phone: s.phone,
        email: s.email,
        pan: s.pan,
        address: s.address,
        nationality: s.nationality,
        passportNo: s.passportNo,
        passportPlace: s.passportPlace,
        date: s.date,
        roomNumber: s.roomNumber,
        status: s.status
      });
    } else if (s.guest) {
      const existing = unique.get(s.guest.toUpperCase());
      if (s.date >= existing.date) {
         existing.roomNumber = s.roomNumber || existing.roomNumber;
         existing.status = s.status || existing.status;
         existing.date = s.date;
      }
    }
  });

  return serialize(Array.from(unique.values()));
}

// --- DEBTORS ---
export const getDebtors = cache(async () => {
  const snapshot = await firestore.collection('debtors').orderBy('name').get();
  return serialize(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))) as any[];
});

export async function upsertDebtor(data: any) {
  const id = data.id || `DEB-${Date.now()}`;
  
  if (!data.accountId) {
    const accId = `ACC-${Date.now()}`;
    await upsertAccount({
      id: accId,
      name: `City Ledger: ${data.name}`,
      code: `CL-${id.substring(4)}`,
      type: 'ASSET',
      category: 'Accounts Receivable',
      balance: data.openingBalance || 0,
      isActive: true,
      description: `Auto-generated ledger for ${data.name}`
    });
    data.accountId = accId;
  }

  await firestore.collection('debtors').doc(id).set(data, { merge: true });
  revalidatePath('/setup');
  revalidatePath('/sales');
  return { success: true };
}

export async function deleteDebtor(id: string) {
  await firestore.collection('debtors').doc(id).delete();
  revalidatePath('/setup');
  revalidatePath('/sales');
  return { success: true };
}

// --- EMPLOYEES ---
export const getEmployees = cache(async () => {
  const snapshot = await firestore.collection('employees').orderBy('name').get();
  return serialize(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))) as any[];
});

export async function upsertEmployee(data: any) {
  const id = data.id || `EMP-${Date.now()}`;
  await firestore.collection('employees').doc(id).set(data, { merge: true });
  revalidatePath('/setup');
  revalidatePath('/sales');
  return { success: true };
}

export async function deleteEmployee(id: string) {
  await firestore.collection('employees').doc(id).delete();
  revalidatePath('/setup');
  revalidatePath('/sales');
  return { success: true };
}
