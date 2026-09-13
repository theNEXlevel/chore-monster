import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const familyNameSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export async function PATCH(request: Request) {
  const session = await getSession();

  if (!session?.user || session.user.userType !== 'PARENT') {
    return NextResponse.json(
      { error: 'Only parents can update the family name' },
      { status: 403 }
    );
  }

  const parsedBody = familyNameSchema.safeParse(await request.json());
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: 'Enter a family name between 1 and 100 characters' },
      { status: 400 }
    );
  }

  const familyMembership = await prisma.familyMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
    select: { familyId: true },
  });

  if (!familyMembership) {
    return NextResponse.json({ error: 'Family not found' }, { status: 404 });
  }

  const family = await prisma.family.update({
    where: { id: familyMembership.familyId },
    data: { name: parsedBody.data.name },
    select: { name: true },
  });

  return NextResponse.json(family);
}
