import type { PrincipalContext } from '@auth/principal';

import type { Request, Response } from 'express';
import type { Logger } from 'pino';

export interface PluginReference {
  name: string;
  config?: Record<string, unknown>;
}

export interface RoutePluginConfig {
  pre: PluginReference[];
  post: PluginReference[];
  error: PluginReference[];
}

export interface PluginModule {
  name: string;
  version: string;
  description?: string;
  timeoutMs?: number;
  hooks?: {
    pre?: PluginHookFactory;
    post?: PluginPostHookFactory;
    error?: PluginErrorHookFactory;
  };
}

export type PluginHookFactory = (
  config?: Record<string, unknown>
) => PluginHook | PluginHook[] | undefined;

export type PluginPostHookFactory = (
  config?: Record<string, unknown>
) => PluginPostHook | PluginPostHook[] | undefined;

export type PluginErrorHookFactory = (
  config?: Record<string, unknown>
) => PluginErrorHook | PluginErrorHook[] | undefined;

export interface PluginContext {
  req: Request;
  res: Response;
  route: RouteContext;
  principal?: PrincipalContext;
  requestId: string;
  logger: Logger;
}

export interface PluginPostContext extends PluginContext {
  durationMs: number;
  bytesIn: number;
  bytesOut: number;
  statusCode: number;
}

export interface PluginErrorContext extends PluginContext {
  error: unknown;
}

export type PluginHook = (context: PluginContext) => Promise<void> | void;
export type PluginPostHook = (context: PluginPostContext) => Promise<void> | void;
export type PluginErrorHook = (context: PluginErrorContext) => Promise<void> | void;

export interface ResolvedPluginHook<
  T extends PluginHook | PluginPostHook | PluginErrorHook
> {
  pluginName: string;
  timeoutMs: number;
  fn: T;
}

export interface RouteContext {
  id: string;
  name: string;
  pattern: string;
  methods: string[];
}
