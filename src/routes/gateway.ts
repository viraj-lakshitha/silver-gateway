import crypto from 'node:crypto';

import express, { Router } from 'express';

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

    logger.debug(
      { routeId: route.id, target: route.upstream.target, path: req.originalUrl },
      'Forwarding request to upstream'
    );

    proxyServer.web(
      req,
      res,
      {
        target: route.upstream.target,
        changeOrigin: true,
        timeout: route.upstream.timeoutMs,
        proxyTimeout: route.upstream.timeoutMs,
        preserveHeaderKeyCase: true,
        headers: route.upstream.headers
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
