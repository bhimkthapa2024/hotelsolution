/**
 * seed_local_admin.ts
 * Creates tables and seeds the initial admin user into local SQLite.
 * Run: npx tsx seed_local_admin.ts
 */
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './src/drizzle/schema';
import { users, roles, permissions, userRoles, rolePermissions } from './src/drizzle/schema';
import { eq } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data/sqlite.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
const db = drizzle(sqlite, { schema });

// Create all tables from schema (if not exists)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hotel_name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    business_date TEXT NOT NULL,
    payment_modes TEXT,
    display TEXT,
    tax_inclusive INTEGER DEFAULT 0,
    apply_service_charge INTEGER DEFAULT 1,
    apply_vat INTEGER DEFAULT 1,
    vat_rate REAL DEFAULT 13,
    service_charge_rate REAL DEFAULT 10,
    stay_plans TEXT,
    spa_menu_items TEXT
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT,
    normal TEXT NOT NULL,
    balance REAL NOT NULL DEFAULT 0,
    credit_limit REAL DEFAULT 0,
    parent_id TEXT,
    is_active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    number TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    floor TEXT,
    status TEXT NOT NULL DEFAULT 'Ready',
    rate REAL NOT NULL DEFAULT 0,
    last_in TEXT,
    last_out TEXT
  );

  CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    guest TEXT,
    phone TEXT,
    email TEXT,
    pan TEXT,
    address TEXT,
    amount REAL NOT NULL DEFAULT 0,
    tax REAL NOT NULL DEFAULT 0,
    sc REAL NOT NULL DEFAULT 0,
    subtotal REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Unpaid',
    payment_mode TEXT,
    room_number TEXT,
    items TEXT,
    settlements TEXT,
    pax TEXT,
    nationality TEXT,
    arrival_date TEXT,
    departure_date TEXT,
    plan TEXT,
    passport_no TEXT,
    passport_issue TEXT,
    passport_expiry TEXT,
    passport_place TEXT,
    is_voided INTEGER DEFAULT 0,
    void_reason TEXT
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    vendor TEXT,
    amount REAL NOT NULL DEFAULT 0,
    category TEXT,
    pay_mode TEXT,
    status TEXT DEFAULT 'Paid',
    items TEXT,
    note TEXT
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    audit_revenue REAL NOT NULL DEFAULT 0,
    total_sales REAL NOT NULL DEFAULT 0,
    total_expenses REAL NOT NULL DEFAULT 0,
    timestamp TEXT NOT NULL,
    details TEXT
  );

  CREATE TABLE IF NOT EXISTS housekeeping_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    room_number TEXT NOT NULL,
    prev_status TEXT,
    new_status TEXT NOT NULL,
    actioned_by TEXT DEFAULT 'SYSTEM',
    timestamp TEXT NOT NULL,
    note TEXT
  );

  CREATE TABLE IF NOT EXISTS ledger_entries (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    account_id TEXT NOT NULL,
    account_name TEXT NOT NULL,
    description TEXT NOT NULL,
    ref_id TEXT,
    debit REAL NOT NULL DEFAULT 0,
    credit REAL NOT NULL DEFAULT 0,
    balance_after REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT '2026-01-01T00:00:00.000Z'
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    read INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS account_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    full_name TEXT,
    email TEXT UNIQUE,
    is_active INTEGER NOT NULL DEFAULT 1,
    last_login TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS role_permissions (
    role_id TEXT NOT NULL REFERENCES roles(id),
    permission_id TEXT NOT NULL REFERENCES permissions(id),
    PRIMARY KEY (role_id, permission_id)
  );

  CREATE TABLE IF NOT EXISTS user_roles (
    user_id TEXT NOT NULL REFERENCES users(id),
    role_id TEXT NOT NULL REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
  );

  CREATE TABLE IF NOT EXISTS debtors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    pan TEXT,
    credit_limit REAL DEFAULT 0,
    credit_days INTEGER DEFAULT 30,
    is_active INTEGER NOT NULL DEFAULT 1,
    account_id TEXT,
    contact_person TEXT,
    opening_balance REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'VENDOR',
    phone TEXT,
    email TEXT,
    address TEXT,
    pan TEXT,
    contact_person TEXT,
    opening_balance REAL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    account_id TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    commission_rate REAL NOT NULL DEFAULT 10,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

const ALL_PERMISSIONS = [
  { id: 'admin.root', code: 'admin.root', description: 'UNRESTRICTED_ACCESS: SYSTEM_OVERRIDE' },
  { id: 'admin.audit', code: 'admin.audit', description: 'Authority to close business day' },
  { id: 'dashboard.view', code: 'dashboard.view', description: 'Access to analytics and summary metrics' },
  { id: 'setup.manage', code: 'setup.manage', description: 'Configure property, inventory, and accounts' },
  { id: 'users.manage', code: 'users.manage', description: 'Authorize operators and define authority tiers' },
  { id: 'sales.post', code: 'sales.post', description: 'Post new entries to guest folios' },
  { id: 'expense.post', code: 'expense.post', description: 'Post new procurement expenses' },
  { id: 'sales.void', code: 'sales.void', description: 'Reverse or cancel existing folio entries' },
  { id: 'reception.checkin', code: 'reception.checkin', description: 'Process guest arrivals' },
  { id: 'reception.checkout', code: 'reception.checkout', description: 'Process departures' },
  { id: 'housekeeping.view', code: 'housekeeping.view', description: 'View real-time room readiness registry' },
  { id: 'housekeeping.update', code: 'housekeeping.update', description: 'Modify room hygiene states' },
  { id: 'housekeeping.audit', code: 'housekeeping.audit', description: 'Generate hygiene status reports' },
  { id: 'reports.view', code: 'reports.view', description: 'Access financial audits' },
  { id: 'ledger.view', code: 'ledger.view', description: 'Access ledger and journal entries' },
];

async function seed() {
  console.log('🌱 Seeding local SQLite database...\n');

  // 1. Seed roles
  const adminRole = { id: 'R-ADMIN', name: 'ADMINISTRATOR', description: 'FULL SYSTEM OVERRIDE ACCESS' };
  const existing = sqlite.prepare('SELECT id FROM roles WHERE id = ?').get('R-ADMIN');
  if (!existing) {
    sqlite.prepare('INSERT INTO roles (id, name, description) VALUES (?, ?, ?)').run(adminRole.id, adminRole.name, adminRole.description);
    console.log('✓ Created R-ADMIN role');
  } else {
    console.log('✓ R-ADMIN role already exists');
  }

  // 2. Seed permissions
  for (const p of ALL_PERMISSIONS) {
    sqlite.prepare('INSERT OR IGNORE INTO permissions (id, code, description) VALUES (?, ?, ?)').run(p.id, p.code, p.description);
  }
  console.log(`✓ Seeded ${ALL_PERMISSIONS.length} permissions`);

  // 3. Link all permissions to ADMIN role
  for (const p of ALL_PERMISSIONS) {
    const ex = sqlite.prepare('SELECT * FROM role_permissions WHERE role_id = ? AND permission_id = ?').get('R-ADMIN', p.id);
    if (!ex) {
      sqlite.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)').run('R-ADMIN', p.id);
    }
  }
  console.log('✓ Linked all permissions to R-ADMIN role');

  // 4. Create admin user
  const ADMIN_USERNAME = 'admin';
  const ADMIN_PASSWORD = 'admin123';
  const hashedPassword = await hash(ADMIN_PASSWORD, { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 });

  const existingUser = sqlite.prepare('SELECT id FROM users WHERE username = ?').get(ADMIN_USERNAME);
  const adminId = 'USR-ADMIN';

  if (!existingUser) {
    sqlite.prepare('INSERT INTO users (id, username, password, full_name, email, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      adminId, ADMIN_USERNAME, hashedPassword, 'System Administrator', 'admin@hotel.local', 1, new Date().toISOString()
    );
    console.log(`✓ Created admin user: "${ADMIN_USERNAME}" / "${ADMIN_PASSWORD}"`);
  } else {
    // Update password
    sqlite.prepare('UPDATE users SET password = ? WHERE username = ?').run(hashedPassword, ADMIN_USERNAME);
    console.log(`✓ Admin user already exists — password reset to "${ADMIN_PASSWORD}"`);
  }

  // 5. Assign R-ADMIN role to admin user
  const userId = (sqlite.prepare('SELECT id FROM users WHERE username = ?').get(ADMIN_USERNAME) as any)?.id;
  if (userId) {
    const ex = sqlite.prepare('SELECT * FROM user_roles WHERE user_id = ? AND role_id = ?').get(userId, 'R-ADMIN');
    if (!ex) {
      sqlite.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)').run(userId, 'R-ADMIN');
    }
    console.log('✓ Assigned R-ADMIN role to admin user');
  }

  // 6. Seed default config if none
  const configCheck = sqlite.prepare('SELECT id FROM config').get();
  if (!configCheck) {
    sqlite.prepare(`INSERT INTO config (hotel_name, business_date, tax_inclusive, apply_service_charge, apply_vat, vat_rate, service_charge_rate) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      'Hotel Vantage', new Date().toISOString().split('T')[0], 0, 1, 1, 13, 10
    );
    console.log('✓ Created default hotel config');
  }

  console.log('\n✅ Database seeded successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Login credentials:');
  console.log('  Username : admin');
  console.log('  Password : admin123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  sqlite.close();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
