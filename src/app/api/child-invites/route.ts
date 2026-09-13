import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import React from 'react';
import { Resend } from 'resend';
import { z } from 'zod';
import { ChildInvitationTemplate } from '@/components/email-templates/child-invitation';

const from = process.env.RESEND_FROM_EMAIL || 'Chore Monster <noreply@c4g.dev>';
const childInviteBodySchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(320),
});

let resendClient: Resend | null = null;

function getResendClient() {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

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
  const identifier = `child-invite:${token}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const origin = process.env.BETTER_AUTH_URL || new URL(request.url).origin;
  const inviteUrl = new URL(`/accept-invite/${token}`, origin).toString();

  try {
    const resend = getResendClient();

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

      const { error } = await resend.emails.send({
        from,
        to: [email],
        subject: `${session.user.name} invited you to Chore Monster`,
        react: React.createElement(ChildInvitationTemplate, {
          childName: name,
          parentName: session.user.name,
          inviteUrl,
        }),
      });

      if (error) {
        throw new Error(error.message || 'Unable to send invitation email');
      }
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
