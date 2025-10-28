import dotenv from 'dotenv';

dotenv.config();

const parseAlgorithms = (value: string | undefined): string[] =>
  (value ?? 'HS256')
    .split(',')
    .map((alg) => alg.trim())
    .filter(Boolean);

const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  mongoUri: process.env.MONGO_URI ?? 'mongodb://mongo:27017/silver_gateway',
  redisUrl: process.env.REDIS_URL ?? 'redis://redis:6379',
  apiKey: {
    prefix: process.env.API_KEY_PREFIX ?? 'sgk_',
    secretBytes: Number(process.env.API_KEY_SECRET_BYTES ?? 32)
  },
  jwt: {
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
    jwksUri: process.env.JWT_JWKS_URI,
    secret: process.env.JWT_SECRET,
    algorithms: parseAlgorithms(process.env.JWT_ALGORITHMS)
  }
} as const;

if (Number.isNaN(env.port)) {
  throw new Error('Invalid PORT value; must be a number');
}

if (Number.isNaN(env.apiKey.secretBytes) || env.apiKey.secretBytes < 24) {
  throw new Error('API_KEY_SECRET_BYTES must be a number >= 24');
}

export type Env = typeof env;

export default env;
