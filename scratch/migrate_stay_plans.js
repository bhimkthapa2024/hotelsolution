const Database = require('better-sqlite3');
const db = new Database('data/sqlite.db');

try {
  db.prepare("ALTER TABLE config ADD COLUMN stay_plans TEXT").run();
  console.log('STAY PLANS COLUMN ADDED TO CONFIG TABLE');
  
  // Initialize with some defaults if empty
  const config = db.prepare('SELECT * FROM config LIMIT 1').get();
  if (config && !config.stay_plans) {
    const defaults = JSON.stringify([
      { id: 'EP', label: 'EP (ROOM ONLY)' },
      { id: 'CP', label: 'CP (BED & BREAKFAST)' },
      { id: 'MAP', label: 'MAP (HALF BOARD)' },
      { id: 'AP', label: 'AP (FULL BOARD)' }
    ]);
    db.prepare('UPDATE config SET stay_plans = ? WHERE id = ?').run(defaults, config.id);
    console.log('DEFAULT STAY PLANS INITIALIZED');
  }
} catch (e) {
  if (e.message.includes('duplicate column name')) {
    console.log('Column already exists');
  } else {
    console.error(e);
  }
}

db.close();
