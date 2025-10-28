import crypto from 'node:crypto';

import argon2 from 'argon2';

import env from '@config/env';
import { NotFoundError } from '@http/errors';
import { ApiKeyModel, type ApiKeyDocument } from '@auth/api-key.model';

export interface ApiKeyDto {
  id: string;
  name: string;
  description?: string;
  ownerId?: string;
  prefix: string;
  displayId: string;
  status: ApiKeyDocument['status'];
  scopes: string[];
  lastUsedAt?: Date;
  lastRotatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IssueApiKeyInput {
  name: string;
  description?: string;
  ownerId?: string;
  scopes?: string[];
}

export interface UpdateApiKeyInput {
  name?: string;
  description?: string;
  status?: ApiKeyDocument['status'];
  scopes?: string[];
}

export interface IssueApiKeyResult {
  apiKey: ApiKeyDto;
  token: string;
}

const toDto = (doc: ApiKeyDocument): ApiKeyDto => ({
  id: doc.id,
  name: doc.name,
  description: doc.description ?? undefined,
  ownerId: doc.ownerId?.toString(),
  prefix: doc.prefix,
  displayId: doc.displayId,
  status: doc.status,
  scopes: doc.scopes,
  lastUsedAt: doc.lastUsedAt ?? undefined,
  lastRotatedAt: doc.lastRotatedAt ?? undefined,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const hashSecret = (secret: string) =>
  argon2.hash(secret, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1
  });

const validateScopes = (scopes?: string[]): string[] | undefined => {
  if (!scopes) return undefined;
  const unique = Array.from(new Set(scopes.map((scope) => scope.trim()).filter(Boolean)));
  if (unique.length === 0) {
    return undefined;
  }
  return unique;
};

const generateDisplayId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 24);

const generateSecret = () =>
  crypto.randomBytes(env.apiKey.secretBytes).toString('base64url');

const buildToken = (displayId: string, secret: string) =>
  `${env.apiKey.prefix}${displayId}.${secret}`;

export const issueApiKey = async (
  input: IssueApiKeyInput
): Promise<IssueApiKeyResult> => {
  const scopes = validateScopes(input.scopes);
  const displayId = generateDisplayId();
  const secret = generateSecret();
  const keyHash = await hashSecret(secret);

  const created = await ApiKeyModel.create({
    name: input.name,
    description: input.description,
    ownerId: input.ownerId,
    prefix: env.apiKey.prefix,
    displayId,
    keyHash,
    scopes: scopes ?? [],
    lastRotatedAt: new Date()
  });

  return {
    apiKey: toDto(created),
    token: buildToken(displayId, secret)
  };
};

export const listApiKeys = async (): Promise<ApiKeyDto[]> => {
  const keys = await ApiKeyModel.find().sort({ createdAt: -1 }).exec();
  return keys.map(toDto);
};

export const getApiKey = async (id: string): Promise<ApiKeyDto | null> => {
  if (!id) return null;
  const key = await ApiKeyModel.findById(id).exec();
  return key ? toDto(key) : null;
};

export const updateApiKey = async (
  id: string,
  patch: UpdateApiKeyInput
): Promise<ApiKeyDto> => {
  const scopes = validateScopes(patch.scopes);
  const updatePayload: Record<string, unknown> = {};

  if (patch.name !== undefined) updatePayload.name = patch.name;
  if (patch.description !== undefined) updatePayload.description = patch.description;
  if (patch.status !== undefined) updatePayload.status = patch.status;
  if (scopes !== undefined) updatePayload.scopes = scopes;

  const updated = await ApiKeyModel.findByIdAndUpdate(
    id,
    { $set: updatePayload },
    { new: true, runValidators: true }
  ).exec();

  if (!updated) {
    throw new NotFoundError('API key not found');
  }

  return toDto(updated);
};

export const rotateApiKey = async (id: string): Promise<IssueApiKeyResult> => {
  const secret = generateSecret();
  const keyHash = await hashSecret(secret);

  const updated = await ApiKeyModel.findByIdAndUpdate(
    id,
    {
      $set: {
        keyHash,
        lastRotatedAt: new Date(),
        status: 'active'
      }
    },
    { new: true }
  ).exec();

  if (!updated) {
    throw new NotFoundError('API key not found');
  }

  return {
    apiKey: toDto(updated),
    token: buildToken(updated.displayId, secret)
  };
};

export const revokeApiKey = async (id: string): Promise<ApiKeyDto> => {
  const updated = await ApiKeyModel.findByIdAndUpdate(
    id,
    {
      $set: {
        status: 'revoked'
      }
    },
    { new: true }
  ).exec();

  if (!updated) {
    throw new NotFoundError('API key not found');
  }

  return toDto(updated);
};

export interface VerifiedApiKey {
  apiKey: ApiKeyDto;
  secretValid: boolean;
}

export const parseApiKeyToken = (token: string) => {
  const [idPart, secret] = token.split('.', 2);
  if (!secret) {
    return null;
  }

  const prefix = env.apiKey.prefix;

  if (!idPart.startsWith(prefix)) {
    return null;
  }

  const displayId = idPart.slice(prefix.length);
  if (!displayId) {
    return null;
  }

  return { displayId, secret };
};

export const verifyApiKeyToken = async (token: string): Promise<ApiKeyDto | null> => {
  const parsed = parseApiKeyToken(token);
  if (!parsed) {
    return null;
  }

  const keyDoc = await ApiKeyModel.findOne({
    displayId: parsed.displayId,
    status: 'active'
  }).exec();
  if (!keyDoc) {
    return null;
  }

  const secretMatches = await argon2
    .verify(keyDoc.keyHash, parsed.secret)
    .catch(() => false);
  if (!secretMatches) {
    return null;
  }

  void ApiKeyModel.updateOne(
    { _id: keyDoc._id },
    {
      $set: { lastUsedAt: new Date() }
    }
  ).exec();

  return toDto(keyDoc);
};
