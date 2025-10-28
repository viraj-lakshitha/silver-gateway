import crypto from 'node:crypto';

import env from '@config/env';
import { getRedisClient } from '@database/redis';

import type Redis from 'ioredis';

const LUA_SCRIPT = `
local key = KEYS[1]
local max_tokens = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local bucket = redis.call('HMGET', key, 'tokens', 'timestamp')
local tokens = tonumber(bucket[1])
local timestamp = tonumber(bucket[2])

if tokens == nil then
  tokens = max_tokens
  timestamp = now
end

if timestamp == nil then
  timestamp = now
end

local elapsed = now - timestamp
if elapsed < 0 then
  elapsed = 0
end

if elapsed > 0 then
  local refill = elapsed * (max_tokens / window)
  tokens = math.min(max_tokens, tokens + refill)
  timestamp = now
end

local allowed = 0
local remaining = tokens

if tokens >= 1 then
  tokens = tokens - 1
  remaining = tokens
  allowed = 1
end

redis.call('HMSET', key, 'tokens', tokens, 'timestamp', timestamp)
redis.call('PEXPIRE', key, window)

local ttl = redis.call('PTTL', key)
if ttl < 0 then
  ttl = window
end

return { allowed, remaining, max_tokens, ttl }
`;

type TokenBucketCommand = (
  key: string,
  limit: number,
  windowMs: number,
  nowMs: number
) => Promise<[number, number, number, number]>;

let commandDefined = false;

const getClient = (): Redis & { tokenBucketConsume: TokenBucketCommand } => {
  const redis = getRedisClient() as Redis & { tokenBucketConsume?: TokenBucketCommand };

  if (!commandDefined) {
    (redis as Redis).defineCommand('tokenBucketConsume', {
      numberOfKeys: 1,
      lua: LUA_SCRIPT
    });
    commandDefined = true;
  }

  return redis as Redis & { tokenBucketConsume: TokenBucketCommand };
};

export interface RateLimitConfig {
  limit: number;
  windowSec: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
}

const hashIdentifier = (identifier: string): string =>
  crypto.createHash('sha256').update(identifier).digest('hex');

const sanitizePart = (value: string): string => value.replace(/[^a-zA-Z0-9:_-]/g, '');

export interface ConsumeRateLimitOptions {
  identifier: string;
  routeId: string;
  limit?: number;
  windowSec?: number;
}

export const consumeRateLimit = async (
  options: ConsumeRateLimitOptions
): Promise<RateLimitResult> => {
  const limit = options.limit ?? env.rateLimit.defaultLimit;
  const windowSec = options.windowSec ?? env.rateLimit.defaultWindowSec;
  const windowMs = windowSec * 1000;

  const redis = getClient();

  const hashedIdentifier = hashIdentifier(options.identifier);
  const key = `rl:${sanitizePart(options.routeId)}:${hashedIdentifier}`;
  const now = Date.now();

  const [allowedRaw, remainingRaw, limitRaw, resetRaw] = await redis.tokenBucketConsume(
    key,
    limit,
    windowMs,
    now
  );

  const allowed = Number(allowedRaw) === 1;
  const remaining = Math.max(0, Math.floor(Number(remainingRaw)));
  const resetMs = Math.max(0, Math.floor(Number(resetRaw)));
  const normalizedLimit = Math.max(0, Math.floor(Number(limitRaw)));

  return {
    allowed,
    limit: normalizedLimit,
    remaining,
    resetMs
  };
};
