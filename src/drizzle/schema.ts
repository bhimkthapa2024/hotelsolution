import { sqliteTable, text, real, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const config = sqliteTable('config', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  hotelName: text('hotel_name').notNull(),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  businessDate: text('business_date').notNull(),
  paymentModes: text('payment_modes', { mode: 'json' }), // array of {label, account}
  display: text('display', { mode: 'json' }), // {font, size, color}
  taxInclusive: integer('tax_inclusive', { mode: 'boolean' }).default(false),
  applyServiceCharge: integer('apply_service_charge', { mode: 'boolean' }).default(true),
  applyVat: integer('apply_vat', { mode: 'boolean' }).default(true),
  vatRate: real('vat_rate').default(13),
  serviceChargeRate: real('service_charge_rate').default(10),
  stayPlans: text('stay_plans', { mode: 'json' }), // array of {id, label}
  spaMenuItems: text('spa_menu_items', { mode: 'json' }), // array of {id, name, rate}
});

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  type: text('type').notNull(), // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  category: text('category'),
  normal: text('normal').notNull(), // Debit, Credit
  balance: real('balance').notNull().default(0),
  creditLimit: real('credit_limit').default(0),
  parentId: text('parent_id'), // Enables linking sub-accounts to master Account Heads
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});

export const rooms = sqliteTable('rooms', {
  id: text('id').primaryKey(),
  number: text('number').notNull().unique(),
  type: text('type').notNull(),
  floor: text('floor'),
  status: text('status').notNull().default('Ready'), // Ready, Dirty, Occupied
  rate: real('rate').notNull().default(0),
  lastIn: text('last_in'),
  lastOut: text('last_out'),
});

export const sales = sqliteTable('sales', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  guest: text('guest'),
  phone: text('phone'),
  email: text('email'),
  pan: text('pan'),
  address: text('address'),
  amount: real('amount').notNull().default(0),
  tax: real('tax').notNull().default(0),
  sc: real('sc').notNull().default(0),
  subtotal: real('subtotal').notNull().default(0),
  status: text('status').notNull().default('Unpaid'),
  paymentMode: text('payment_mode'),
  roomNumber: text('room_number'),
  items: text('items', { mode: 'json' }), // Array<{category, amount, note}>
  settlements: text('settlements', { mode: 'json' }), // Array<{mode, amount, status, date, debtor?}>
  pax: text('pax'),
  nationality: text('nationality'),
  arrivalDate: text('arrival_date'),
  departureDate: text('departure_date'),
  plan: text('plan'), // EP, CP, MAP, AP
  passportNo: text('passport_no'),
  passportIssue: text('passport_issue'),
  passportExpiry: text('passport_expiry'),
  passportPlace: text('passport_place'),
  isVoided: integer('is_voided', { mode: 'boolean' }).default(false),
  voidReason: text('void_reason'),
});

export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  vendor: text('vendor'),
  amount: real('amount').notNull().default(0),
  category: text('category'),
  payMode: text('pay_mode'),
  status: text('status').default('Paid'),
  items: text('items', { mode: 'json' }), // Array<{category, amount, note}>
  note: text('note'),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  auditRevenue: real('audit_revenue').notNull().default(0),
  totalSales: real('total_sales').notNull().default(0),
  totalExpenses: real('total_expenses').notNull().default(0),
  timestamp: text('timestamp').notNull(),
  details: text('details', { mode: 'json' }), // Array of room numbers processed
});

export const housekeepingLogs = sqliteTable('housekeeping_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  roomNumber: text('room_number').notNull(),
  prevStatus: text('prev_status'),
  newStatus: text('new_status').notNull(),
  actionedBy: text('actioned_by').default('SYSTEM'),
  timestamp: text('timestamp').notNull(),
  note: text('note'),
});

export const ledgerEntries = sqliteTable('ledger_entries', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  accountId: text('account_id').notNull(),
  accountName: text('account_name').notNull(),
  description: text('description').notNull(),
  refId: text('ref_id'), // Link to sale_id or expense_id
  debit: real('debit').notNull().default(0),
  credit: real('credit').notNull().default(0),
  balanceAfter: real('balance_after').notNull().default(0),
  createdAt: text('created_at').notNull().default('2026-04-17T00:00:00.000Z'), // Satisfy SQLite ALTER TABLE with constant default
});

export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  timestamp: text('timestamp').notNull(),
  type: text('type').notNull(), // INFO, WARN, ALARM
  message: text('message').notNull(),
  read: integer('read', { mode: 'boolean' }).notNull().default(false),
});

export const accountCategories = sqliteTable('account_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
});
// --- AUTH & RBAC SYSTEM ---

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(), // Hashed
  fullName: text('full_name'),
  email: text('email').unique(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastLogin: text('last_login'),
  createdAt: text('created_at').notNull(),
});

export const sessions = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  expiresAt: integer('expires_at').notNull(),
});

export const roles = sqliteTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(), // e.g., 'ADMIN', 'RECEPTIONIST'
  description: text('description'),
});

export const permissions = sqliteTable('permissions', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(), // e.g., 'view_reports', 'edit_inventory'
  description: text('description'),
});

export const rolePermissions = sqliteTable('role_permissions', {
  roleId: text('role_id').notNull().references(() => roles.id),
  permissionId: text('permission_id').notNull().references(() => permissions.id),
}, (table) => [
  primaryKey({ columns: [table.roleId, table.permissionId] })
]);

export const userRoles = sqliteTable('user_roles', {
  userId: text('user_id').notNull().references(() => users.id),
  roleId: text('role_id').notNull().references(() => roles.id),
}, (table) => [
  primaryKey({ columns: [table.userId, table.roleId] })
]);

export const debtors = sqliteTable('debtors', {
  id: text('id').primaryKey(), // DEB-123
  name: text('name').notNull(),
  type: text('type').notNull(), // CORPORATE, AGENT, INDIVIDUAL
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  pan: text('pan'),
  creditLimit: real('credit_limit').default(0),
  creditDays: integer('credit_days').default(30),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  accountId: text('account_id'),
  contactPerson: text('contact_person'),
  openingBalance: real('opening_balance').default(0),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const suppliers = sqliteTable('suppliers', {
  id: text('id').primaryKey(), // SUP-123
  name: text('name').notNull(),
  type: text('type').notNull().default('VENDOR'), // VENDOR, CONTRACTOR, etc.
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  pan: text('pan'),
  contactPerson: text('contact_person'),
  openingBalance: real('opening_balance').default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  accountId: text('account_id'),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const employees = sqliteTable('employees', {
  id: text('id').primaryKey(), // EMP-123
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  commissionRate: real('commission_rate').notNull().default(10), // standard percentage, e.g., 10%
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});
