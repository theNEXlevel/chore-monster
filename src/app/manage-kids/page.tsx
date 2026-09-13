import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ImpersonateChildButton } from './impersonate-child-button';

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

  const parent = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      childLinks: {
        orderBy: { createdAt: 'asc' },
        select: {
          child: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  const children = parent?.childLinks.map(({ child }) => child) ?? [];

  return (
    <div className='px-4 py-8'>
      <h1 className='mb-4 text-2xl font-bold'>Manage kids</h1>
      {children.length === 0 ? (
        <p>No child accounts are linked to your account yet.</p>
      ) : (
        <ul className='space-y-3'>
          {children.map((child) => (
            <li
              key={child.id}
              className='flex items-center justify-between rounded-lg border p-4'
            >
              <div>
                <p className='font-medium'>{child.name}</p>
                <p className='text-muted-foreground text-sm'>{child.email}</p>
              </div>
              <ImpersonateChildButton
                childId={child.id}
                childName={child.name}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
