export type JWTPayload = Record<string, unknown>;
export type JWSHeaderParameters = Record<string, unknown>;

export const createRemoteJWKSet = () => async () => ({});

export const jwtVerify = async () => ({
  payload: {},
  protectedHeader: {}
});
