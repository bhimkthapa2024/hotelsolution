import Database from 'better-sqlite3';
import { hash } from '@node-rs/argon2';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'data/sqlite.db'));

async function resetPassword() {
  const newHash = await hash('admin123', { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 });
  
  // Reset ADMIN user password
  const result = db.prepare('UPDATE users SET password = ? WHERE username = ?').run(newHash, 'ADMIN');
  if (result.changes > 0) {
    console.log('✅ Password for ADMIN reset to: admin123');
  } else {
    console.log('⚠️  ADMIN user not found');
  }
  
  // Ensure config row exists
  const cfg = db.prepare('SELECT id FROM config').get();
  if (!cfg) {
    db.prepare('INSERT INTO config (hotel_name, business_date, tax_inclusive, apply_service_charge, apply_vat, vat_rate, service_charge_rate) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      'Hotel Vantage', new Date().toISOString().split('T')[0], 0, 1, 1, 13, 10
    );
    console.log('✅ Default config created');
  } else {
    console.log('✅ Config already exists');
  }

  console.log('\nUsers in DB:');
  const users = db.prepare('SELECT id, username, full_name FROM users').all();
  users.forEach((u: any) => console.log(' -', u.username, '/', u.full_name));

  db.close();
}

resetPassword().catch(console.error);
