import { NextResponse } from 'next/server';
import { getAccounts } from '@/actions/hotel';

export async function GET() {
  const accounts = await getAccounts();
  const revenues = accounts.filter((a: any) => a.type === 'REVENUE');
  return NextResponse.json({ revenues });
}
