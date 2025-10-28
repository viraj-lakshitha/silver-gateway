import Redis from 'ioredis';

import env from '@config/env';
import { logger } from '@config/logger';

let client: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (client) {
    return client;
  }

  client = new Redis(env.redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: null
  });

  client.on('error', (error) => {
    logger.error({ err: error }, 'Redis error');
  });

  return client;
};

export const connectRedis = async (): Promise<Redis> => {
  const redis = getRedisClient();
  if (redis.status === 'ready' || redis.status === 'connecting') {
    return redis;
  }

  await redis.connect();
  logger.info({ url: env.redisUrl }, 'Connected to Redis');
  return redis;
};

export const disconnectRedis = async (): Promise<void> => {
  if (!client) return;
  await client.quit();
  client = null;
  logger.info('Disconnected from Redis');
};
