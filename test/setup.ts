import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';
process.env.RATE_LIMIT_DEFAULT_LIMIT = process.env.RATE_LIMIT_DEFAULT_LIMIT ?? '1000';
process.env.RATE_LIMIT_DEFAULT_WINDOW_SEC =
  process.env.RATE_LIMIT_DEFAULT_WINDOW_SEC ?? '60';
process.env.USAGE_LOG_BATCH_SIZE = process.env.USAGE_LOG_BATCH_SIZE ?? '200';
process.env.USAGE_LOG_FLUSH_INTERVAL_MS = process.env.USAGE_LOG_FLUSH_INTERVAL_MS ?? '10';

jest.setTimeout(30000);
