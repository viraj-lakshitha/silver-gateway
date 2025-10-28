import { describe, expect, it } from '@jest/globals';

import { normalizeRouteCreateInput } from '@proxy/route.validation';

describe('normalizeRouteCreateInput', () => {
  it('fills in defaults for missing optional fields', () => {
    const normalized = normalizeRouteCreateInput({
      name: 'Test Route',
      pattern: '/demo',
      upstream: {
        target: 'http://localhost:4000'
      }
    });

    expect(normalized.methods).toEqual(['GET']);
    expect(normalized.authMode).toBe('none');
    expect(normalized.rateLimit).toBeUndefined();
    expect(normalized.plugins.pre).toEqual([]);
    expect(normalized.plugins.post).toEqual([]);
    expect(normalized.plugins.error).toEqual([]);
  });
});
