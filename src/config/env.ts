import dotenv from 'dotenv';

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  mongoUri: process.env.MONGO_URI ?? 'mongodb://mongo:27017/silver_gateway',
  redisUrl: process.env.REDIS_URL ?? 'redis://redis:6379'
} as const;

if (Number.isNaN(env.port)) {
  throw new Error('Invalid PORT value; must be a number');
}

export type Env = typeof env;

export default env;
