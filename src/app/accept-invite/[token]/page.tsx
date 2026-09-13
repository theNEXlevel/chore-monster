import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AcceptInviteForm } from './accept-invite-form';

export const metadata: Metadata = {
  title: 'Accept invitation',
  description: 'Set up your Chore Monster account',
};

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await prisma.verification.findFirst({
    where: {
      identifier: `reset-password:${token}`,
      expiresAt: { gt: new Date() },
    },
  });
  const child = invitation
    ? await prisma.user.findUnique({
        where: { id: invitation.value },
        select: { name: true, email: true, userType: true },
      })
    : null;

  return (
    <div className='flex min-h-[calc(100dvh-8.4rem)] items-center justify-center px-4'>
      <div className='w-full max-w-sm space-y-6 rounded-lg border p-6 shadow-xs'>
        {child?.userType === 'CHILD' ? (
          <>
            <div className='space-y-1 text-center'>
              <h1 className='text-2xl font-bold'>Join Chore Monster</h1>
              <p className='text-muted-foreground text-sm'>
                Set a password for your child account to get started.
              </p>
            </div>
            <AcceptInviteForm
              email={child.email}
              name={child.name}
              token={token}
            />
          </>
        ) : (
          <div className='space-y-3 text-center'>
            <h1 className='text-2xl font-bold'>Invitation unavailable</h1>
            <p className='text-muted-foreground text-sm'>
              This invitation is invalid or has expired. Ask your parent to send
              another invitation.
            </p>
            <Link href='/signin' className='text-primary underline'>
              Go to sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
