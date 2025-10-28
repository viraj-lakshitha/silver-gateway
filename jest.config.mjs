/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  extensionsToTreatAsEsm: ['.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapper: {
    '^@auth/(.*)$': '<rootDir>/src/auth/$1',
    '^@analytics/(.*)$': '<rootDir>/src/analytics/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@database/(.*)$': '<rootDir>/src/database/$1',
    '^@http/(.*)$': '<rootDir>/src/http/$1',
    '^@plugins/(.*)$': '<rootDir>/src/plugins/$1',
    '^@proxy/(.*)$': '<rootDir>/src/proxy/$1',
    '^@ratelimit/(.*)$': '<rootDir>/src/ratelimit/$1',
    '^@routes/(.*)$': '<rootDir>/src/routes/$1',
    '^@routes$': '<rootDir>/src/routes/index.ts',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^jose$': '<rootDir>/test/stubs/jose.ts'
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.json'
      }
    ]
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/__tests__/**']
};

export default config;
