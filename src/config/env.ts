import path from 'node:path';

import dotenv from 'dotenv';

dotenv.config();

const parseAlgorithms = (value: string | undefined): string[] =>
  (value ?? 'HS256')
    .split(',')
    .map((alg) => alg.trim())
    .filter(Boolean);

const pluginsDir = process.env.PLUGINS_DIR
  ? path.resolve(process.env.PLUGINS_DIR)
  : path.resolve(process.cwd(), 'plugins');

const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  mongoUri: process.env.MONGO_URI ?? 'mongodb://mongo:27017/silver_gateway',
  redisUrl: process.env.REDIS_URL ?? 'redis://redis:6379',
  rateLimit: {
    defaultLimit: Number(process.env.RATE_LIMIT_DEFAULT_LIMIT ?? 1000),
    defaultWindowSec: Number(process.env.RATE_LIMIT_DEFAULT_WINDOW_SEC ?? 60)
  },
  plugins: {
    directory: pluginsDir,
    timeoutMs: Number(process.env.PLUGIN_TIMEOUT_MS ?? 500)
  },
  usageLog: {
    batchSize: Number(process.env.USAGE_LOG_BATCH_SIZE ?? 200),
    flushIntervalMs: Number(process.env.USAGE_LOG_FLUSH_INTERVAL_MS ?? 2000)
  },
  apiKey: {
    prefix: process.env.API_KEY_PREFIX ?? 'sgk_',
    secretBytes: Number(process.env.API_KEY_SECRET_BYTES ?? 32)
  },
  jwt: {
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
    jwksUri: process.env.JWT_JWKS_URI,
    secret: process.env.JWT_SECRET,
    algorithms: parseAlgorithms(process.env.JWT_ALGORITHMS)
  }
} as const;

if (Number.isNaN(env.port)) {
  throw new Error('Invalid PORT value; must be a number');
}

if (Number.isNaN(env.rateLimit.defaultLimit) || env.rateLimit.defaultLimit <= 0) {
  throw new Error('RATE_LIMIT_DEFAULT_LIMIT must be a positive number');
}

if (Number.isNaN(env.rateLimit.defaultWindowSec) || env.rateLimit.defaultWindowSec <= 0) {
  throw new Error('RATE_LIMIT_DEFAULT_WINDOW_SEC must be a positive number');
}

if (Number.isNaN(env.apiKey.secretBytes) || env.apiKey.secretBytes < 24) {
  throw new Error('API_KEY_SECRET_BYTES must be a number >= 24');
}

if (Number.isNaN(env.usageLog.batchSize) || env.usageLog.batchSize <= 0) {
  throw new Error('USAGE_LOG_BATCH_SIZE must be a positive number');
}

if (Number.isNaN(env.usageLog.flushIntervalMs) || env.usageLog.flushIntervalMs <= 0) {
  throw new Error('USAGE_LOG_FLUSH_INTERVAL_MS must be a positive number');
}

if (Number.isNaN(env.plugins.timeoutMs) || env.plugins.timeoutMs <= 0) {
  throw new Error('PLUGIN_TIMEOUT_MS must be a positive number');
}

export type Env = typeof env;

export default env;
