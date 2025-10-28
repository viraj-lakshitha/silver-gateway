import { setTimeout as setTimer } from 'node:timers/promises';

import env from '@config/env';
import { logger } from '@config/logger';

import { ensurePluginsLoaded, getPluginByName } from './registry';

import type {
  PluginContext,
  PluginErrorContext,
  PluginErrorHook,
  PluginHook,
  PluginPostContext,
  PluginPostHook,
  PluginReference,
  PluginModule,
  ResolvedPluginHook,
  RouteContext
} from './types';

const createHookHandlers = <T extends PluginHook | PluginPostHook | PluginErrorHook>(
  plugin: PluginModule,
  factory: ((config?: Record<string, unknown>) => T | T[] | undefined) | undefined,
  config?: Record<string, unknown>
): ResolvedPluginHook<T>[] => {
  if (!factory) return [];

  try {
    const hooks = factory(config);
    if (!hooks) {
      return [];
    }

    const hookArray = Array.isArray(hooks) ? hooks : [hooks];

    return hookArray.map((hook) => ({
      pluginName: plugin.name,
      timeoutMs: plugin.timeoutMs ?? env.plugins.timeoutMs,
      fn: hook
    }));
  } catch (error) {
    logger.error(
      { err: error, plugin: plugin.name },
      'Plugin hook factory threw an error'
    );
    return [];
  }
};

export interface ResolvedRoutePlugins {
  pre: ResolvedPluginHook<PluginHook>[];
  post: ResolvedPluginHook<PluginPostHook>[];
  error: ResolvedPluginHook<PluginErrorHook>[];
}

export const resolvePluginsForRoute = async (pluginRefs: {
  pre: PluginReference[];
  post: PluginReference[];
  error: PluginReference[];
}): Promise<ResolvedRoutePlugins> => {
  await ensurePluginsLoaded();

  const resolvePre = pluginRefs.pre.flatMap((ref) => {
    const plugin = getPluginByName(ref.name);
    if (!plugin) {
      logger.warn({ plugin: ref.name }, 'Plugin referenced by route not found');
      return [];
    }

    return createHookHandlers(
      plugin,
      plugin.hooks?.pre,
      ref.config as Record<string, unknown> | undefined
    );
  });

  const resolvePost = pluginRefs.post.flatMap((ref) => {
    const plugin = getPluginByName(ref.name);
    if (!plugin) {
      logger.warn({ plugin: ref.name }, 'Plugin referenced by route not found');
      return [];
    }

    return createHookHandlers(
      plugin,
      plugin.hooks?.post,
      ref.config as Record<string, unknown> | undefined
    );
  });

  const resolveError = pluginRefs.error.flatMap((ref) => {
    const plugin = getPluginByName(ref.name);
    if (!plugin) {
      logger.warn({ plugin: ref.name }, 'Plugin referenced by route not found');
      return [];
    }

    return createHookHandlers(
      plugin,
      plugin.hooks?.error,
      ref.config as Record<string, unknown> | undefined
    );
  });

  return {
    pre: resolvePre,
    post: resolvePost,
    error: resolveError
  };
};

const runWithTimeout = async <T extends PluginHook | PluginPostHook | PluginErrorHook>(
  hook: ResolvedPluginHook<T>,
  handler: (fn: T) => Promise<void>
): Promise<void> => {
  const timeoutAbort = new AbortController();
  const timeout = setTimer(hook.timeoutMs, undefined, {
    signal: timeoutAbort.signal
  }).then(() => {
    throw new Error(`Plugin timed out after ${hook.timeoutMs}ms`);
  });

  try {
    await Promise.race([handler(hook.fn), timeout]);
  } finally {
    timeoutAbort.abort();
  }
};

export const executePreHooks = async (
  hooks: ResolvedPluginHook<PluginHook>[],
  context: PluginContext
): Promise<void> => {
  for (const hook of hooks) {
    try {
      await runWithTimeout(hook, (fn) => Promise.resolve(fn(context)));
    } catch (error) {
      logger.error({ err: error, plugin: hook.pluginName }, 'Pre hook failed');
    }
  }
};

export const executePostHooks = async (
  hooks: ResolvedPluginHook<PluginPostHook>[],
  context: PluginPostContext
): Promise<void> => {
  for (const hook of hooks) {
    try {
      await runWithTimeout(hook, (fn) => Promise.resolve(fn(context)));
    } catch (error) {
      logger.error({ err: error, plugin: hook.pluginName }, 'Post hook failed');
    }
  }
};

export const executeErrorHooks = async (
  hooks: ResolvedPluginHook<PluginErrorHook>[],
  context: PluginErrorContext
): Promise<void> => {
  for (const hook of hooks) {
    try {
      await runWithTimeout(hook, (fn) => Promise.resolve(fn(context)));
    } catch (error) {
      logger.error({ err: error, plugin: hook.pluginName }, 'Error hook failed');
    }
  }
};

export const buildPluginContext = (
  route: RouteContext,
  base: Omit<PluginContext, 'route'>
): PluginContext => ({
  ...base,
  route
});
