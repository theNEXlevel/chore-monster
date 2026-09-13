import { getSession } from '@/lib/auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Chores',
  description: 'Manage your chores',
};

export default async function ChoresPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect('/');
  }

  return (
    <div className='px-4 py-8'>
      <h1 className='mb-4 text-2xl font-bold'>Chores</h1>
      <p>This is your chores page!</p>
    </div>
  );
}
