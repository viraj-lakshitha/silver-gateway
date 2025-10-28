module.exports = {
  root: true,
  env: {
    es2021: true,
    node: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier'
  ],
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          ['parent', 'sibling', 'index'],
          'object',
          'type'
        ],
        pathGroups: [
          {
            pattern: '@{analytics,auth,config,database,http,plugins,proxy,ratelimit,routes,utils}{,/**}',
            group: 'internal',
            position: 'before'
          }
        ],
        pathGroupsExcludedImportTypes: ['builtin'],
        'newlines-between': 'always'
      }
    ],
    'import/no-unresolved': [
      'error',
      {
        ignore: ['argon2', 'jose']
      }
    ],
    'import/no-named-as-default': 'off',
    'import/no-named-as-default-member': 'off'
  },
  settings: {
    'import/resolver': {
      typescript: {
        project: ['./tsconfig.json'],
        alwaysTryTypes: true
      },
      node: {
        extensions: ['.js', '.ts'],
        moduleDirectory: ['node_modules', 'src']
      }
    }
  },
  ignorePatterns: ['dist/', 'node_modules/']
};
