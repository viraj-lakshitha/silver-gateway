import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import env from '@config/env';
import { logger } from '@config/logger';

import type { PluginModule } from './types';

interface LoadedPlugin {
  plugin: PluginModule;
  filePath: string;
}

const registry = new Map<string, LoadedPlugin>();
let loaded = false;

const isPluginFile = (fileName: string): boolean =>
  fileName.endsWith('.js') || fileName.endsWith('.mjs') || fileName.endsWith('.cjs');

const normalizeModule = (mod: unknown, filePath: string): PluginModule | null => {
  if (!mod) return null;
  const candidate: PluginModule | undefined = (
    typeof mod === 'object' && 'default' in (mod as Record<string, unknown>)
      ? (mod as Record<string, unknown>).default
      : mod
  ) as PluginModule | undefined;

  if (!candidate || typeof candidate !== 'object') {
    logger.warn({ filePath }, 'Plugin module does not export an object');
    return null;
  }

  if (!candidate.name || !candidate.version) {
    logger.warn({ filePath }, 'Plugin module missing "name" or "version"');
    return null;
  }

  return candidate;
};

export const loadPlugins = async (): Promise<void> => {
  registry.clear();
  loaded = true;

  try {
    const stats = await fs.stat(env.plugins.directory).catch(() => null);
    if (!stats || !stats.isDirectory()) {
      logger.warn({ directory: env.plugins.directory }, 'Plugins directory not found');
      return;
    }

    const entries = await fs.readdir(env.plugins.directory);

    await Promise.all(
      entries.filter(isPluginFile).map(async (fileName) => {
        const filePath = path.join(env.plugins.directory, fileName);
        try {
          const imported = await import(pathToFileURL(filePath).href);
          const plugin = normalizeModule(imported, filePath);
          if (!plugin) {
            return;
          }

          if (registry.has(plugin.name)) {
            logger.warn(
              { plugin: plugin.name, filePath },
              'Duplicate plugin name detected; skipping'
            );
            return;
          }

          registry.set(plugin.name, { plugin, filePath });
          logger.info({ plugin: plugin.name, filePath }, 'Loaded plugin');
        } catch (error) {
          logger.error({ err: error, filePath }, 'Failed to load plugin');
        }
      })
    );
  } catch (error) {
    logger.error({ err: error }, 'Failed to scan plugins directory');
  }
};

export const ensurePluginsLoaded = async (): Promise<void> => {
  if (!loaded) {
    await loadPlugins();
  }
};

export const getPluginByName = (name: string): PluginModule | undefined =>
  registry.get(name)?.plugin;

export const listPlugins = (): PluginModule[] =>
  Array.from(registry.values()).map((entry) => entry.plugin);
