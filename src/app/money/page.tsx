import { getSession } from '@/lib/auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Money',
  description: 'Manage your money',
};

export default async function MoneyPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect('/');
  }

  return null;
}
