'use server';

import { revalidatePath } from 'next/cache';
import { formatCurrency, serialize, getInstitutionalDate, getInstitutionalTimestamp } from '@/lib/utils';
import { getUsers, getRoles, getPermissions, getCurrentUser } from './auth';
import { redirect } from 'next/navigation';
import { enforcePermission } from '@/lib/session';
import { cache } from 'react';
import { db } from '@/lib/db';
import {
  config as configTable,
  accounts, rooms, sales, expenses,
  ledgerEntries, housekeepingLogs, notifications,
  accountCategories, debtors, suppliers, employees,
  auditLogs,
} from '@/drizzle/schema';
import { eq, and, gte, lte, desc, asc, sql as sqlExpr, inArray } from 'drizzle-orm';

// ─── HELPERS ────────────────────────────────────────────────────────────────

async function enforceAuth() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) redirect('/login');
    return currentUser;
  } catch {
    return { name: 'Admin', role: 'ADMIN' };
  }
}

const mapModeToAccount = (mode: string, cfg?: any) => {
  if (cfg?.paymentModes) {
    const mapped = cfg.paymentModes.find((pm: any) => pm.label?.toUpperCase() === mode?.toUpperCase().trim());
    if (mapped?.accountId) return mapped.accountId;
  }
  const m = (mode || '').toUpperCase().trim();
  if (m === 'CASH') return 'Petty Cash / House Bank';
  if (['CARD HBL', 'HIMALAYAN BANK', 'HBL', 'FONEPAY KSBBL', 'KSBBL', 'BANK', 'CHEQUE', 'E-BANKING'].includes(m)) return 'Main Operational Bank';
  if (['PAYABLE', 'CITY LEDGER', 'BILL TO COMPANY'].includes(m)) return 'Accounts Receivable';
  return mode;
};

async function resolveAccount(identifier: string) {
  // Try direct ID first
  if (identifier.startsWith('ACC-')) {
    const acc = await db.query.accounts.findFirst({ where: eq(accounts.id, identifier) });
    if (acc) return acc;
  }
  // Try code
  const byCode = await db.query.accounts.findFirst({ where: eq(accounts.code, identifier) });
  if (byCode) return byCode;
  // Try name
  const byName = await db.query.accounts.findFirst({ where: eq(accounts.name, identifier) });
  if (byName) return byName;
  // Fuzzy fallbacks
  const all = await db.select().from(accounts);
  if (identifier === 'Petty Cash / House Bank') return all.find(a => a.name.toUpperCase().includes('CASH')) || null;
  if (identifier === 'Main Operational Bank') return all.find(a => a.name.toUpperCase().includes('BANK')) || null;
  if (identifier === 'Service Charge Payable') return all.find(a => a.name.toUpperCase().includes('SERVICE CHARGE') || a.name.toUpperCase().includes('SC PAYABLE')) || null;
  if (identifier === 'VAT Payable (13%)') return all.find(a => a.name.toUpperCase().includes('VAT') || a.name.toUpperCase().includes('TAX')) || null;
  if (identifier === 'Accounts Receivable') return all.find(a => a.name.toUpperCase().includes('RECEIVABLE') || a.name.toUpperCase().includes('SUNDRY DEBTOR')) || null;
  if (identifier === 'Accounts Payable') return all.find(a => a.name.toUpperCase().includes('PAYABLE') && a.type === 'LIABILITY') || null;
  return null;
}

let _seqCounter = 0;
async function getNextSequence(prefix: string): Promise<string> {
  // Use a simple in-DB counter stored in the config table's notes or a dedicated approach
  // We'll use a combination of timestamp + random for uniqueness
  _seqCounter++;
  const num = Date.now().toString().slice(-6) + _seqCounter.toString().padStart(2, '0');
  return `${prefix}-${num}`;
}

function postLedgerEntry(
  entries: any[],
  acc: any,
  amount: number,
  isDebit: boolean,
  description: string,
  refId: string,
  date: string,
  balanceTracker: Map<string, number>
) {
  const currentBalance = balanceTracker.get(acc.id) ?? (acc.balance || 0);
  const impact = acc.normal === 'Debit' ? (isDebit ? amount : -amount) : (isDebit ? -amount : amount);
  const newBalance = currentBalance + impact;
  balanceTracker.set(acc.id, newBalance);

  entries.push({
    id: `ENT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    date,
    accountId: acc.id,
    accountName: acc.name,
    description,
    refId,
    debit: isDebit ? amount : 0,
    credit: isDebit ? 0 : amount,
    balanceAfter: newBalance,
    createdAt: new Date().toISOString(),
  });
}

// ─── CONFIG ──────────────────────────────────────────────────────────────────

export const getConfig = cache(async () => {
  const row = await db.query.config.findFirst();
  if (!row) return null;
  return serialize({
    ...row,
    taxInclusive: row.taxInclusive ?? false,
    applyServiceCharge: row.applyServiceCharge ?? true,
    applyVat: row.applyVat ?? true,
    vatRate: row.vatRate ?? 13,
    serviceChargeRate: row.serviceChargeRate ?? 10,
    stayPlans: (row.stayPlans as any) || [],
    businessDate: row.businessDate || new Date().toISOString().split('T')[0],
    paymentModes: (row.paymentModes as any) || [],
    spaMenuItems: (row.spaMenuItems as any) || [],
  }) as any;
});

export async function updateConfig(data: any) {
  await enforcePermission('setup.manage');
  const existing = await db.query.config.findFirst();
  if (existing) {
    await db.update(configTable).set(data).where(eq(configTable.id, existing.id));
  } else {
    await db.insert(configTable).values({ ...data, businessDate: data.businessDate || new Date().toISOString().split('T')[0], hotelName: data.hotelName || 'Hotel' });
  }
  revalidatePath('/');
  return { success: true };
}

export async function getSetupRegistry() {
  const [r, c, a, cats, d, s, u, rs, prs, curr] = await Promise.all([
    getRooms(), getConfig(), getAccounts(), getAccountCategories(),
    getDebtors(), getSuppliers(), getUsers(), getRoles(), getPermissions(), getCurrentUser()
  ]);
  return { rooms: r, config: c, accounts: a, categories: cats, debtors: d, suppliers: s, users: u, roles: rs, permissions: prs, currentUser: curr };
}

export async function getDashboardRegistry() {
  const [salesData, accs, cfg] = await Promise.all([getSales(), getAccounts(), getConfig()]);
  return { rooms: [], sales: salesData, accounts: accs, config: cfg };
}

// ─── ACCOUNTS ────────────────────────────────────────────────────────────────

export const getAccounts = cache(async () => {
  const list = await db.select().from(accounts).orderBy(asc(accounts.code));
  const hasSpa = list.some(a => a.name.toUpperCase().includes('SPA') || a.code === '4300');
  if (!hasSpa) {
    const spaAcc = { id: 'ACC-4300', code: '4300', name: 'SPA SALES', type: 'REVENUE', normal: 'Credit', category: 'OPERATING INCOME', balance: 0, isActive: true };
    try { await db.insert(accounts).values(spaAcc); list.push(spaAcc as any); } catch { list.push(spaAcc as any); }
  }
  return serialize(list) as any[];
});

export async function getPeriodBalances(from: string, to: string) {
  const [allAccounts, allEntries] = await Promise.all([
    db.select().from(accounts),
    db.select().from(ledgerEntries).where(lte(ledgerEntries.date, to))
  ]);

  const entriesByAccount = new Map<string, any[]>();
  for (const e of allEntries) {
    if (!entriesByAccount.has(e.accountId)) entriesByAccount.set(e.accountId, []);
    entriesByAccount.get(e.accountId)!.push(e);
  }

  const flatBalances = allAccounts.map(acc => {
    const isPerformance = acc.type === 'REVENUE' || acc.type === 'EXPENSE';
    const relevant = (entriesByAccount.get(acc.id) || []).filter(e => !isPerformance || e.date >= from);
    let totalDebit = 0, totalCredit = 0;
    for (const e of relevant) { totalDebit += e.debit || 0; totalCredit += e.credit || 0; }
    const balance = acc.normal === 'Debit' ? totalDebit - totalCredit : totalCredit - totalDebit;
    return { ...acc, balance };
  });

  const balanceMap = new Map(flatBalances.map(a => [a.id, a]));
  const childrenIndex = new Map<string, any[]>();
  for (const acc of flatBalances) {
    if (acc.parentId) {
      if (!childrenIndex.has(acc.parentId)) childrenIndex.set(acc.parentId, []);
      childrenIndex.get(acc.parentId)!.push(acc);
    }
  }
  const memo = new Map<string, number>();
  const getAgg = (id: string): number => {
    if (memo.has(id)) return memo.get(id)!;
    const acc = balanceMap.get(id);
    if (!acc) return 0;
    const children = childrenIndex.get(id) || [];
    const childSum = children.reduce((s, c) => s + (acc.normal !== c.normal ? -getAgg(c.id) : getAgg(c.id)), 0);
    const total = acc.balance + childSum;
    memo.set(id, total);
    return total;
  };
  return serialize(flatBalances.map(acc => ({ ...acc, balance: getAgg(acc.id) })));
}

export async function getCashFlowReport(from: string, to: string) {
  const cashAccountRows = await db.select().from(accounts).where(eq(accounts.category, 'CASH & EQUIVALENTS'));
  const cashAccountIds = cashAccountRows.map(a => a.id);

  const [beforeEntries, periodEntries] = await Promise.all([
    db.select().from(ledgerEntries).where(and(inArray(ledgerEntries.accountId, cashAccountIds.length ? cashAccountIds : ['']), lte(ledgerEntries.date, from))),
    db.select().from(ledgerEntries).where(and(inArray(ledgerEntries.accountId, cashAccountIds.length ? cashAccountIds : ['']), gte(ledgerEntries.date, from), lte(ledgerEntries.date, to)))
  ]);

  const openingBalance = beforeEntries.reduce((s, e) => s + ((e.debit || 0) - (e.credit || 0)), 0);
  const inflow = periodEntries.filter(e => (e.debit || 0) > 0).map(e => ({ date: e.date, ref: e.refId, desc: e.description, amount: e.debit }));
  const outflow = periodEntries.filter(e => (e.credit || 0) > 0).map(e => ({ date: e.date, ref: e.refId, desc: e.description, amount: e.credit }));
  const totalInflow = inflow.reduce((s, i) => s + (i.amount || 0), 0);
  const totalOutflow = outflow.reduce((s, i) => s + (i.amount || 0), 0);
  const netChange = totalInflow - totalOutflow;
  return serialize({ openingBalance, inflow, outflow, totalInflow, totalOutflow, netChange, closingBalance: openingBalance + netChange });
}

export async function upsertAccount(data: any) {
  await enforcePermission('setup.manage');
  const accountId = data.id || `ACC-${Date.now()}`;
  const existing = await db.query.accounts.findFirst({ where: eq(accounts.id, accountId) });

  if (existing) {
    await db.update(accounts).set(data).where(eq(accounts.id, accountId));
    // Cascade type/category changes to children
    if (data.type !== existing.type || data.category !== existing.category) {
      await db.update(accounts).set({ type: data.type, category: data.category }).where(eq(accounts.parentId, accountId));
    }
  } else {
    await db.insert(accounts).values({ ...data, id: accountId, isActive: data.isActive ?? true, balance: data.balance || 0 });
    if (data.balance && data.balance !== 0) {
      const cfg = await getConfig();
      const date = cfg?.businessDate || new Date().toISOString().split('T')[0];
      await db.insert(ledgerEntries).values({
        id: `ENT-OPEN-${Date.now()}`,
        date,
        accountId,
        accountName: data.name,
        description: 'Opening Balance Migration',
        refId: 'SYSTEM-INIT',
        debit: data.normal === 'Debit' ? data.balance : 0,
        credit: data.normal === 'Credit' ? data.balance : 0,
        balanceAfter: data.balance,
        createdAt: new Date().toISOString(),
      });
    }
  }
  revalidatePath('/admin'); revalidatePath('/setup'); revalidatePath('/ledger');
  return { success: true };
}

export async function deleteAccount(id: string) {
  await enforcePermission('setup.manage');
  const historyCheck = await db.select().from(ledgerEntries).where(eq(ledgerEntries.accountId, id)).limit(1);
  if (historyCheck.length > 0) {
    return { success: false, error: 'ACCOUNT_HAS_IDENTITY: Cannot delete account with historical ledger entries.' };
  }
  // Detach children
  await db.update(accounts).set({ parentId: null }).where(eq(accounts.parentId, id));
  await db.delete(accounts).where(eq(accounts.id, id));
  revalidatePath('/setup');
  return { success: true };
}

// ─── ROOMS ───────────────────────────────────────────────────────────────────

export const getRooms = cache(async () => {
  const list = await db.select().from(rooms).orderBy(asc(rooms.number));
  return serialize(list) as any[];
});

export async function updateRoomStatus(id: string, status: string, note?: string) {
  await enforceAuth();
  await enforcePermission('housekeeping.update');

  const room = await db.query.rooms.findFirst({ where: eq(rooms.id, id) });
  if (!room) return { success: false };

  const cfg = await getConfig();
  const date = cfg?.businessDate || new Date().toISOString().split('T')[0];

  await db.update(rooms).set({ status }).where(eq(rooms.id, id));

  await db.insert(housekeepingLogs).values({
    date,
    roomNumber: room.number,
    prevStatus: room.status,
    newStatus: status,
    actionedBy: 'ADMINISTRATOR',
    timestamp: getInstitutionalTimestamp(),
    note: note || 'Manual Recalibration',
  });

  revalidatePath('/housekeeping');
  return { success: true };
}

export async function getHousekeepingActivity() {
  const list = await db.select().from(housekeepingLogs).orderBy(desc(housekeepingLogs.id)).limit(100);
  return serialize(list) as any[];
}

export async function upsertRoom(data: any) {
  await enforcePermission('setup.manage');
  const id = data.id || `R-${Date.now()}`;
  const existing = await db.query.rooms.findFirst({ where: eq(rooms.id, id) });
  if (existing) {
    await db.update(rooms).set(data).where(eq(rooms.id, id));
  } else {
    await db.insert(rooms).values({ ...data, id });
  }
  revalidatePath('/setup');
  return { success: true };
}

export async function deleteRoom(id: string) {
  await enforcePermission('setup.manage');
  await db.delete(rooms).where(eq(rooms.id, id));
  revalidatePath('/setup');
  return { success: true };
}

// ─── SALES ───────────────────────────────────────────────────────────────────

export const getSales = cache(async (from?: string, to?: string) => {
  let query = db.select().from(sales).orderBy(desc(sales.date));
  const conditions = [];
  if (from) conditions.push(gte(sales.date, from));
  if (to) conditions.push(lte(sales.date, to));
  const list = conditions.length > 0
    ? await db.select().from(sales).where(and(...conditions)).orderBy(desc(sales.date))
    : await db.select().from(sales).orderBy(desc(sales.date));
  return serialize(list) as any[];
});

export async function getSalesReport(from?: string, to?: string) { return getSales(from, to); }

export async function getUnpaidBillToRoomSales() {
  await enforceAuth();
  const all = await db.select().from(sales).where(eq(sales.status, 'Unpaid'));
  const filtered = all.filter(s =>
    !s.isVoided &&
    Array.isArray(s.settlements) &&
    (s.settlements as any[]).some((st: any) => st.mode === 'Bill to Room')
  ).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return serialize(filtered) as any[];
}

export async function postSale(data: any) {
  await enforceAuth();
  await enforcePermission('sales.post');

  const user = await getCurrentUser();
  const cfg = await getConfig();
  const date = data.date || cfg?.businessDate || getInstitutionalDate();
  const id = await getNextSequence('SJV');

  const sale = {
    ...data,
    id,
    date,
    isVoided: false,
    createdBy: user?.id || 'SYSTEM',
    createdByName: user?.fullName || user?.email || 'System Operation',
    createdAt: new Date().toISOString(),
  };

  try {
    const ledgerBatch: any[] = [];
    const balanceTracker = new Map<string, number>();

    // HANDLE MODIFICATION: reverse original entries
    if (data.originalId) {
      const origEntries = await db.select().from(ledgerEntries).where(eq(ledgerEntries.refId, data.originalId));
      const origSale = await db.query.sales.findFirst({ where: eq(sales.id, data.originalId) });

      if (origSale && !origSale.isVoided) {
        for (const entry of origEntries) {
          const acc = await resolveAccount(entry.accountId);
          if (acc) {
            postLedgerEntry(ledgerBatch, acc, entry.debit || entry.credit, (entry.credit || 0) > 0, `MOD_VOID: Updated by ${id}`, data.originalId, date, balanceTracker);
          }
        }
        await db.update(sales).set({ isVoided: true, voidReason: `MODIFIED_BY_${id}` }).where(eq(sales.id, data.originalId));
      }
    }

    // POST REVENUE ENTRIES
    if (data.items) {
      const rawSubtotal = data.items.reduce((s: number, i: any) => s + (parseFloat(i.amount) || 0), 0);
      const discount = parseFloat(data.discount || 0) || 0;
      let allocatedDiscount = 0;

      for (let idx = 0; idx < data.items.length; idx++) {
        const item = data.items[idx];
        const acc = item.isImported ? await resolveAccount('Accounts Receivable') : await resolveAccount(item.category);

        let itemDiscount = 0;
        if (discount > 0 && rawSubtotal > 0) {
          if (idx === data.items.length - 1) {
            itemDiscount = parseFloat((discount - allocatedDiscount).toFixed(2));
          } else {
            itemDiscount = parseFloat(((discount * (parseFloat(item.amount) || 0)) / rawSubtotal).toFixed(2));
            allocatedDiscount += itemDiscount;
          }
        }
        const netAmount = parseFloat(((parseFloat(item.amount) || 0) - itemDiscount).toFixed(2));

        if (item.isImported && acc) {
          postLedgerEntry(ledgerBatch, acc, netAmount, false, `Settled Imported Charge: ${item.originalSaleId || 'Unknown'}`, id, date, balanceTracker);
          if (item.originalSaleId) {
            await db.update(sales).set({ status: 'Paid' }).where(eq(sales.id, item.originalSaleId));
          }
        } else if (acc) {
          postLedgerEntry(ledgerBatch, acc, netAmount, false, `Revenue: ${data.guest}`, id, date, balanceTracker);
        } else {
          throw new Error(`ACCOUNT_NOT_FOUND: ${item.category}`);
        }
      }
    }

    // SC & TAX
    if ((data.sc || 0) > 0) {
      const acc = await resolveAccount('Service Charge Payable');
      if (!acc) throw new Error('ACCOUNT_NOT_FOUND: Service Charge Payable');
      postLedgerEntry(ledgerBatch, acc, data.sc, false, `SC - Sale: ${id}`, id, date, balanceTracker);
    }
    if ((data.tax || 0) > 0) {
      const acc = await resolveAccount('VAT Payable (13%)');
      if (!acc) throw new Error('ACCOUNT_NOT_FOUND: VAT Payable (13%)');
      postLedgerEntry(ledgerBatch, acc, data.tax, false, `Tax - Sale: ${id}`, id, date, balanceTracker);
    }

    // UNPAID BALANCE → Accounts Receivable
    const rawSubtotal = (data.items || []).reduce((s: number, i: any) => s + (parseFloat(i.amount) || 0), 0);
    const discount = parseFloat(data.discount || 0) || 0;
    const totalSale = rawSubtotal - discount + (data.sc || 0) + (data.tax || 0);
    const totalSettled = (data.settlements || []).reduce((s: number, st: any) => s + (st.amount || 0), 0);
    const unpaid = parseFloat((totalSale - totalSettled).toFixed(2));

    if (unpaid > 0) {
      const compSett = (data.settlements || []).find((s: any) => s.mode === 'Bill to Company');
      const arIdentifier = compSett?.debtorAccountId || 'Accounts Receivable';
      const arAcc = await resolveAccount(arIdentifier);
      if (!arAcc) throw new Error(`ACCOUNT_NOT_FOUND: ${arIdentifier}`);
      postLedgerEntry(ledgerBatch, arAcc, unpaid, true, `Unpaid Balance: ${data.guest || 'Walk-in'}`, id, date, balanceTracker);
    }

    // SETTLEMENTS
    for (const s of (data.settlements || [])) {
      if (!s.amount || s.amount <= 0) continue;
      let identifier: string;
      if (s.mode === 'Bill to Company') identifier = s.debtorAccountId || 'Accounts Receivable';
      else if (s.mode === 'Bill to Room') identifier = 'Accounts Receivable';
      else identifier = mapModeToAccount(s.mode, cfg);

      const acc = await resolveAccount(identifier);
      if (!acc) throw new Error(`SETTLEMENT_ACCOUNT_NOT_FOUND: ${identifier}`);

      let desc = `Settlement: ${s.mode}`;
      if (s.mode === 'Bill to Company') desc = `Settlement: Bill to Company - ${s.debtorName || 'Unnamed'} [Guest: ${data.guest}]`;
      else if (s.mode === 'Bill to Room') desc = `Settlement: Bill to Room - RM #${s.roomNumber || data.guest}`;
      postLedgerEntry(ledgerBatch, acc, s.amount, true, desc, id, date, balanceTracker);
    }

    // UPDATE ROOM STATUS
    if (data.roomNumber) {
      const rm = await db.query.rooms.findFirst({ where: eq(rooms.number, String(data.roomNumber)) });
      if (rm) await db.update(rooms).set({ status: 'Occupied' }).where(eq(rooms.id, rm.id));
    }

    // WRITE ALL IN DB (batch insert)
    await db.insert(sales).values(sale);
    if (ledgerBatch.length > 0) {
      await db.insert(ledgerEntries).values(ledgerBatch);
    }
    // Update account balances
    for (const [accId, newBal] of balanceTracker) {
      await db.update(accounts).set({ balance: newBal }).where(eq(accounts.id, accId));
    }

    revalidatePath('/');
    return { success: true, id };
  } catch (err: any) {
    console.error('SALE_TXN_CRASH:', err);
    return { success: false, error: err.message || 'SALE_TRANSACTION_FAILED' };
  }
}

// ─── PURCHASES / EXPENSES ─────────────────────────────────────────────────────

export const getPurchases = cache(async (from?: string, to?: string) => {
  const conditions = [];
  if (from) conditions.push(gte(expenses.date, from));
  if (to) conditions.push(lte(expenses.date, to));
  const list = conditions.length > 0
    ? await db.select().from(expenses).where(and(...conditions)).orderBy(desc(expenses.date))
    : await db.select().from(expenses).orderBy(desc(expenses.date));
  return serialize(list) as any[];
});

export async function getPurchaseReport(from?: string, to?: string) { return getPurchases(from, to); }

export async function postExpense(data: any) {
  await enforceAuth();
  await enforcePermission('expense.post');

  const user = await getCurrentUser();
  const cfg = await getConfig();
  const date = data.date || cfg?.businessDate || getInstitutionalDate();
  const totalAmount = data.items.reduce((s: number, i: any) => s + (parseFloat(i.amount) || 0), 0);
  const id = await getNextSequence('PJV');

  const expense = {
    ...data, id, date, amount: totalAmount, isVoided: false,
    createdBy: user?.id || 'SYSTEM',
    createdByName: user?.fullName || user?.email || 'System Operation',
    createdAt: new Date().toISOString(),
  };

  try {
    const ledgerBatch: any[] = [];
    const balanceTracker = new Map<string, number>();

    // REVERSE ORIGINAL IF MODIFYING
    if (data.originalId) {
      const origEntries = await db.select().from(ledgerEntries).where(eq(ledgerEntries.refId, data.originalId));
      const orig = await db.query.expenses.findFirst({ where: eq(expenses.id, data.originalId) });
      if (orig && !(orig as any).isVoided) {
        for (const entry of origEntries) {
          const acc = await resolveAccount(entry.accountId);
          if (acc) postLedgerEntry(ledgerBatch, acc, entry.debit || entry.credit, (entry.credit || 0) > 0, `MOD_VOID: Updated by ${id}`, data.originalId, date, balanceTracker);
        }
        await db.update(expenses).set({ isVoided: true, voidReason: `MODIFIED_BY_${id}` } as any).where(eq(expenses.id, data.originalId));
      }
    }

    // DEBIT EXPENSE ACCOUNTS
    for (const item of data.items) {
      const acc = await resolveAccount(item.category);
      if (acc) postLedgerEntry(ledgerBatch, acc, item.amount, true, `Pur: ${data.vendor} - ${item.note || ''}`, id, date, balanceTracker);
    }

    // VENDOR CREDIT (full invoice)
    const vendorAcc = await resolveAccount(data.vendorAccountId || 'Accounts Payable');
    if (!vendorAcc) throw new Error(`EXPENSE_VENDOR_ACCOUNT_NOT_FOUND: ${data.vendorAccountId || 'Accounts Payable'}`);
    postLedgerEntry(ledgerBatch, vendorAcc, totalAmount, false, `Purchase Invoice: ${data.vendor || 'Unknown'}`, id, date, balanceTracker);

    // SETTLEMENTS
    let settlements = data.settlements;
    if (!settlements || !Array.isArray(settlements) || settlements.length === 0) {
      settlements = [{ mode: data.payMode || data.paymentMode || 'Credit', amount: totalAmount, reference: data.reference || '' }];
    }
    for (const s of settlements) {
      if (!s.amount || s.amount <= 0) continue;
      const modeUpper = (s.mode || '').toUpperCase().trim();
      const isCredit = ['PAYABLE', 'CITY LEDGER', 'CREDIT'].includes(modeUpper);
      if (!isCredit) {
        const settlAcc = await resolveAccount(mapModeToAccount(s.mode, cfg));
        if (!settlAcc) throw new Error(`EXPENSE_SETTLEMENT_ACCOUNT_NOT_FOUND: ${s.mode}`);
        postLedgerEntry(ledgerBatch, vendorAcc, s.amount, true, `Payment (${s.mode}): ${data.vendor}`, id, date, balanceTracker);
        postLedgerEntry(ledgerBatch, settlAcc, s.amount, false, `Payment (${s.mode}): ${data.vendor}`, id, date, balanceTracker);
      }
    }

    await db.insert(expenses).values(expense);
    if (ledgerBatch.length > 0) await db.insert(ledgerEntries).values(ledgerBatch);
    for (const [accId, newBal] of balanceTracker) {
      await db.update(accounts).set({ balance: newBal }).where(eq(accounts.id, accId));
    }

    revalidatePath('/'); revalidatePath('/procurement-report');
    return { success: true, id };
  } catch (err: any) {
    console.error('EXPENSE_TXN_CRASH:', err);
    return { success: false, error: err.message || 'EXPENSE_TRANSACTION_FAILED' };
  }
}

// ─── VOID TRANSACTION ─────────────────────────────────────────────────────────

export async function voidTransaction(transactionId: string, type: 'SALE' | 'EXPENSE', reason: string) {
  await enforceAuth();
  await enforcePermission('admin.audit');

  const user = await getCurrentUser();
  const cfg = await getConfig();

  try {
    const record = type === 'SALE'
      ? await db.query.sales.findFirst({ where: eq(sales.id, transactionId) })
      : await db.query.expenses.findFirst({ where: eq(expenses.id, transactionId) });

    if (!record) throw new Error('TRANSACTION_NOT_FOUND');
    if ((record as any).isVoided) throw new Error('ALREADY_VOIDED');

    const origEntries = await db.select().from(ledgerEntries).where(eq(ledgerEntries.refId, transactionId));
    const ledgerBatch: any[] = [];
    const balanceTracker = new Map<string, number>();

    for (const entry of origEntries) {
      const acc = await resolveAccount(entry.accountId);
      if (!acc) continue;
      const isDebitRev = (entry.credit || 0) > 0;
      postLedgerEntry(ledgerBatch, acc, entry.debit || entry.credit, isDebitRev, `VOID: ${reason} (Ref: ${transactionId})`, transactionId, cfg?.businessDate || new Date().toISOString().split('T')[0], balanceTracker);
    }

    if (type === 'SALE') {
      await db.update(sales).set({ isVoided: true, voidReason: reason } as any).where(eq(sales.id, transactionId));
    } else {
      await db.update(expenses).set({ isVoided: true, voidReason: reason } as any).where(eq(expenses.id, transactionId));
    }

    if (ledgerBatch.length > 0) await db.insert(ledgerEntries).values(ledgerBatch);
    for (const [accId, newBal] of balanceTracker) {
      await db.update(accounts).set({ balance: newBal }).where(eq(accounts.id, accId));
    }

    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    console.error('VOID_TXN_FAILED:', err);
    return { success: false, error: err.message };
  }
}

// ─── NIGHT AUDIT ──────────────────────────────────────────────────────────────

export async function runNightAudit() {
  await enforceAuth();
  const cfg = await getConfig();
  if (!cfg) return { success: false, error: 'SYSTEM_CONFIG_NOT_FOUND' };
  const today = cfg.businessDate;

  const unpaidSales = await db.select().from(sales).where(and(eq(sales.status, 'Unpaid'), eq(sales.isVoided, false)));
  let auditRevenue = 0;
  const processedRooms: string[] = [];

  for (const sale of unpaidSales) {
    if (!sale.roomNumber) continue;
    const acc = await resolveAccount('Accommodation Charge');
    if (!acc) continue;
    const ledgerBatch: any[] = [];
    const balanceTracker = new Map<string, number>();
    postLedgerEntry(ledgerBatch, acc, sale.subtotal || 0, false, `Night Audit Rev`, sale.id, today, balanceTracker);
    const newItems = [...((sale.items as any) || []), { category: 'Accommodation Charge', amount: sale.subtotal, note: `Auto Audit [${today}]` }];
    await db.update(sales).set({ items: newItems } as any).where(eq(sales.id, sale.id));
    if (ledgerBatch.length > 0) await db.insert(ledgerEntries).values(ledgerBatch);
    for (const [accId, newBal] of balanceTracker) await db.update(accounts).set({ balance: newBal }).where(eq(accounts.id, accId));
    auditRevenue += sale.subtotal || 0;
    processedRooms.push(sale.roomNumber);
  }

  const nextDate = new Date(today);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextDateStr = nextDate.toISOString().split('T')[0];
  const systemDate = new Date().toISOString().split('T')[0];
  if (nextDateStr > systemDate) {
    return { success: false, error: `FUTURE_ROLLOVER_DENIED: Business date cannot exceed system date (${systemDate}).` };
  }

  const existing = await db.query.config.findFirst();
  if (existing) await db.update(configTable).set({ businessDate: nextDateStr }).where(eq(configTable.id, existing.id));

  revalidatePath('/');
  return { success: true, nextDate: nextDateStr };
}

// ─── DAY BOOK ────────────────────────────────────────────────────────────────

export async function getDayBook(from?: string, to?: string) {
  const [salesData, cfg, expensesData] = await Promise.all([
    getSales(from, to),
    getConfig(),
    db.select().from(expenses).where(and(
      gte(expenses.date, from || '1970-01-01'),
      lte(expenses.date, to || '2099-12-31')
    ))
  ]);

  const transactions = [
    ...salesData.map((s: any) => ({
      id: s.id, date: s.date, desc: `Sale: ${s.guest || 'Anonymous'}`, type: 'INFLOW',
      amount: s.amount, category: 'Sales', room: s.roomNumber,
      mode: Array.isArray(s.settlements) ? s.settlements.filter((st: any) => (st.amount || 0) > 0).map((st: any) => st.mode).join(', ') : (s.paymentMode || 'Cash'),
      isVoided: s.isVoided, source: s
    })),
    ...expensesData.map((e: any) => {
      const eAmt = parseFloat(e.amount) || ((e.items as any[])?.reduce((s: number, i: any) => s + (parseFloat(i.amount) || 0), 0) || 0);
      return {
        id: e.id, date: e.date, desc: `Expense: ${e.vendor || 'Unknown'}`, type: 'OUTFLOW',
        amount: eAmt, category: (e.items as any[])?.[0]?.category || e.category || 'Expenses', room: null,
        mode: Array.isArray(e.settlements) ? (e.settlements as any[]).filter((st: any) => (st.amount || 0) > 0).map((st: any) => st.mode).join(', ') : (e.payMode || e.paymentMode || 'Cash'),
        isVoided: (e as any).isVoided, source: e
      };
    })
  ].sort((a, b) => b.date.localeCompare(a.date));

  const inflow = salesData.filter((s: any) => !s.isVoided).reduce((sum: number, s: any) => sum + (s.amount || 0), 0);
  const outflow = expensesData.filter((e: any) => !(e as any).isVoided).reduce((sum: number, e: any) => sum + (parseFloat(e.amount) || 0), 0);

  return { transactions, summary: { openingBalance: 0, totalInflow: inflow, totalOutflow: outflow, closingBalance: inflow - outflow } };
}

export async function getDashboardStats() {
  const [accs, salesData, roomList] = await Promise.all([getAccounts(), getSales(), getRooms()]);
  const totalRevenue = accs.filter((a: any) => a.type === 'REVENUE').reduce((s: number, a: any) => s + (a.balance || 0), 0);
  const totalExpenses = accs.filter((a: any) => a.type === 'EXPENSE').reduce((s: number, a: any) => s + (a.balance || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const occupiedCount = roomList.filter((r: any) => r.status === 'Occupied').length;
  const occupancyRate = roomList.length > 0 ? (occupiedCount / roomList.length) * 100 : 0;
  return { totalRevenue, totalExpenses, netProfit, chartData: [], occupancyRate: occupancyRate.toFixed(1) + '%', roomsReady: roomList.filter((r: any) => r.status === 'Ready').length };
}

// ─── SYSTEM ADMIN ─────────────────────────────────────────────────────────────

export async function resetSystemData() {
  try {
    await db.delete(sales);
    await db.delete(expenses);
    await db.delete(ledgerEntries);
    await db.delete(auditLogs);
    await db.update(accounts).set({ balance: 0 });
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── GUEST DATABASE ───────────────────────────────────────────────────────────

export async function getGuestDatabase() {
  const salesData = await getSales();
  const guests: Record<string, any> = {};
  salesData.forEach((s: any) => {
    const gName = s.guest || 'ANONYMOUS SALES';
    if (!guests[gName]) {
      guests[gName] = { name: gName, phone: s.phone || 'N/A', lastVisit: s.date, totalTransacted: 0, history: [] };
    } else if (s.date > guests[gName].lastVisit) {
      guests[gName].lastVisit = s.date;
      if (s.phone) guests[gName].phone = s.phone;
    }
    guests[gName].totalTransacted += s.amount;
    guests[gName].history.push({ id: s.id, date: s.date, amount: s.amount, status: s.status || 'Paid', roomNumber: s.roomNumber, mode: s.paymentMode || s.settlements?.[0]?.mode, items: s.items || [], discount: s.discount || 0, sc: s.sc || 0, tax: s.tax || 0, subtotal: s.subtotal || 0, settlements: s.settlements || [] });
  });
  return Object.values(guests);
}

// ─── LEDGER ───────────────────────────────────────────────────────────────────

export async function getLedgerEntries(accountId: string) {
  const data = await db.select().from(ledgerEntries).where(eq(ledgerEntries.accountId, accountId)).orderBy(asc(ledgerEntries.date));
  return serialize(data);
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export async function getNotifications() {
  const list = await db.select().from(notifications).orderBy(desc(notifications.timestamp)).limit(20);
  return serialize(list) as any[];
}

export async function addNotification(type: string, message: string) {
  await db.insert(notifications).values({ timestamp: new Date().toISOString(), type, message, read: false });
  revalidatePath('/');
}

export async function markNotificationAsRead(id: string) {
  await db.update(notifications).set({ read: true }).where(eq(notifications.id, parseInt(id)));
  revalidatePath('/');
}

// ─── AUDIT LOGS ───────────────────────────────────────────────────────────────

export async function getAuditLogs() {
  const list = await db.select().from(auditLogs).orderBy(desc(auditLogs.date)).limit(10);
  return serialize(list) as any[];
}

// ─── SUPPLIERS ────────────────────────────────────────────────────────────────

export const getSuppliers = cache(async () => {
  const list = await db.select().from(suppliers).orderBy(asc(suppliers.name));
  return serialize(list) as any[];
});

export async function upsertSupplier(data: any) {
  const id = data.id || `SUP-${Date.now()}`;
  if (!data.accountId) {
    const accId = `ACC-${Date.now()}`;
    await upsertAccount({ id: accId, name: `Vendor Ledger: ${data.name}`, code: `VL-${id.substring(4)}`, type: 'LIABILITY', category: 'Accounts Payable', normal: 'Credit', parentId: 'ACC-2300', balance: data.openingBalance || 0, isActive: true });
    data.accountId = accId;
  }
  const existing = await db.query.suppliers.findFirst({ where: eq(suppliers.id, id) });
  if (existing) {
    await db.update(suppliers).set(data).where(eq(suppliers.id, id));
  } else {
    await db.insert(suppliers).values({ ...data, id });
  }
  revalidatePath('/purchase'); revalidatePath('/setup');
  return { success: true };
}

export async function deleteSupplier(id: string) {
  await db.delete(suppliers).where(eq(suppliers.id, id));
  revalidatePath('/purchase'); revalidatePath('/setup');
  return { success: true };
}

export async function getSupplierBalance(supplierName: string, accountId?: string) {
  let entries: any[];
  if (accountId) {
    entries = await db.select().from(ledgerEntries).where(eq(ledgerEntries.accountId, accountId));
  } else {
    const allEntries = await db.select().from(ledgerEntries).where(eq(ledgerEntries.accountId, '2300'));
    entries = allEntries.filter(e => e.description?.toUpperCase().includes(supplierName.toUpperCase()));
  }
  const totalDebit = entries.reduce((s, e) => s + (e.debit || 0), 0);
  const totalCredit = entries.reduce((s, e) => s + (e.credit || 0), 0);
  return totalCredit - totalDebit;
}

export async function postSupplierSettlement(data: { supplierName: string; accountId?: string; paymentMode: string; amount: number; date?: string; note?: string; }) {
  await enforceAuth();
  await enforcePermission('expense.post');
  const cfg = await getConfig();
  const date = data.date || cfg?.businessDate || getInstitutionalDate();
  const settlementAccountName = mapModeToAccount(data.paymentMode, cfg);
  const allAcc = await db.select().from(accounts);
  const paymentAccount = allAcc.find(a => a.name === settlementAccountName || a.id === settlementAccountName);
  if (!paymentAccount) throw new Error(`PAYMENT_ACCOUNT_NOT_FOUND: ${settlementAccountName}`);
  let liabilityAccountId = data.accountId;
  let liabilityAccountName = 'Accounts Payable';
  if (!liabilityAccountId) {
    const defaultLiab = allAcc.find(a => a.name === 'Accounts Payable' || a.id === '2300');
    liabilityAccountId = defaultLiab?.id || '2300';
    liabilityAccountName = defaultLiab?.name || 'Accounts Payable';
  } else {
    const custom = allAcc.find(a => a.id === liabilityAccountId);
    liabilityAccountName = custom?.name || 'Accounts Payable';
  }
  const items = [
    { accountId: liabilityAccountId, accountName: liabilityAccountName, description: `Settlement: Payment to ${data.supplierName} - ${data.note || ''}`, debit: data.amount, credit: 0 },
    { accountId: paymentAccount.id, accountName: paymentAccount.name, description: `Payment Settlement: ${data.supplierName} - ${data.note || ''}`, debit: 0, credit: data.amount }
  ];
  return postJV({ items, date });
}

export async function getSuppliersBySearch(query: string) {
  if (!query) return [];
  const all = await db.select().from(suppliers);
  const searchLower = query.toLowerCase();
  return serialize(all.filter(s => s.name?.toLowerCase().includes(searchLower) || s.phone?.includes(query)).slice(0, 10));
}

// ─── ACCOUNT CATEGORIES ───────────────────────────────────────────────────────

export async function getAccountCategories() {
  const list = await db.select().from(accountCategories);
  return serialize(list.sort((a, b) => (a.type || '').localeCompare(b.type || '') || (a.name || '').localeCompare(b.name || ''))) as any[];
}

export async function upsertAccountCategory(data: any) {
  const id = data.id || `CAT-${Date.now()}`;
  const existing = await db.query.accountCategories.findFirst({ where: eq(accountCategories.id, id) });
  if (existing) {
    await db.update(accountCategories).set(data).where(eq(accountCategories.id, id));
  } else {
    await db.insert(accountCategories).values({ ...data, id });
  }
  revalidatePath('/');
}

// ─── JOURNAL VOUCHER ─────────────────────────────────────────────────────────

export async function postJV(data: any) {
  const { items, date: dateOverride, entryType } = data;
  const totalDebit = items.reduce((s: number, e: any) => s + (parseFloat(e.debit) || 0), 0);
  const totalCredit = items.reduce((s: number, e: any) => s + (parseFloat(e.credit) || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) throw new Error('Unbalanced Journal: Debits must equal Credits.');

  let prefix = 'JV';
  if (entryType === 'PAYMENT') prefix = 'PMT';
  else if (entryType === 'RECEIPT') prefix = 'RV';
  else if (entryType === 'DEPOSIT') prefix = 'Contra';

  const cfg = await getConfig();
  const date = dateOverride || cfg?.businessDate || getInstitutionalDate();
  const refId = await getNextSequence(prefix);

  try {
    const ledgerBatch: any[] = [];
    const balanceTracker = new Map<string, number>();

    for (const entry of items) {
      const acc = await resolveAccount(entry.accountId);
      if (!acc) throw new Error(`ACCOUNT_NOT_FOUND: ${entry.accountId}`);
      postLedgerEntry(ledgerBatch, acc, entry.debit > 0 ? entry.debit : entry.credit, entry.debit > 0, entry.description || `JV Ref: ${refId}`, refId, date, balanceTracker);
    }

    if (ledgerBatch.length > 0) await db.insert(ledgerEntries).values(ledgerBatch);
    for (const [accId, newBal] of balanceTracker) {
      await db.update(accounts).set({ balance: newBal }).where(eq(accounts.id, accId));
    }
    revalidatePath('/');
    return { success: true, refId };
  } catch (err: any) {
    console.error('JV_TXN_CRASH:', err);
    return { success: false, error: err.message || 'JV_TRANSACTION_FAILED' };
  }
}

// ─── SEARCH ───────────────────────────────────────────────────────────────────

export async function globalSearch(query: string) {
  if (!query || query.length < 2) return [];
  const [roomList, salesData, accs] = await Promise.all([getRooms(), getSales(), getAccounts()]);
  const searchLower = query.toLowerCase();
  const results: any[] = [];
  roomList.filter((r: any) => r.number.includes(query) || r.type.toLowerCase().includes(searchLower)).forEach((r: any) => results.push({ type: 'ROOM', title: `Room ${r.number}`, sub: `${r.type} - ${r.status}`, href: '/housekeeping', icon: 'BedDouble' }));
  const guests = new Set<string>();
  salesData.filter((s: any) => s.guest?.toLowerCase().includes(searchLower)).forEach((s: any) => {
    if (!guests.has(s.guest!)) { guests.add(s.guest!); results.push({ type: 'GUEST', title: s.guest, sub: `Phone: ${s.phone || 'N/A'}`, href: '/guest-folio', icon: 'User' }); }
  });
  accs.filter((a: any) => a.name.toLowerCase().includes(searchLower) || a.code.includes(query)).forEach((a: any) => results.push({ type: 'ACCOUNT', title: a.name, sub: `${a.type} | Code: ${a.code}`, href: '/ledger', icon: 'BookCheck' }));
  return results.slice(0, 8);
}

// ─── SINGLE RECORD LOOKUPS ────────────────────────────────────────────────────

export async function getSaleById(id: string) {
  const row = await db.query.sales.findFirst({ where: eq(sales.id, id) });
  return serialize(row || null);
}

export async function getExpenseById(id: string) {
  const row = await db.query.expenses.findFirst({ where: eq(expenses.id, id) });
  return serialize(row || null);
}

export async function getJournalEntry(refId: string) {
  const data = await db.select().from(ledgerEntries).where(eq(ledgerEntries.refId, refId));
  if (data.length === 0) return serialize({ ref: refId, date: getInstitutionalDate(), memo: '', data: [] });
  return serialize({
    ref: data[0].refId,
    date: data[0].date,
    memo: data[0].description,
    data: data.map(d => ({ accountName: d.accountName, description: d.description, debit: d.debit, credit: d.credit }))
  });
}

export async function getLedger() { return getAccounts(); }

// ─── STANDARD ACCOUNTS SEED ───────────────────────────────────────────────────

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
    const id = `ACC-${acc.code}`;
    const existing = await db.query.accounts.findFirst({ where: eq(accounts.id, id) });
    if (existing) {
      await db.update(accounts).set({ name: acc.name, code: acc.code }).where(eq(accounts.id, id));
    } else {
      await db.insert(accounts).values({ ...acc, id, balance: 0, isActive: true });
    }
  }
  revalidatePath('/setup'); revalidatePath('/ledger');
  return { success: true };
}

// ─── GUEST PROFILES ───────────────────────────────────────────────────────────

export async function getGuestProfiles() {
  const salesData = await getSales();
  const unique = new Map<string, any>();
  salesData.forEach((s: any) => {
    const key = (s.guest || '').toUpperCase();
    if (s.guest && !unique.has(key)) {
      unique.set(key, { guest: s.guest, phone: s.phone, email: s.email, pan: s.pan, address: s.address, nationality: s.nationality, passportNo: s.passportNo, passportPlace: s.passportPlace, date: s.date, roomNumber: s.roomNumber, status: s.status });
    } else if (s.guest) {
      const ex = unique.get(key);
      if (s.date >= ex.date) { ex.roomNumber = s.roomNumber || ex.roomNumber; ex.status = s.status || ex.status; ex.date = s.date; }
    }
  });
  return serialize(Array.from(unique.values()));
}

// ─── DEBTORS ─────────────────────────────────────────────────────────────────

export const getDebtors = cache(async () => {
  const list = await db.select().from(debtors).orderBy(asc(debtors.name));
  return serialize(list) as any[];
});

export async function upsertDebtor(data: any) {
  const id = data.id || `DEB-${Date.now()}`;
  if (!data.accountId) {
    const accId = `ACC-${Date.now()}`;
    await upsertAccount({ id: accId, name: `City Ledger: ${data.name}`, code: `CL-${id.substring(4)}`, type: 'ASSET', category: 'Accounts Receivable', balance: data.openingBalance || 0, isActive: true });
    data.accountId = accId;
  }
  const existing = await db.query.debtors.findFirst({ where: eq(debtors.id, id) });
  if (existing) {
    await db.update(debtors).set(data).where(eq(debtors.id, id));
  } else {
    await db.insert(debtors).values({ ...data, id });
  }
  revalidatePath('/setup'); revalidatePath('/sales');
  return { success: true };
}

export async function deleteDebtor(id: string) {
  await db.delete(debtors).where(eq(debtors.id, id));
  revalidatePath('/setup'); revalidatePath('/sales');
  return { success: true };
}

// ─── EMPLOYEES ────────────────────────────────────────────────────────────────

export const getEmployees = cache(async () => {
  const list = await db.select().from(employees).orderBy(asc(employees.name));
  return serialize(list) as any[];
});

export async function upsertEmployee(data: any) {
  const id = data.id || `EMP-${Date.now()}`;
  const existing = await db.query.employees.findFirst({ where: eq(employees.id, id) });
  if (existing) {
    await db.update(employees).set(data).where(eq(employees.id, id));
  } else {
    await db.insert(employees).values({ ...data, id });
  }
  revalidatePath('/setup'); revalidatePath('/sales');
  return { success: true };
}

export async function deleteEmployee(id: string) {
  await db.delete(employees).where(eq(employees.id, id));
  revalidatePath('/setup'); revalidatePath('/sales');
  return { success: true };
}
