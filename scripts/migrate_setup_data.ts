import admin from 'firebase-admin';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const firestore = admin.firestore();
const sqlite = new Database(path.join(process.cwd(), 'data/sqlite.db'));

async function migrate() {
  console.log("Migrating config, accounts, rooms, categories to Firestore...");

  // Config
  const configs = sqlite.prepare('SELECT * FROM config').all();
  for (const c of configs as any[]) {
    if (c.id === 1) { // main config
      await firestore.collection('config').doc('main').set({
        id: 'main',
        hotelName: c.hotel_name,
        address: c.address,
        phone: c.phone,
        email: c.email,
        businessDate: new Date().toISOString().split('T')[0], // SET TO TODAY!
        paymentModes: c.payment_modes ? JSON.parse(c.payment_modes) : [],
        display: c.display ? JSON.parse(c.display) : null,
        taxInclusive: c.tax_inclusive === 1,
        applyServiceCharge: c.apply_service_charge === 1,
        applyVat: c.apply_vat === 1,
        vatRate: c.vat_rate,
        serviceChargeRate: c.service_charge_rate,
        stayPlans: c.stay_plans ? JSON.parse(c.stay_plans) : [],
        spaMenuItems: c.spa_menu_items ? JSON.parse(c.spa_menu_items) : [],
      });
      console.log('Config migrated and date set to today.');
    }
  }

  // Accounts
  const accounts = sqlite.prepare('SELECT * FROM accounts').all();
  for (const a of accounts as any[]) {
    await firestore.collection('accounts').doc(a.id).set({
      id: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      category: a.category,
      normal: a.normal,
      balance: a.balance || 0,
      creditLimit: a.credit_limit || 0,
      parentId: a.parent_id,
      isActive: a.is_active === 1,
    });
  }
  console.log(`Migrated ${accounts.length} accounts.`);

  // Account Categories
  try {
    const cats = sqlite.prepare('SELECT * FROM account_categories').all();
    for (const c of cats as any[]) {
      await firestore.collection('accountCategories').doc(c.id).set(c);
    }
    console.log(`Migrated ${cats.length} categories.`);
  } catch(e) {}

  // Rooms
  const rooms = sqlite.prepare('SELECT * FROM rooms').all();
  for (const r of rooms as any[]) {
    await firestore.collection('rooms').doc(r.id).set({
      id: r.id,
      number: r.number,
      type: r.type,
      floor: r.floor,
      status: r.status,
      rate: r.rate || 0,
      lastIn: r.last_in,
      lastOut: r.last_out,
    });
  }
  console.log(`Migrated ${rooms.length} rooms.`);

  console.log('Setup data migration complete!');
}

migrate().catch(console.error).finally(() => process.exit(0));
