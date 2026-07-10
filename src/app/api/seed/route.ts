import { NextResponse } from 'next/server';
import { postSale, postExpense, getAccounts, getSuppliers } from '@/actions/hotel';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const accs = await getAccounts();
    const parentIds = new Set(accs.filter((acc: any) => acc.parentId).map((acc: any) => acc.parentId));
    
    // Revenue Accounts
    const postables = accs.filter((acc: any) => acc.type === 'REVENUE' && !parentIds.has(acc.id));
    const roomAcc = postables.find((acc: any) => acc.name.toUpperCase().includes('ROOM')) || postables[0];
    const restAcc = postables.find((acc: any) => acc.name.toUpperCase().includes('RESTAURANT')) || postables[0];
    
    // Suppliers
    const suppliers = await getSuppliers();
    
    // Purchase Accounts
    const expAccs = accs.filter((acc: any) => acc.type === 'EXPENSE' && !parentIds.has(acc.id));
    const foodAcc = expAccs.find((acc: any) => acc.name.toUpperCase().includes('FOOD')) || expAccs[0];

    // 5 Sales Entries with different settlement logic
    const sales = [
      { guest: 'John Doe', amount: 5000, category: roomAcc.name, status: 'Paid', sMode: 'Cash', sAmount: 5000, date: '2026-06-20' },
      { guest: 'Jane Smith', amount: 8500, category: restAcc.name, status: 'Paid', sMode: 'Cash', sAmount: 8500, date: '2026-06-20' },
      { guest: 'Alice Johnson', amount: 12000, category: roomAcc.name, status: 'Unpaid', sMode: 'Bill to Company', sAmount: 12000, date: '2026-06-21' },
      { guest: 'Bob Williams', amount: 3000, category: restAcc.name, status: 'Partial', sMode: 'Cash', sAmount: 1000, date: '2026-06-21' },
      { guest: 'Charlie Brown', amount: 15000, category: roomAcc.name, status: 'Paid', sMode: 'Cash', sAmount: 15000, date: '2026-06-21' },
    ];

    for (let i = 0; i < sales.length; i++) {
       const s = sales[i];
       const form = {
         guest: s.guest, phone: '1234567890', email: '', pan: '', address: '', roomNumber: `10${i+1}`,
         amount: s.amount, tax: 0, sc: 0, subtotal: s.amount, discount: 0, applySC: false, applyVat: false,
         status: s.status, paymentMode: s.sMode, plan: 'EP',
         items: [{ category: s.category, rate: s.amount, qty: 1, amount: s.amount, note: 'Seeded Sale', roomNumber: `10${i+1}` }],
         settlements: [{ mode: s.sMode, amount: s.sAmount, reference: 'TXN-'+Date.now(), debtorId: '', debtorName: 'Demo Company', debtorAccountId: '2100' }], // 2100 is typically AR
         date: s.date
       };
       await postSale(form);
    }

    // 5 Purchase Entries
    const purchases = [
      { vendor: suppliers[0], amount: 10000, item: 'Groceries', status: 'Paid', pMode: 'Cash', pAmount: 10000, date: '2026-06-20' },
      { vendor: suppliers[1], amount: 25000, item: 'Beverages', status: 'Paid', pMode: 'Cash', pAmount: 25000, date: '2026-06-20' },
      { vendor: suppliers[2], amount: 5000, item: 'Stationery', status: 'Unpaid', pMode: 'Credit', pAmount: 0, date: '2026-06-21' },
      { vendor: suppliers[3], amount: 45000, item: 'Meat Supply', status: 'Unpaid', pMode: 'Credit', pAmount: 0, date: '2026-06-21' },
      { vendor: suppliers[4], amount: 12000, item: 'Dairy Products', status: 'Partial', pMode: 'Cash', pAmount: 5000, date: '2026-06-21' },
    ];

    for (let i = 0; i < purchases.length; i++) {
       const p = purchases[i];
       const form = {
         vendor: p.vendor.name, vendorAccountId: p.vendor.accountId, billNo: `BILL-${Date.now()}-${i}`,
         amount: p.amount, subtotal: p.amount, discount: 0, tax: 0, vatEnabled: false,
         status: p.status, paymentMode: p.pMode, category: foodAcc.name, date: p.date, note: 'Seeded Purchase',
         items: [{ item: p.item, category: foodAcc.name, amount: p.amount, qty: 1, rate: p.amount }],
         settlements: p.pAmount > 0 ? [{ mode: p.pMode, amount: p.pAmount, reference: 'REF-'+Date.now() }] : []
       };
       await postExpense(form);
    }

    return NextResponse.json({ success: true, message: 'Seeded successfully' });

  } catch(e: any) {
    console.error(e);
    return NextResponse.json({ success: false, error: e.message, stack: e.stack }, { status: 500 });
  }
}
