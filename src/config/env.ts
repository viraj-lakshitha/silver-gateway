import dotenv from 'dotenv';

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  mongoUri: process.env.MONGO_URI ?? 'mongodb://mongo:27017/silver_gateway',
  redisUrl: process.env.REDIS_URL ?? 'redis://redis:6379',
  rateLimit: {
    defaultLimit: Number(process.env.RATE_LIMIT_DEFAULT_LIMIT ?? 1000),
    defaultWindowSec: Number(process.env.RATE_LIMIT_DEFAULT_WINDOW_SEC ?? 60)
  }
} as const;

if (Number.isNaN(env.port)) {
  throw new Error('Invalid PORT value; must be a number');
}

if (Number.isNaN(env.rateLimit.defaultLimit) || env.rateLimit.defaultLimit <= 0) {
  throw new Error('RATE_LIMIT_DEFAULT_LIMIT must be a positive number');
}

if (
  Number.isNaN(env.rateLimit.defaultWindowSec) ||
  env.rateLimit.defaultWindowSec <= 0
) {
  throw new Error('RATE_LIMIT_DEFAULT_WINDOW_SEC must be a positive number');
}

export type Env = typeof env;

export default env;
