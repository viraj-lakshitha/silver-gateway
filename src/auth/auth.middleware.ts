import { type Request } from 'express';

import { verifyApiKeyToken } from '@auth/api-key.service';
import { mergePrincipals, type Principal } from '@auth/principal';
import { verifyJwtToken } from '@auth/jwt.service';
import { UnauthorizedError } from '@http/errors';
import type { CompiledRoute } from '@proxy/route.cache';

const extractApiKeyToken = (req: Request): string | null => {
  const header = req.header('x-api-key') ?? req.header('x-api-key-id');
  if (header && header.trim().length > 0) {
    return header.trim();
  }

  return null;
};

const extractBearerToken = (req: Request): string | null => {
  const header = req.header('authorization');
  if (!header) return null;
  const match = /^Bearer\s+(?<token>.+)$/i.exec(header.trim());
  return match?.groups?.token ?? null;
};

export const resolvePrincipalForRoute = async (req: Request, route: CompiledRoute) => {
  const principals: Principal[] = [];
  const needsApiKey = route.authMode === 'apiKey' || route.authMode === 'both';
  const needsJwt = route.authMode === 'jwt' || route.authMode === 'both';

  if (!needsApiKey && !needsJwt) {
    req.principal = mergePrincipals([]);
    return;
  }

  if (needsApiKey) {
    const token = extractApiKeyToken(req);
    if (!token) {
      throw new UnauthorizedError('API key required');
    }

    const apiKey = await verifyApiKeyToken(token);
    if (!apiKey) {
      throw new UnauthorizedError('Invalid API key');
    }

    principals.push({
      source: 'api-key',
      apiKey,
      token
    });
  }

  if (needsJwt) {
    const token = extractBearerToken(req);
    if (!token) {
      throw new UnauthorizedError('Bearer token required');
    }

    const jwt = await verifyJwtToken(token);
    principals.push({
      source: 'jwt',
      payload: jwt.payload,
      header: jwt.header,
      token
    });
  }

  req.principal = mergePrincipals(principals);
};
