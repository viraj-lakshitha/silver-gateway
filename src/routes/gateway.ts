import express, { Router } from 'express';

import { resolvePrincipalForRoute } from '@auth/auth.middleware';
import type { ApiKeyPrincipal } from '@auth/principal';
import { logger } from '@config/logger';
import { HttpError, NotFoundError } from '@http/errors';
import { resolveRoute } from '@proxy/route.cache';
import { proxyServer } from '@proxy/proxy.server';

const router = Router();

const asyncHandler =
  (handler: express.RequestHandler): express.RequestHandler =>
  (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);

router.use(
  asyncHandler(async (req, res, next) => {
    const match = await resolveRoute(req.method, req.path);
    if (!match) {
      throw new NotFoundError('No proxy route matched the incoming request');
    }

    const { route } = match;

    await resolvePrincipalForRoute(req, route);

    logger.debug(
      { routeId: route.id, target: route.upstream.target, path: req.originalUrl },
      'Forwarding request to upstream'
    );

    const upstreamHeaders: Record<string, string> = {
      ...(route.upstream.headers ?? {})
    };

    const principalContext = req.principal;
    if (principalContext?.subject) {
      upstreamHeaders['x-principal-subject'] = principalContext.subject;
    }

    if (principalContext?.scopes.length) {
      upstreamHeaders['x-principal-scopes'] = principalContext.scopes.join(' ');
    }

    const apiKeyPrincipal = principalContext?.principals.find(
      (principal) => principal.source === 'api-key'
    ) as ApiKeyPrincipal | undefined;

    if (apiKeyPrincipal) {
      upstreamHeaders['x-api-key-id'] = apiKeyPrincipal.apiKey.displayId;
    }

    proxyServer.web(
      req,
      res,
      {
        target: route.upstream.target,
        changeOrigin: true,
        timeout: route.upstream.timeoutMs,
        proxyTimeout: route.upstream.timeoutMs,
        preserveHeaderKeyCase: true,
        headers: upstreamHeaders
      },
      (error) => {
        next(
          new HttpError(502, 'Upstream request failed', {
            routeId: route.id,
            message: error.message
          })
        );
      }
    );
  })
);

export default router;
