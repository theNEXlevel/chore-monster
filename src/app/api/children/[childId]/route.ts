import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const childUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(320),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ childId: string }> }
) {
  const session = await getSession();

  if (!session?.user || session.user.userType !== 'PARENT') {
    return NextResponse.json(
      { error: 'Only parents can edit children' },
      { status: 403 }
    );
  }

  const parsedBody = childUpdateSchema.safeParse(await request.json());
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: 'Enter a valid name and email address' },
      { status: 400 }
    );
  }

  const { childId } = await params;
  const name = parsedBody.data.name;
  const email = parsedBody.data.email.toLowerCase();

  try {
    const updatedChild = await prisma.$transaction(async (transaction) => {
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

      const existingUser = await transaction.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existingUser && existingUser.id !== childId) {
        throw new Error('EMAIL_ALREADY_EXISTS');
      }

      const child = await transaction.user.update({
        where: { id: childId },
        data: { name, email },
        select: { id: true, name: true, email: true },
      });

      if (link.child.accounts.length === 0 && link.child.email !== email) {
        await transaction.verification.deleteMany({
          where: {
            value: childId,
            OR: [
              { identifier: { startsWith: 'reset-password:' } },
              { identifier: { startsWith: 'child-invite:' } },
            ],
          },
        });
      }

      return child;
    });

    return NextResponse.json(updatedChild);
  } catch (error) {
    if (error instanceof Error && error.message === 'CHILD_NOT_FOUND') {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    if (error instanceof Error && error.message === 'EMAIL_ALREADY_EXISTS') {
      return NextResponse.json(
        { error: 'A user with that email already exists' },
        { status: 409 }
      );
    }

    console.error('Error updating child:', error);
    return NextResponse.json(
      { error: 'Unable to update child. Please try again.' },
      { status: 500 }
    );
  }
}
