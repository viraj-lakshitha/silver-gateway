import pino from 'pino';

import env from '@config/env';

const isProd = env.nodeEnv === 'production';

export const logger = pino({
  name: 'silver-gateway',
  level: isProd ? 'info' : 'debug',
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          translateTime: 'SYS:standard',
          singleLine: true,
          ignore: 'pid,hostname'
        }
      }
});

export type Logger = typeof logger;
