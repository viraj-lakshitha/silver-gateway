import { z } from 'zod';

export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(280).optional(),
  ownerId: z.string().min(1).optional(),
  scopes: z.array(z.string().min(1)).min(1).optional()
});

export const UpdateApiKeySchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(280).optional(),
  status: z.enum(['active', 'revoked']).optional(),
  scopes: z.array(z.string().min(1)).optional()
});

export type CreateApiKeyInput = z.infer<typeof CreateApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof UpdateApiKeySchema>;

export const normalizeCreateApiKeyInput = (payload: unknown) =>
  CreateApiKeySchema.parse(payload);

export const normalizeUpdateApiKeyInput = (payload: unknown) => {
  const parsed = UpdateApiKeySchema.parse(payload);

  if (
    parsed.name === undefined &&
    parsed.description === undefined &&
    parsed.status === undefined &&
    parsed.scopes === undefined
  ) {
    throw new z.ZodError([
      {
        path: ['body'],
        message: 'No updatable fields provided',
        code: z.ZodIssueCode.custom
      }
    ]);
  }

  return parsed;
};
