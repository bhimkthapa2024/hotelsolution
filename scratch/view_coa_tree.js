const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data/sqlite.db');
const db = new Database(dbPath);

const accounts = db.prepare('SELECT id, code, name, type, parent_id FROM accounts').all();

const buildTree = (parentId = null) => {
    return accounts
        .filter(a => a.parent_id === parentId)
        .map(a => ({
            ...a,
            children: buildTree(a.id)
        }));
};

const rootAccounts = buildTree(null);

const printTreeNode = (node, prefix = '', isLast = true) => {
    const marker = isLast ? '└── ' : '├── ';
    console.log(`${prefix}${marker}[${node.code}] ${node.name}`);
    
    if (node.children && node.children.length > 0) {
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        node.children.forEach((child, index) => {
            printTreeNode(child, newPrefix, index === node.children.length - 1);
        });
    }
};

const types = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

console.log('--- Chart of Accounts Registry Tree ---');
types.forEach(type => {
    const typeRoots = rootAccounts.filter(a => a.type === type);
    if (typeRoots.length > 0) {
        console.log(`\n[${type}]`);
        typeRoots.forEach((node, index) => {
            printTreeNode(node, '', index === typeRoots.length - 1);
        });
    }
});
db.close();

