import { getSales, getPeriodBalances, getConfig, getCashFlowReport, getDebtors, getSuppliers, getEmployees } from '@/actions/hotel';
import { getCurrentUser } from '@/actions/auth';
import ReportsClient from './ReportsClient';
import { differenceInDays, subDays, format } from 'date-fns';

import { Suspense } from 'react';

export default async function ReportsServer() {
  const todayDate = new Date().toISOString().split('T')[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  
  const initialDateRange = { from: firstDay, to: todayDate };

  // Calculate previous period for MoM
  const fromDate = new Date(initialDateRange.from);
  const toDate = new Date(initialDateRange.to);
  const diffDays = differenceInDays(toDate, fromDate) + 1;
  const prevTo = subDays(fromDate, 1);
  const prevFrom = subDays(prevTo, diffDays - 1);
  const prevRange = {
     from: format(prevFrom, 'yyyy-MM-dd'),
     to: format(prevTo, 'yyyy-MM-dd')
  };

  const [config, user] = await Promise.all([
    getConfig(),
    getCurrentUser()
  ]);

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Loading Reports Engine...</div>}>
      <ReportsClient 
        initialConfig={config}
        initialUser={user}
        initialDateRange={initialDateRange}
      />
    </Suspense>
  );
}
