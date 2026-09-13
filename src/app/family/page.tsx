import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AddChildDialog } from '../manage-kids/add-child-dialog';
import { ChildActionsMenu } from '../manage-kids/child-actions-menu';
import { FamilyNameEditor } from './family-name-editor';

export const metadata: Metadata = {
  title: 'Family',
  description: 'Manage your family',
};

export default async function FamilyPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect('/');
  }

  if (session.user.userType !== 'PARENT') {
    redirect('/chores');
  }

  const family = await prisma.family.findFirst({
    where: { members: { some: { userId: session.user.id } } },
    orderBy: { createdAt: 'asc' },
    select: {
      name: true,
      members: {
        where: { user: { userType: 'CHILD' } },
        orderBy: { createdAt: 'asc' },
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
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

  const children = family?.members.map(({ user }) => user) ?? [];
  const familyName = family?.name || 'My Family';

  return (
    <div className='px-4 py-8'>
      <div className='mb-4 flex items-center justify-between gap-4'>
        <FamilyNameEditor initialName={familyName} />
        <AddChildDialog />
      </div>
      {children.length === 0 ? (
        <p>No child accounts are linked to your family yet.</p>
      ) : (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {children.map((child) => (
            <article
              key={child.id}
              className='flex flex-col justify-between gap-6 rounded-lg border p-5'
            >
              <div className='flex items-start justify-between gap-3'>
                <h2 className='text-lg font-semibold'>{child.name}</h2>
                <ChildActionsMenu
                  childId={child.id}
                  childName={child.name}
                  childEmail={child.email}
                  isPending={child.accounts.length === 0}
                />
              </div>
              {child.accounts.length === 0 && (
                <span className='bg-muted text-muted-foreground w-fit rounded-full px-2.5 py-0.5 text-xs font-medium'>
                  Pending
                </span>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
