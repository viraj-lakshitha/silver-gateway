import { describe, expect, it, jest } from '@jest/globals';
import { executePreHooks } from '@plugins/executor';
describe('plugin execution', () => {
    it('runs pre hooks with timeout safety', async () => {
        const hook = (context) => {
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
            headers: {},
            header: jest.fn(),
            get: jest.fn(),
            method: 'GET',
            url: '/test'
        };
        const res = {
            setHeader: jest.fn(),
            getHeader: jest.fn(() => undefined)
        };
        const context = {
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
            logger: console
        };
        await executePreHooks(resolved, context);
        expect(req.headers['x-test']).toBe('plugin-value');
    });
});
//# sourceMappingURL=plugin-executor.spec.js.map