import { APIError } from 'better-auth';
import {
  createAuthEndpoint,
  getAuthoritativeSessionFromCtx,
} from 'better-auth/api';
import { deleteSessionCookie, setSessionCookie } from 'better-auth/cookies';
import { parseUserOutput } from 'better-auth/db';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const impersonateChildBodySchema = z.object({
  userId: z.string(),
});

export const parentImpersonation = () => ({
  id: 'parent-impersonation',
  version: '1.0.0',
  endpoints: {
    impersonateChild: createAuthEndpoint(
      '/parent/impersonate-child',
      {
        method: 'POST',
        requireHeaders: true,
        body: impersonateChildBodySchema,
        metadata: {
          openapi: {
            operationId: 'impersonateChild',
            summary: 'Impersonate a linked child',
            description: 'Create an impersonation session for a linked child.',
          },
        },
      },
      async (ctx) => {
        const session = await getAuthoritativeSessionFromCtx(ctx);

        if (!session) {
          throw APIError.fromStatus('UNAUTHORIZED');
        }

        if (session.session.impersonatedBy) {
          throw APIError.fromStatus('FORBIDDEN');
        }

        const parent = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { userType: true },
        });

        if (parent?.userType !== 'PARENT') {
          throw APIError.fromStatus('FORBIDDEN');
        }

        const child = await ctx.context.internalAdapter.findUserById(
          ctx.body.userId
        );
        const persistedChild = child
          ? await prisma.user.findUnique({
              where: { id: child.id },
              select: { userType: true },
            })
          : null;

        if (!child || persistedChild?.userType !== 'CHILD') {
          throw APIError.fromStatus('NOT_FOUND');
        }

        const link = await prisma.familyMember.findFirst({
          where: {
            userId: child.id,
            family: { members: { some: { userId: session.user.id } } },
          },
        });

        if (!link) {
          throw APIError.fromStatus('FORBIDDEN');
        }

        const impersonationSession =
          await ctx.context.internalAdapter.createSession(
            child.id,
            true,
            {
              impersonatedBy: session.user.id,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
            true
          );

        if (!impersonationSession) {
          throw APIError.fromStatus('INTERNAL_SERVER_ERROR');
        }

        const authCookies = ctx.context.authCookies;
        deleteSessionCookie(ctx);
        const dontRememberMeCookie = await ctx.getSignedCookie(
          authCookies.dontRememberToken.name,
          ctx.context.secret
        );
        const parentCookie = ctx.context.createAuthCookie('admin_session');

        await ctx.setSignedCookie(
          parentCookie.name,
          `${session.session.token}:${dontRememberMeCookie || ''}`,
          ctx.context.secret,
          authCookies.sessionToken.attributes
        );
        await setSessionCookie(
          ctx,
          { session: impersonationSession, user: child },
          true
        );

        return ctx.json({
          session: impersonationSession,
          user: parseUserOutput(ctx.context.options, child),
        });
      }
    ),
  },
});
