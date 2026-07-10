const Database = require('better-sqlite3');
const db = new Database('data/sqlite.db');
const info = db.prepare("PRAGMA table_info(debtors)").all();
console.log(JSON.stringify(info, null, 2));
db.close();
