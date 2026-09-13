import { getSession } from '@/lib/auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Manage kids',
  description: 'Manage your kids',
};

export default async function ManageKidsPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect('/');
  }

  if (session.user.userType !== 'PARENT') {
    redirect('/chores');
  }

  return null;
}
