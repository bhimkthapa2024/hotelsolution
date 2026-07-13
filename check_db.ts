import { db } from './src/lib/db';

async function main() {
  const configSnap = await db.collection('config').get();
  console.log("Configs:", configSnap.docs.map(d => d.data()));
  
  const salesSnap = await db.collection('sales').get();
  console.log("Total sales:", salesSnap.size);
  const sales = salesSnap.docs.map(d => d.data());
  sales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  console.log("Recent 2 sales:", sales.slice(0, 2));
}

main().catch(console.error).finally(() => process.exit(0));
