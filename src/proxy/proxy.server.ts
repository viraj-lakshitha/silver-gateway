import httpProxy from 'http-proxy';

import { logger } from '@config/logger';

export const proxyServer = httpProxy.createProxyServer({
  xfwd: true,
  prependPath: false,
  ignorePath: false
});

proxyServer.on('error', (error, req) => {
  logger.error(
    { err: error, url: req.url },
    'Error occurred during proxying. Response may already be handled by Express error middleware.'
  );
});

export default proxyServer;
