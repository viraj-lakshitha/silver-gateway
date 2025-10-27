import { invalidateRouteCache } from './route.cache';
import { RouteModel, Route } from './route.model';

import type { HydratedDocument } from 'mongoose';
import type { NormalizedRouteInput, NormalizedRouteUpdateInput } from './route.validation';

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
  const updatePayload: Record<string, unknown> = {};

  if (input.name !== undefined) updatePayload.name = input.name;
  if (input.description !== undefined) updatePayload.description = input.description;
  if (input.pattern !== undefined) updatePayload.pattern = input.pattern;
  if (input.methods !== undefined) updatePayload.methods = input.methods;
  if (input.authMode !== undefined) updatePayload.authMode = input.authMode;
  if (input.enabled !== undefined) updatePayload.enabled = input.enabled;
  if (input.priority !== undefined) updatePayload.priority = input.priority;
  if (input.upstream !== undefined) {
    if (input.upstream.target !== undefined) {
      updatePayload['upstream.target'] = input.upstream.target;
    }
    if (input.upstream.timeoutMs !== undefined) {
      updatePayload['upstream.timeoutMs'] = input.upstream.timeoutMs;
    }
    if (input.upstream.headers !== undefined) {
      updatePayload['upstream.headers'] = input.upstream.headers;
    }
  }

  const updated = await RouteModel.findByIdAndUpdate(
    id,
    { $set: updatePayload },
    { new: true, runValidators: true }
  ).exec();

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
