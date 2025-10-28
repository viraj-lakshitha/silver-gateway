import { invalidateRouteCache } from '@proxy/route.cache';
import { RouteModel, Route } from '@proxy/route.model';
import type {
  NormalizedRouteInput,
  NormalizedRouteUpdateInput
} from '@proxy/route.validation';

import type { HydratedDocument } from 'mongoose';

export interface RouteDto {
  id: string;
  name: string;
  description?: string | null;
  pattern: string;
  methods: string[];
  authMode: Route['authMode'];
  enabled: boolean;
  priority: number;
  upstream: Route['upstream'];
  createdAt: Date;
  updatedAt: Date;
}

const toDto = (route: HydratedDocument<Route>): RouteDto => ({
  id: route.id,
  name: route.name,
  description: route.description,
  pattern: route.pattern,
  methods: route.methods,
  authMode: route.authMode,
  enabled: route.enabled,
  priority: route.priority,
  upstream: route.upstream,
  createdAt: route.createdAt,
  updatedAt: route.updatedAt
});

export const listRoutes = async (): Promise<RouteDto[]> => {
  const routes = await RouteModel.find().sort({ priority: -1, updatedAt: -1 }).exec();
  return routes.map(toDto);
};

export const listActiveRoutes = async (): Promise<RouteDto[]> => {
  const routes = await RouteModel.find({ enabled: true })
    .sort({ priority: -1, updatedAt: -1 })
    .exec();
  return routes.map(toDto);
};

export const getRouteById = async (id: string): Promise<RouteDto | null> => {
  const route = await RouteModel.findById(id).exec();
  return route ? toDto(route) : null;
};

export const createRoute = async (input: NormalizedRouteInput): Promise<RouteDto> => {
  const route = await RouteModel.create({
    ...input
  });

  invalidateRouteCache();
  return toDto(route);
};

export const updateRoute = async (
  id: string,
  input: NormalizedRouteUpdateInput
): Promise<RouteDto | null> => {
  const setPayload: Record<string, unknown> = {};
  const unsetPayload: Record<string, 1> = {};

  if (input.name !== undefined) setPayload.name = input.name;
  if (input.description !== undefined) setPayload.description = input.description;
  if (input.pattern !== undefined) setPayload.pattern = input.pattern;
  if (input.methods !== undefined) setPayload.methods = input.methods;
  if (input.authMode !== undefined) setPayload.authMode = input.authMode;
  if (input.enabled !== undefined) setPayload.enabled = input.enabled;
  if (input.priority !== undefined) setPayload.priority = input.priority;
  if (input.upstream !== undefined) {
    if (input.upstream.target !== undefined) {
      setPayload['upstream.target'] = input.upstream.target;
    }
    if (input.upstream.timeoutMs !== undefined) {
      setPayload['upstream.timeoutMs'] = input.upstream.timeoutMs;
    }
    if (input.upstream.headers !== undefined) {
      setPayload['upstream.headers'] = input.upstream.headers;
    }
  }
  if (input.rateLimit !== undefined) {
    if (input.rateLimit === null) {
      unsetPayload.rateLimit = 1;
    } else {
      setPayload.rateLimit = {
        limit: input.rateLimit.limit,
        windowSec: input.rateLimit.windowSec
      };
    }
  }

  const updateOperations: Record<string, unknown> = {};
  if (Object.keys(setPayload).length > 0) {
    updateOperations.$set = setPayload;
  }
  if (Object.keys(unsetPayload).length > 0) {
    updateOperations.$unset = unsetPayload;
  }

  if (Object.keys(updateOperations).length === 0) {
    const existing = await RouteModel.findById(id).exec();
    return existing ? toDto(existing) : null;
  }

  const updated = await RouteModel.findByIdAndUpdate(id, updateOperations, {
    new: true,
    runValidators: true
  }).exec();

  if (!updated) {
    return null;
  }

  invalidateRouteCache();
  return toDto(updated);
};

export const deleteRoute = async (id: string): Promise<boolean> => {
  const result = await RouteModel.findByIdAndDelete(id).exec();
  if (result) {
    invalidateRouteCache();
  }
  return Boolean(result);
};
