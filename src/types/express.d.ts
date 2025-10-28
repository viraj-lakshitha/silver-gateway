import type { PrincipalContext } from '@auth/principal';

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Request {
      principal?: PrincipalContext;
    }
  }
}

export {};
