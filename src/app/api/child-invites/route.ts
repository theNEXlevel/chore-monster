import { getSession } from '@/lib/auth';
import { sendChildInvitation } from '@/lib/child-invitations';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const invitePrefix = 'reset-password:';
const childInviteBodySchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(320),
});

export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.user || session.user.userType !== 'PARENT') {
    return NextResponse.json(
      { error: 'Only parents can add children' },
      {
        status: 403,
      }
    );
  }

  const parsedBody = childInviteBodySchema.safeParse(await request.json());
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: 'Enter a valid name and email address' },
      { status: 400 }
    );
  }

  const name = parsedBody.data.name;
  const email = parsedBody.data.email.toLowerCase();
  const token = randomBytes(32).toString('hex');
  const identifier = `${invitePrefix}${token}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const origin = process.env.BETTER_AUTH_URL || new URL(request.url).origin;

  try {
    await prisma.$transaction(async (transaction) => {
      const existingUser = await transaction.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingUser) {
        throw new Error('A user with that email already exists');
      }

      const child = await transaction.user.create({
        data: {
          name,
          email,
          userType: 'CHILD',
        },
      });

      await transaction.parentChild.create({
        data: {
          parentId: session.user.id,
          childId: child.id,
        },
      });

      await transaction.verification.create({
        data: {
          identifier,
          value: child.id,
          expiresAt,
        },
      });

      await sendChildInvitation({
        childName: name,
        email,
        inviteToken: token,
        origin,
        parentName: session.user.name,
      });
    });

    return NextResponse.json({ message: 'Child invitation sent' });
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    console.error('Error creating child invitation:', error);
    return NextResponse.json(
      { error: 'Unable to send the child invitation. Please try again.' },
      { status: 500 }
    );
  }
}
