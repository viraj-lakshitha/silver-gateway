import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
  type JWSHeaderParameters
} from 'jose';

import env from '@config/env';
import { UnauthorizedError } from '@http/errors';

const textEncoder = new TextEncoder();

let remoteJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

const getExpectedAudience = (): string | string[] | undefined => {
  if (!env.jwt.audience) return undefined;
  const audiences = env.jwt.audience
    .split(',')
    .map((aud) => aud.trim())
    .filter(Boolean);

  if (audiences.length === 0) {
    return undefined;
  }
  if (audiences.length === 1) {
    return audiences[0];
  }
  return audiences;
};

const getSharedSecret = () => {
  if (!env.jwt.secret) return undefined;
  return textEncoder.encode(env.jwt.secret);
};

const getRemoteKeySet = () => {
  if (!env.jwt.jwksUri) return undefined;
  if (!remoteJwks) {
    remoteJwks = createRemoteJWKSet(new URL(env.jwt.jwksUri));
  }
  return remoteJwks;
};

export interface JwtVerificationResult {
  payload: JWTPayload;
  header: JWSHeaderParameters;
}

export const verifyJwtToken = async (token: string): Promise<JwtVerificationResult> => {
  const secret = getSharedSecret();
  const remoteKeySet = getRemoteKeySet();

  if (!secret && !remoteKeySet) {
    throw new UnauthorizedError('JWT verification is not configured');
  }

  const options = {
    algorithms: env.jwt.algorithms,
    issuer: env.jwt.issuer,
    audience: getExpectedAudience()
  } as const;

  const verificationResult = await (async () => {
    try {
      if (secret) {
        return await jwtVerify(token, secret, options);
      }

      return await jwtVerify(token, remoteKeySet!, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new UnauthorizedError('Invalid JWT token', { message });
    }
  })();

  return {
    payload: verificationResult.payload,
    header: verificationResult.protectedHeader
  };
};
