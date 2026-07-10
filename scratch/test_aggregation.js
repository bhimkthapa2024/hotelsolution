const mockAccounts = [
  { id: '1', name: 'Parent Debit', normal: 'Debit', parentId: null, balance: 0 },
  { id: '2', name: 'Child Debit', normal: 'Debit', parentId: '1', balance: 100 },
  { id: '3', name: 'Child Credit', normal: 'Credit', parentId: '1', balance: 40 },
];

const balanceMap = new Map(mockAccounts.map(a => [a.id, a]));
const flatBalances = mockAccounts;
const memo = new Map();

const getAggBalance = (id) => {
  if (memo.has(id)) return memo.get(id);
  const acc = balanceMap.get(id);
  if (!acc) return 0;
  
  const children = flatBalances.filter(f => f.parentId === id);
  const childrenSum = children.reduce((sum, child) => sum + getAggBalance(child.id), 0);
  
  const total = acc.balance + childrenSum;
  memo.set(id, total);
  return total;
};

console.log("Aggregated Balance of Root (Parent Debit):", getAggBalance('1'));
// Expected if correct: 100 Debit - 40 Credit = 60 Debit.
// Current logic: 0 + 100 + 40 = 140.
