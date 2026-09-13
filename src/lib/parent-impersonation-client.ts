import type { BetterAuthClientPlugin } from 'better-auth/client';
import type { parentImpersonation } from './parent-impersonation';

export const parentImpersonationClient = () =>
  ({
    id: 'parent-impersonation-client',
    $InferServerPlugin: {} as ReturnType<typeof parentImpersonation>,
    pathMethods: {
      '/parent/impersonate-child': 'POST',
    },
    atomListeners: [
      {
        matcher: (path: string): path is '/parent/impersonate-child' =>
          path === '/parent/impersonate-child',
        signal: '$sessionSignal',
      },
    ],
  }) satisfies BetterAuthClientPlugin;
