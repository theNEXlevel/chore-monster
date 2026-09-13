import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AddChildDialog } from './add-child-dialog';
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
      parentLinks: {
        orderBy: { createdAt: 'asc' },
        select: {
          child: {
            select: {
              id: true,
              name: true,
              accounts: {
                select: { id: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  const children = parent?.parentLinks.map(({ child }) => child) ?? [];

  return (
    <div className='px-4 py-8'>
      <div className='mb-4 flex items-center justify-between gap-4'>
        <h1 className='text-2xl font-bold'>Manage kids</h1>
        <AddChildDialog />
      </div>
      {children.length === 0 ? (
        <p>No child accounts are linked to your account yet.</p>
      ) : (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {children.map((child) => (
            <article
              key={child.id}
              className='flex flex-col justify-between gap-6 rounded-lg border p-5'
            >
              <div className='flex items-center justify-between gap-3'>
                <h2 className='text-lg font-semibold'>{child.name}</h2>
                {child.accounts.length === 0 && (
                  <span className='bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-medium'>
                    Pending
                  </span>
                )}
              </div>
              <ImpersonateChildButton
                childId={child.id}
                childName={child.name}
              />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
