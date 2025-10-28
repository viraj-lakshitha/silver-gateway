import { describe, expect, it, jest } from '@jest/globals';
import type { Request, Response } from 'express';

import { executePreHooks } from '../../src/plugins/executor';
import type { PluginContext, PluginHook } from '../../src/plugins/types';

describe('plugin execution', () => {
  it('runs pre hooks with timeout safety', async () => {
    const hook: PluginHook = (context: any) => {
      context.req.headers['x-test'] = 'plugin-value';
    };

    const resolved = [
      {
        pluginName: 'test-plugin',
        timeoutMs: 100,
        fn: hook
      }
    ];

    const req = {
      headers: {} as Record<string, string>,
      header: jest.fn(),
      get: jest.fn(),
      method: 'GET',
      url: '/test'
    } as unknown as Request;

    const res = {
      setHeader: jest.fn(),
      getHeader: jest.fn(() => undefined)
    } as unknown as Response;

    const context: PluginContext = {
      req,
      res,
      route: {
        id: 'route-1',
        name: 'Test',
        pattern: '/test',
        methods: ['GET']
      },
      principal: undefined,
      requestId: 'req-1',
      logger: console as any
    };

    await executePreHooks(resolved, context);

    expect(req.headers['x-test']).toBe('plugin-value');
  });
});
