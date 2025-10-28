import express, { Router } from 'express';
import { ZodError } from 'zod';

import { ValidationError, NotFoundError } from '@http/errors';
import {
  issueApiKey,
  listApiKeys,
  getApiKey,
  updateApiKey,
  rotateApiKey,
  revokeApiKey
} from '@auth/api-key.service';
import {
  normalizeCreateApiKeyInput,
  normalizeUpdateApiKeyInput
} from '@auth/api-key.validation';
import {
  createRoute,
  deleteRoute,
  getRouteById,
  listRoutes,
  updateRoute
} from '@proxy/route.service';
import {
  normalizeRouteCreateInput,
  normalizeRouteUpdateInput
} from '@proxy/route.validation';

const router = Router();

const asyncHandler =
  (handler: express.RequestHandler): express.RequestHandler =>
  (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);

router.get(
  '/routes',
  asyncHandler(async (_req, res) => {
    const routes = await listRoutes();
    res.json({ data: routes });
  })
);

router.get(
  '/api-keys',
  asyncHandler(async (_req, res) => {
    const keys = await listApiKeys();
    res.json({ data: keys });
  })
);

router.get(
  '/api-keys/:id',
  asyncHandler(async (req, res) => {
    const key = await getApiKey(req.params.id);
    if (!key) {
      throw new NotFoundError('API key not found');
    }
    res.json({ data: key });
  })
);

router.post(
  '/api-keys',
  asyncHandler(async (req, res) => {
    try {
      const payload = normalizeCreateApiKeyInput(req.body);
      const result = await issueApiKey(payload);
      res.status(201).json({ data: result.apiKey, token: result.token });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Invalid API key payload', error.flatten());
      }
      throw error;
    }
  })
);

router.patch(
  '/api-keys/:id',
  asyncHandler(async (req, res) => {
    try {
      const payload = normalizeUpdateApiKeyInput(req.body);
      const updated = await updateApiKey(req.params.id, payload);
      res.json({ data: updated });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Invalid API key payload', error.flatten());
      }
      throw error;
    }
  })
);

router.post(
  '/api-keys/:id/rotate',
  asyncHandler(async (req, res) => {
    const result = await rotateApiKey(req.params.id);
    res.json({ data: result.apiKey, token: result.token });
  })
);

router.post(
  '/api-keys/:id/revoke',
  asyncHandler(async (req, res) => {
    const result = await revokeApiKey(req.params.id);
    res.json({ data: result });
  })
);

router.get(
  '/routes/:id',
  asyncHandler(async (req, res) => {
    const route = await getRouteById(req.params.id);
    if (!route) {
      throw new NotFoundError('Route not found');
    }
    res.json({ data: route });
  })
);

router.post(
  '/routes',
  asyncHandler(async (req, res) => {
    try {
      const payload = normalizeRouteCreateInput(req.body);
      const route = await createRoute(payload);
      res.status(201).json({ data: route });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Invalid route payload', error.flatten());
      }
      throw error;
    }
  })
);

router.patch(
  '/routes/:id',
  asyncHandler(async (req, res) => {
    try {
      const payload = normalizeRouteUpdateInput(req.body);
      if (Object.keys(payload).length === 0) {
        throw new ValidationError('No updatable fields provided');
      }

      const route = await updateRoute(req.params.id, payload);
      if (!route) {
        throw new NotFoundError('Route not found');
      }
      res.json({ data: route });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Invalid route payload', error.flatten());
      }
      throw error;
    }
  })
);

router.delete(
  '/routes/:id',
  asyncHandler(async (req, res) => {
    const deleted = await deleteRoute(req.params.id);
    if (!deleted) {
      throw new NotFoundError('Route not found');
    }
    res.status(204).send();
  })
);

export default router;
