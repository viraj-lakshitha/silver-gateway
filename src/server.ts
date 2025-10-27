import http from 'node:http';

import env from './config/env';
import { logger } from './config/logger';
import { createApp } from './http/app';

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info({ port: env.port, env: env.nodeEnv }, 'Server is listening');
});

const gracefulShutdown = (signal: NodeJS.Signals) => {
  logger.info({ signal }, 'Received shutdown signal');
  server.close((err?: Error) => {
    if (err) {
      logger.error({ err }, 'Error during server shutdown');
      process.exitCode = 1;
    }

    logger.info('Server closed');
    process.exit();
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
export default server;
