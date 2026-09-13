import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';

const familyInviteAlphabet =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function generateFamilyInviteCode() {
  const bytes = randomBytes(6);
  return Array.from(bytes, (byte) =>
    familyInviteAlphabet.charAt(byte % familyInviteAlphabet.length)
  ).join('');
}

export async function createFamilyForUser(userId: string) {
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      return await prisma.$transaction(async (transaction) =>
        transaction.family.create({
          data: {
            inviteCode: generateFamilyInviteCode(),
            members: { create: { userId } },
          },
        })
      );
    } catch (error) {
      if (
        !(
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 'P2002'
        )
      ) {
        throw error;
      }
    }
  }

  throw new Error('Unable to generate a unique family invite code');
}
