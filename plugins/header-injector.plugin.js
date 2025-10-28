export default {
  name: 'header-injector',
  version: '1.0.0',
  description: 'Injects custom headers into outgoing requests before proxying.',
  hooks: {
    pre: (config = {}) => {
      const header = String(config.header ?? 'x-plugin-header');
      const value = String(config.value ?? 'injected');
      const lowerHeader = header.toLowerCase();
      return ({ req }) => {
        req.headers[lowerHeader] = value;
      };
    }
  }
};
