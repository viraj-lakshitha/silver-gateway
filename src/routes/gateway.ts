import express, { Router } from 'express';

import { logger } from '../config/logger';
import { HttpError, NotFoundError } from '../http/errors';
import { proxyServer } from '../proxy/proxy.server';
import { resolveRoute } from '../proxy/route.cache';

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
