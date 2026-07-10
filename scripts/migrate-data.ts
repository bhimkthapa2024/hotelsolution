import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../src/drizzle/schema';
import * as fs from 'fs';
import * as path from 'path';

const DB_FILE = 'legacy/db.json';
const SQLITE_FILE = 'data/sqlite.db';

if (!fs.existsSync(DB_FILE)) {
  console.error('legacy/db.json not found!');
  process.exit(1);
}

const legacyData = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
const sqlite = new Database(SQLITE_FILE);
const db = drizzle(sqlite, { schema });

async function migrate() {
  console.log('Starting migration...');

  // 1. Config
  if (legacyData.config) {
    console.log('Migrating config...');
    await db.insert(schema.config).values({
      hotelName: legacyData.config.hotelName || 'LUXURY HOTEL LTD',
      address: legacyData.config.address,
      phone: legacyData.config.phone,
      email: legacyData.config.email,
      businessDate: legacyData.config.businessDate || new Date().toISOString().split('T')[0],
      paymentModes: legacyData.config.paymentModes,
      display: legacyData.config.display,
    });
  }

  // 2. Accounts
  if (legacyData.accounts && legacyData.accounts.length > 0) {
    console.log(`Migrating ${legacyData.accounts.length} accounts...`);
    await db.insert(schema.accounts).values(legacyData.accounts.map((a: any) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      category: a.category,
      normal: a.normal,
      balance: parseFloat(a.balance || 0),
      creditLimit: parseFloat(a.creditLimit || 0),
    })));
  }

  // 3. Rooms
  if (legacyData.rooms && legacyData.rooms.length > 0) {
    console.log(`Migrating ${legacyData.rooms.length} rooms...`);
    await db.insert(schema.rooms).values(legacyData.rooms.map((r: any) => ({
      id: r.id,
      number: r.number,
      type: r.type,
      floor: r.floor,
      status: r.status,
      rate: parseFloat(r.rate || 0),
      lastIn: r.lastIn,
      lastOut: r.lastOut,
    })));
  }

  // 4. Sales
  if (legacyData.sales && legacyData.sales.length > 0) {
    console.log(`Migrating ${legacyData.sales.length} sales...`);
    await db.insert(schema.sales).values(legacyData.sales.map((s: any) => ({
      id: s.id,
      date: s.date,
      guest: s.guest,
      phone: s.phone,
      email: s.email,
      pan: s.pan,
      address: s.address,
      amount: parseFloat(s.amount || 0),
      tax: parseFloat(s.tax || 0),
      sc: parseFloat(s.sc || 0),
      subtotal: parseFloat(s.subtotal || 0),
      status: s.status,
      paymentMode: s.paymentMode,
      roomNumber: s.roomNumber ? s.roomNumber.toString() : null,
      items: s.items,
      settlements: s.settlements,
    })));
  }

  // 5. Expenses
  if (legacyData.expenses && legacyData.expenses.length > 0) {
    console.log(`Migrating ${legacyData.expenses.length} expenses...`);
    await db.insert(schema.expenses).values(legacyData.expenses.map((e: any) => ({
      id: e.id,
      date: e.date,
      vendor: e.vendor,
      amount: parseFloat(e.amount || 0),
      category: e.category,
      payMode: e.payMode,
      status: e.status,
    })));
  }

  // 6. Audit Logs
  if (legacyData.auditLogs && legacyData.auditLogs.length > 0) {
    console.log(`Migrating ${legacyData.auditLogs.length} audit logs...`);
    await db.insert(schema.auditLogs).values(legacyData.auditLogs.map((l: any) => ({
      date: l.date,
      auditRevenue: parseFloat(l.auditRevenue || 0),
      totalSales: parseFloat(l.totalSales || 0),
      totalExpenses: parseFloat(l.totalExpenses || 0),
      timestamp: l.timestamp,
    })));
  }

  console.log('Migration complete!');
  sqlite.close();
}

migrate().catch(console.error);
