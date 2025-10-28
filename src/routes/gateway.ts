import crypto from 'node:crypto';

import express, { Router } from 'express';

import { resolvePrincipalForRoute } from '@auth/auth.middleware';
import type { ApiKeyPrincipal } from '@auth/principal';
import {
  buildPluginContext,
  executeErrorHooks,
  executePostHooks,
  executePreHooks
} from '@plugins/executor';
import { enqueueUsageLog } from '@analytics/usage-log.service';
import { logger } from '@config/logger';
import { HttpError, NotFoundError, TooManyRequestsError } from '@http/errors';
import { resolveRoute } from '@proxy/route.cache';
import { proxyServer } from '@proxy/proxy.server';
import { consumeRateLimit } from '@ratelimit/rate-limiter';

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
    const routeContext = {
      id: route.id,
      name: route.name,
      pattern: route.pattern,
      methods: Array.from(route.methods)
    };

    const startTime = process.hrtime.bigint();
    const requestId = req.header('x-request-id') ?? crypto.randomUUID();
    res.setHeader('x-request-id', requestId);

    const requestSize = Number.parseInt(req.header('content-length') ?? '0', 10) || 0;
    let executedProxy = false;

    const identifier = (() => {
      const apiKey = req.header('x-api-key');
      if (apiKey) {
        return `key:${apiKey}`;
      }
      const forwardedFor = req.header('x-forwarded-for');
      if (forwardedFor) {
        return `ip:${forwardedFor.split(',')[0]?.trim() ?? req.ip}`;
      }
      return `ip:${req.ip ?? req.socket.remoteAddress ?? 'unknown'}`;
    })();

    let usageLogged = false;

    const flushUsage = (durationMs: number, bytesOut: number) => {
      if (usageLogged) {
        return;
      }
      usageLogged = true;

      const principalSnapshot = req.principal;
      const apiKeyPrincipal = principalSnapshot?.principals.find(
        (principal) => principal.source === 'api-key'
      ) as ApiKeyPrincipal | undefined;

      enqueueUsageLog({
        routeId: route.id,
        method: req.method.toUpperCase(),
        statusCode: res.statusCode,
        durationMs,
        bytesIn: requestSize,
        bytesOut,
        principalId: principalSnapshot?.subject,
        principalSource: principalSnapshot?.principals[0]?.source,
        principalScopes: principalSnapshot?.scopes ?? [],
        apiKeyDisplayId: apiKeyPrincipal?.apiKey.displayId,
        requestId,
        timestamp: new Date()
      });
    };

    const getPluginBaseContext = () =>
      buildPluginContext(routeContext, {
        req,
        res,
        principal: req.principal,
        requestId,
        logger
      });

    res.on('finish', () => {
      const durationMs = Number((process.hrtime.bigint() - startTime) / 1_000_000n);
      const bytesOutHeader = res.getHeader('content-length');
      const bytesOut = bytesOutHeader ? Number(bytesOutHeader) || 0 : 0;

      if (executedProxy) {
        void executePostHooks(route.plugins.post, {
          ...getPluginBaseContext(),
          durationMs,
          bytesIn: requestSize,
          bytesOut,
          statusCode: res.statusCode
        });
      }

      flushUsage(durationMs, bytesOut);
    });

    try {
      await resolvePrincipalForRoute(req, route);

      const rateLimitResult = await consumeRateLimit({
        identifier,
        routeId: route.id,
        limit: route.rateLimit?.limit,
        windowSec: route.rateLimit?.windowSec
      });

      const resetSeconds = Math.max(1, Math.ceil(rateLimitResult.resetMs / 1000));

      res.setHeader('x-ratelimit-limit', rateLimitResult.limit.toString());
      res.setHeader('x-ratelimit-remaining', rateLimitResult.remaining.toString());
      res.setHeader('x-ratelimit-reset', resetSeconds.toString());

      if (!rateLimitResult.allowed) {
        res.setHeader('retry-after', resetSeconds.toString());
        throw new TooManyRequestsError('Rate limit exceeded', {
          identifier: crypto.createHash('sha1').update(identifier).digest('hex'),
          routeId: route.id
        });
      }

      await executePreHooks(route.plugins.pre, getPluginBaseContext());

      const principalContext = req.principal;
      const upstreamHeaders: Record<string, string> = {
        ...(route.upstream.headers ?? {})
      };

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

      logger.debug(
        { routeId: route.id, target: route.upstream.target, path: req.originalUrl },
        'Forwarding request to upstream'
      );

      executedProxy = true;
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
          void executeErrorHooks(route.plugins.error, {
            ...getPluginBaseContext(),
            error
          }).finally(() => {
            next(
              new HttpError(502, 'Upstream request failed', {
                routeId: route.id,
                message: error.message
              })
            );
          });
        }
      );
    } catch (error) {
      await executeErrorHooks(route.plugins.error, {
        ...getPluginBaseContext(),
        error
      });

      throw error;
    }
  })
);

export default router;
