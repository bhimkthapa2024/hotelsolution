/**
 * migrate.ts — Run once to add missing columns to the existing SQLite DB
 * Run: npx tsx scripts/migrate.ts
 */
import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'data/sqlite.db'));

function addColumnIfMissing(table: string, column: string, definition: string) {
  const cols: any[] = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.find(c => c.name === column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
    console.log(`✅ Added column ${table}.${column}`);
  } else {
    console.log(`   Skipped: ${table}.${column} already exists`);
  }
}

console.log('🔧 Running migrations...\n');

// Config table — add missing columns
addColumnIfMissing('config', 'spa_menu_items', 'TEXT');
addColumnIfMissing('config', 'stay_plans', 'TEXT');
addColumnIfMissing('config', 'payment_modes', 'TEXT');
addColumnIfMissing('config', 'display', 'TEXT');

// Expenses table — add is_voided and void_reason
addColumnIfMissing('expenses', 'is_voided', 'INTEGER DEFAULT 0');
addColumnIfMissing('expenses', 'void_reason', 'TEXT');
addColumnIfMissing('expenses', 'voided_at', 'TEXT');
addColumnIfMissing('expenses', 'created_by', 'TEXT');
addColumnIfMissing('expenses', 'created_by_name', 'TEXT');
addColumnIfMissing('expenses', 'created_at', 'TEXT');
addColumnIfMissing('expenses', 'settlements', 'TEXT');
addColumnIfMissing('expenses', 'vendor_account_id', 'TEXT');
addColumnIfMissing('expenses', 'original_id', 'TEXT');

// Sales table — add any missing columns
addColumnIfMissing('sales', 'created_by', 'TEXT');
addColumnIfMissing('sales', 'created_by_name', 'TEXT');
addColumnIfMissing('sales', 'created_at', 'TEXT');
addColumnIfMissing('sales', 'discount', 'REAL DEFAULT 0');
addColumnIfMissing('sales', 'original_id', 'TEXT');
addColumnIfMissing('sales', 'voided_at', 'TEXT');

// Ledger entries
addColumnIfMissing('ledger_entries', 'voided', 'INTEGER DEFAULT 0');

console.log('\n✅ Migration complete!');
db.close();
