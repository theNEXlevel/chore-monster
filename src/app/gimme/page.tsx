import { getSession } from '@/lib/auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Gimme',
  description: 'Gimme',
};

export default async function GimmePage() {
  const session = await getSession();

  if (!session?.user) {
    redirect('/');
  }

  if (session.user.userType !== 'CHILD') {
    redirect('/family');
  }

  return null;
}
