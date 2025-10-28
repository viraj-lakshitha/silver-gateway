import express, { Application } from 'express';
import helmet from 'helmet';

import { logger } from '@config/logger';
import { HttpError } from '@http/errors';
import routes from '@routes';

export const createApp = (): Application => {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));

  app.use(routes);

  // Basic error handler to ensure JSON responses
  const errorHandler: express.ErrorRequestHandler = (err, _req, res, next) => {
    void next;

    if (err instanceof HttpError) {
      if (err.statusCode >= 500) {
        logger.error({ err }, 'HTTP error encountered');
      } else {
        logger.warn({ err, details: err.details }, 'Client error encountered');
      }

      return res.status(err.statusCode).json({
        error: err.message,
        ...(err.details ? { details: err.details } : {})
      });
    }

    logger.error({ err }, 'Unhandled error');
    return res.status(500).json({ error: 'Internal Server Error' });
  };

  app.use(errorHandler);

  return app;
};

export default createApp;
