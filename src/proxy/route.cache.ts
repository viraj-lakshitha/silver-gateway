import { match } from 'path-to-regexp';

import { logger } from '@config/logger';
import { RouteModel } from '@proxy/route.model';

import type { MatchFunction } from 'path-to-regexp';

export interface CompiledRoute {
  id: string;
  name: string;
  description?: string;
  pattern: string;
  methods: Set<string>;
  authMode: 'apiKey' | 'jwt' | 'both' | 'none';
  priority: number;
  upstream: {
    target: string;
    timeoutMs: number;
    headers?: Record<string, string>;
  };
  matcher: MatchFunction<Record<string, string>>;
}

let cache: CompiledRoute[] = [];
let loadedAt = 0;
const CACHE_TTL_MS = 5000;

const buildCompiledRoute = (route: {
  id: string;
  name: string;
  description?: string;
  pattern: string;
  methods: string[];
  authMode: CompiledRoute['authMode'];
  priority: number;
  upstream: CompiledRoute['upstream'];
}): CompiledRoute => {
  const matcher = match<Record<string, string>>(route.pattern, {
    decode: decodeURIComponent,
    end: true
  });

  return {
    ...route,
    methods: new Set(route.methods),
    matcher
  };
};

const fetchRoutes = async (): Promise<CompiledRoute[]> => {
  const records = await RouteModel.find({ enabled: true })
    .sort({ priority: -1, updatedAt: -1 })
    .exec();

  return records.map((route) =>
    buildCompiledRoute({
      id: route.id,
      name: route.name,
      description: route.description,
      pattern: route.pattern,
      methods: route.methods,
      authMode: route.authMode,
      priority: route.priority,
      upstream: route.upstream
    })
  );
};

export const getCompiledRoutes = async (
  forceReload = false
): Promise<CompiledRoute[]> => {
  const now = Date.now();
  if (!forceReload && cache.length > 0 && now - loadedAt < CACHE_TTL_MS) {
    return cache;
  }

  cache = await fetchRoutes();
  loadedAt = now;

  logger.debug({ count: cache.length }, 'Loaded proxy routes into cache');
  return cache;
};

export const invalidateRouteCache = (): void => {
  cache = [];
  loadedAt = 0;
  logger.debug('Invalidated proxy route cache');
};

export const resolveRoute = async (
  method: string,
  path: string
): Promise<{ route: CompiledRoute; params: Record<string, string> } | null> => {
  const routes = await getCompiledRoutes();

  for (const route of routes) {
    if (!route.methods.has(method.toUpperCase())) {
      continue;
    }
    const matchResult = route.matcher(path);
    if (matchResult) {
      return { route, params: matchResult.params };
    }
  }

  return null;
};
