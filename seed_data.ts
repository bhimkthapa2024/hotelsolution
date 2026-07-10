import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { postSale, postExpense, getAccounts, getSuppliers } from './src/actions/hotel';

async function seed() {
  console.log("Seeding data...");
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

    // 5 Sales Entries
    const sales = [
      { guest: 'John Doe', amount: 5000, category: roomAcc.name, mode: 'Cash', date: '2026-06-20' },
      { guest: 'Jane Smith', amount: 8500, category: restAcc.name, mode: 'Card', date: '2026-06-20' },
      { guest: 'Alice Johnson', amount: 12000, category: roomAcc.name, mode: 'Bank Transfer', date: '2026-06-21' },
      { guest: 'Bob Williams', amount: 3000, category: restAcc.name, mode: 'Cash', date: '2026-06-21' },
      { guest: 'Charlie Brown', amount: 15000, category: roomAcc.name, mode: 'Card', date: '2026-06-21' },
    ];

    for (let i = 0; i < sales.length; i++) {
       const s = sales[i];
       const form = {
         guest: s.guest, phone: '1234567890', email: '', pan: '', address: '', roomNumber: `10${i+1}`,
         amount: s.amount, tax: 0, sc: 0, subtotal: s.amount, discount: 0, applySC: false, applyVat: false,
         status: 'Paid', paymentMode: s.mode, plan: 'EP',
         items: [{ category: s.category, rate: s.amount, qty: 1, amount: s.amount, note: 'Seeded Sale', roomNumber: `10${i+1}` }],
         settlements: [{ mode: s.mode, amount: s.amount, reference: 'TXN-'+Date.now(), debtorId: '', debtorName: '', debtorAccountId: '' }],
         date: s.date
       };
       await postSale(form);
       console.log(`Posted Sale ${i+1}: ${s.guest}`);
    }

    // 5 Purchase Entries
    const purchases = [
      { vendor: suppliers[0], amount: 10000, item: 'Groceries', mode: 'Cash', date: '2026-06-20' },
      { vendor: suppliers[1], amount: 25000, item: 'Beverages', mode: 'Cheque', date: '2026-06-20' },
      { vendor: suppliers[2], amount: 5000, item: 'Stationery', mode: 'Cash', date: '2026-06-21' },
      { vendor: suppliers[3], amount: 45000, item: 'Meat Supply', mode: 'Bank Transfer', date: '2026-06-21' },
      { vendor: suppliers[4], amount: 12000, item: 'Dairy Products', mode: 'Card', date: '2026-06-21' },
    ];

    for (let i = 0; i < purchases.length; i++) {
       const p = purchases[i];
       const form = {
         vendor: p.vendor.name, vendorAccountId: p.vendor.accountId, billNo: `BILL-${Date.now()}-${i}`,
         amount: p.amount, subtotal: p.amount, discount: 0, tax: 0, vatEnabled: false,
         status: 'Paid', paymentMode: p.mode, category: foodAcc.name, date: p.date, note: 'Seeded Purchase',
         items: [{ item: p.item, category: foodAcc.name, amount: p.amount, qty: 1, rate: p.amount }],
         settlements: [{ mode: p.mode, amount: p.amount, reference: 'REF-'+Date.now() }]
       };
       await postExpense(form);
       console.log(`Posted Purchase ${i+1}: ${p.vendor.name}`);
    }

    console.log("Seeding complete!");

  } catch(e) {
    console.error("Error:", e);
  }
}
seed();
