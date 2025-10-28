import type { ApiKeyDto } from '@auth/api-key.service';

import type { JWTPayload, JWSHeaderParameters } from 'jose';

export type PrincipalSource = 'api-key' | 'jwt';

export interface ApiKeyPrincipal {
  source: 'api-key';
  apiKey: ApiKeyDto;
  token: string;
}

export interface JwtPrincipal {
  source: 'jwt';
  payload: JWTPayload;
  header: JWSHeaderParameters;
  token: string;
}

export type Principal = ApiKeyPrincipal | JwtPrincipal;

export interface PrincipalContext {
  principals: Principal[];
  scopes: string[];
  subject?: string;
}

export const mergePrincipals = (principals: Principal[]): PrincipalContext => {
  const scopes = new Set<string>();
  let subject: string | undefined;

  for (const principal of principals) {
    if (principal.source === 'api-key') {
      principal.apiKey.scopes.forEach((scope) => scopes.add(scope));
    }
    if (principal.source === 'jwt') {
      const jwtScopes = principal.payload.scope ?? principal.payload.scp;
      if (typeof jwtScopes === 'string') {
        jwtScopes
          .split(/[\s,]+/)
          .map((scope) => scope.trim())
          .filter(Boolean)
          .forEach((scope) => scopes.add(scope));
      }
      if (typeof principal.payload.sub === 'string') {
        subject = principal.payload.sub;
      }
    }
  }

  return {
    principals,
    scopes: Array.from(scopes),
    subject
  };
};
