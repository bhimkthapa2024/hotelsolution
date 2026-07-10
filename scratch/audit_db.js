
const { db } = require('./src/lib/db');
const schema = require('./src/drizzle/schema');
const { eq, gte, lte, and } = require('drizzle-orm');

async function audit() {
  const cfg = await db.select().from(schema.config).limit(1);
  console.log('--- SYSTEM CONFIG ---');
  console.log('Business Date:', cfg[0]?.businessDate);

  const sales = await db.select().from(schema.sales);
  console.log('\n--- SALES TOTAL ---');
  console.log('Count:', sales.length);
  
  const ledgers = await db.select().from(schema.ledgerEntries);
  console.log('\n--- LEDGER ENTRIES ---');
  console.log('Count:', ledgers.length);

  const trialBalance = ledgers.reduce((acc, e) => {
    acc[e.accountName] = (acc[e.accountName] || 0) + (e.debit || 0) - (e.credit || 0);
    return acc;
  }, {});
  console.log('\n--- CALCULATED TRIAL BALANCE (RAW) ---');
  console.log(trialBalance);
}

audit().catch(console.error);
