const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

const replacements = [
  { from: 'text-[0.35rem]', to: 'text-[0.5rem]' },
  { from: 'text-[0.4rem]', to: 'text-[0.55rem]' },
  { from: 'text-[0.45rem]', to: 'text-[0.6rem]' },
  { from: 'text-[0.5rem]', to: 'text-[0.65rem]' },
  { from: 'text-[0.55rem]', to: 'text-[0.7rem]' },
  { from: 'text-[0.6rem]', to: 'text-[0.75rem]' },
  { from: 'text-[0.65rem]', to: 'text-[0.8rem]' },
  { from: 'text-[0.7rem]', to: 'text-[0.85rem]' },
  { from: 'text-[0.8rem]', to: 'text-[0.95rem]' },
  // Also handle some specific ones in globals.css or other files if they use rem
  { from: 'font-size: 0.35rem', to: 'font-size: 0.5rem' },
  { from: 'font-size: 0.4rem', to: 'font-size: 0.55rem' },
  { from: 'font-size: 0.45rem', to: 'font-size: 0.6rem' },
  { from: 'font-size: 0.5rem', to: 'font-size: 0.65rem' },
  { from: 'font-size: 0.55rem', to: 'font-size: 0.7rem' },
  { from: 'font-size: 0.6rem', to: 'font-size: 0.75rem' },
  { from: 'font-size: 0.65rem', to: 'font-size: 0.8rem' },
  { from: 'font-size: 0.7rem', to: 'font-size: 0.85rem' },
  { from: 'font-size: 0.8rem', to: 'font-size: 0.95rem' },
];

walk('src', (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.css')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    replacements.forEach(r => {
      // Use regex to catch all instances
      const escapedFrom = r.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedFrom, 'g');
      content = content.replace(regex, r.to);
    });
    
    if (content !== original) {
      fs.writeFileSync(filePath, content);
      console.log(`Updated: ${filePath}`);
    }
  }
});

console.log('Scale Pass Completed.');
