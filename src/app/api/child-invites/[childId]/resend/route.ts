import { getSession } from '@/lib/auth';
import { sendChildInvitation } from '@/lib/child-invitations';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';

const invitePrefix = 'reset-password:';
const legacyInvitePrefix = 'child-invite:';
const inviteLifetime = 7 * 24 * 60 * 60 * 1000;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ childId: string }> }
) {
  const session = await getSession();

  if (!session?.user || session.user.userType !== 'PARENT') {
    return NextResponse.json(
      { error: 'Only parents can resend child invitations' },
      { status: 403 }
    );
  }

  const { childId } = await params;
  const origin = process.env.BETTER_AUTH_URL || new URL(request.url).origin;

  try {
    await prisma.$transaction(async (transaction) => {
      const link = await transaction.parentChild.findUnique({
        where: {
          parentId_childId: {
            parentId: session.user.id,
            childId,
          },
        },
        select: {
          child: {
            select: {
              id: true,
              name: true,
              email: true,
              userType: true,
              accounts: { select: { id: true }, take: 1 },
            },
          },
        },
      });

      if (!link || link.child.userType !== 'CHILD') {
        throw new Error('CHILD_NOT_FOUND');
      }

      if (link.child.accounts.length > 0) {
        throw new Error('CHILD_ALREADY_ACTIVE');
      }

      const currentInvite = await transaction.verification.findFirst({
        where: {
          identifier: { startsWith: invitePrefix },
          value: link.child.id,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });
      const legacyInvite = currentInvite
        ? null
        : await transaction.verification.findFirst({
            where: {
              identifier: { startsWith: legacyInvitePrefix },
              value: link.child.id,
              expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
          });
      let inviteToken =
        currentInvite?.identifier.slice(invitePrefix.length) ||
        legacyInvite?.identifier.slice(legacyInvitePrefix.length);

      if (!inviteToken) {
        inviteToken = randomBytes(32).toString('hex');
        await transaction.verification.deleteMany({
          where: {
            OR: [
              { identifier: { startsWith: invitePrefix } },
              { identifier: { startsWith: legacyInvitePrefix } },
            ],
            value: link.child.id,
          },
        });
        await transaction.verification.create({
          data: {
            identifier: `${invitePrefix}${inviteToken}`,
            value: link.child.id,
            expiresAt: new Date(Date.now() + inviteLifetime),
          },
        });
      } else if (legacyInvite && !currentInvite) {
        await transaction.verification.create({
          data: {
            identifier: `${invitePrefix}${inviteToken}`,
            value: link.child.id,
            expiresAt: legacyInvite.expiresAt,
          },
        });
      }

      await sendChildInvitation({
        childName: link.child.name,
        email: link.child.email,
        inviteToken,
        origin,
        parentName: session.user.name,
      });
    });

    return NextResponse.json({ message: 'Child invitation resent' });
  } catch (error) {
    if (error instanceof Error && error.message === 'CHILD_NOT_FOUND') {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    if (error instanceof Error && error.message === 'CHILD_ALREADY_ACTIVE') {
      return NextResponse.json(
        { error: 'This child has already accepted the invitation' },
        { status: 400 }
      );
    }

    console.error('Error resending child invitation:', error);
    return NextResponse.json(
      { error: 'Unable to resend the invitation. Please try again.' },
      { status: 500 }
    );
  }
}
