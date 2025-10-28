export default {
  name: 'error-logger',
  version: '1.0.0',
  description: 'Logs gateway errors for observability demos.',
  hooks: {
    error: (config = {}) => {
      const level = String(config.level ?? 'warn');
      return ({ logger, error, route, requestId }) => {
        const logFn = typeof logger[level] === 'function' ? logger[level] : logger.warn;
        logFn({ err: error, routeId: route.id, requestId }, 'error-logger plugin caught error');
      };
    }
  }
};
