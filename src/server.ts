import http from 'node:http';

import env from '@config/env';
import { logger } from '@config/logger';
import { connectMongo, disconnectMongo } from '@database/mongo';
import { connectRedis, disconnectRedis } from '@database/redis';
import { flushQueue as flushUsageLogs } from '@analytics/usage-log.service';
import { createApp } from '@http/app';

const app = createApp();

let server: Server | null = null;

const startServer = async (): Promise<Server> => {
  await Promise.all([connectMongo(), connectRedis()]);

  return new Promise((resolve) => {
    server = app.listen(env.port, () => {
      logger.info({ port: env.port, env: env.nodeEnv }, 'Server is listening');
      resolve(server as Server);
    });
  });
};

void startServer().catch((error) => {
  logger.error({ err: error }, 'Failed to start server');
  process.exit(1);
});

const gracefulShutdown = (signal: NodeJS.Signals) => {
  logger.info({ signal }, 'Received shutdown signal');
  const closeServer = () =>
    server?.close((err?: Error) => {
      if (err) {
        logger.error({ err }, 'Error during server shutdown');
        process.exitCode = 1;
      }
      logger.info('Server closed');
      process.exit();
    });

  void Promise.all([flushUsageLogs(), disconnectMongo(), disconnectRedis()])
    .catch((error) => {
      logger.error({ err: error }, 'Error disconnecting data stores');
    })
    .finally(() => {
      closeServer();
    });
};

process.on('uncaughtException', (error) => {
  logger.error({ err: error }, 'Uncaught exception');
});

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled rejection');
});

['SIGTERM', 'SIGINT'].forEach((signal) => {
  process.on(signal, () => gracefulShutdown(signal as NodeJS.Signals));
});

export type Server = http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
export { app, startServer };
