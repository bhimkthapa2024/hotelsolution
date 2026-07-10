import { getRooms, getConfig, getAccounts, getGuestProfiles, getDebtors, getEmployees } from '@/actions/hotel';
import SalesClient from './SalesClient';

export const dynamic = 'force-dynamic';

export default async function SalesEntryServer() {
  // Fetch all data instantly on the server
  const [
    rooms, 
    config, 
    accounts, 
    guestProfiles, 
    debtors, 
    employees
  ] = await Promise.all([
    getRooms(), 
    getConfig(), 
    getAccounts(), 
    getGuestProfiles(), 
    getDebtors(), 
    getEmployees()
  ]);

  return (
    <SalesClient 
      initialRooms={rooms}
      initialConfig={config}
      initialAccounts={accounts}
      initialGuestProfiles={guestProfiles}
      initialDebtors={debtors}
      initialEmployees={employees}
    />
  );
}
