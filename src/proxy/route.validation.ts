import { z } from 'zod';

const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'] as const;

const authModes = ['apiKey', 'jwt', 'both', 'none'] as const;

const UpstreamSchema = z.object({
  target: z.string().url(),
  timeoutMs: z.number().int().min(100).max(120_000).optional(),
  headers: z.record(z.string(), z.string().min(1).max(256)).optional()
});

const RateLimitSchema = z.object({
  limit: z.number().int().positive(),
  windowSec: z.number().int().positive()
});

const BaseRouteSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(280).optional(),
  pattern: z
    .string()
    .min(1)
    .refine((value) => value.startsWith('/'), { message: 'Pattern must start with "/"' }),
  methods: z.array(z.enum(httpMethods)).min(1).optional(),
  authMode: z.enum(authModes).optional(),
  enabled: z.boolean().optional(),
  priority: z.number().int().min(0).max(100).optional(),
  upstream: UpstreamSchema,
  rateLimit: RateLimitSchema.optional()
});

export const CreateRouteSchema = BaseRouteSchema;

export const UpdateRouteSchema = BaseRouteSchema.partial().extend({
  upstream: UpstreamSchema.partial().optional(),
  rateLimit: z.union([RateLimitSchema, z.null()]).optional()
});

export type CreateRouteInput = z.infer<typeof CreateRouteSchema>;
export type UpdateRouteInput = z.infer<typeof UpdateRouteSchema>;

export type NormalizedRouteInput = Omit<
  CreateRouteInput,
  'methods' | 'authMode' | 'enabled' | 'priority' | 'upstream'
> & {
  methods: (typeof httpMethods)[number][];
  authMode: (typeof authModes)[number];
  enabled: boolean;
  priority: number;
  upstream: {
    target: string;
    timeoutMs: number;
    headers?: Record<string, string>;
  };
  rateLimit?: {
    limit: number;
    windowSec: number;
  };
};

export type NormalizedRouteUpdateInput = Partial<
  Omit<NormalizedRouteInput, 'upstream' | 'rateLimit'>
> & {
  upstream?: Partial<NormalizedRouteInput['upstream']>;
  rateLimit?: NormalizedRouteInput['rateLimit'] | null;
};

export const normalizeRouteCreateInput = (payload: unknown): NormalizedRouteInput => {
  const parsed = CreateRouteSchema.parse(payload);

  return {
    name: parsed.name,
    description: parsed.description,
    pattern: parsed.pattern,
    methods: (parsed.methods ?? ['GET']).map(
      (method) => method.toUpperCase() as (typeof httpMethods)[number]
    ),
    authMode: parsed.authMode ?? 'none',
    enabled: parsed.enabled ?? true,
    priority: parsed.priority ?? 0,
    upstream: {
      target: parsed.upstream.target,
      timeoutMs: parsed.upstream.timeoutMs ?? 10_000,
      headers: parsed.upstream.headers
    },
    rateLimit: parsed.rateLimit
      ? {
          limit: parsed.rateLimit.limit,
          windowSec: parsed.rateLimit.windowSec
        }
      : undefined
  };
};

export const normalizeRouteUpdateInput = (
  payload: unknown
): NormalizedRouteUpdateInput => {
  const parsed = UpdateRouteSchema.parse(payload);
  const result: Partial<NormalizedRouteUpdateInput> = {};

  if (parsed.name !== undefined) result.name = parsed.name;
  if (parsed.description !== undefined) result.description = parsed.description;
  if (parsed.pattern !== undefined) result.pattern = parsed.pattern;
  if (parsed.methods !== undefined) {
    result.methods = parsed.methods.map(
      (method) => method.toUpperCase() as (typeof httpMethods)[number]
    );
  }
  if (parsed.authMode !== undefined) result.authMode = parsed.authMode;
  if (parsed.enabled !== undefined) result.enabled = parsed.enabled;
  if (parsed.priority !== undefined) result.priority = parsed.priority;
  if (parsed.upstream !== undefined) {
    const upstream: Partial<NormalizedRouteInput['upstream']> = {};
    if (parsed.upstream.target !== undefined) upstream.target = parsed.upstream.target;
    if (parsed.upstream.timeoutMs !== undefined)
      upstream.timeoutMs = parsed.upstream.timeoutMs;
    if (parsed.upstream.headers !== undefined) upstream.headers = parsed.upstream.headers;
    if (Object.keys(upstream).length > 0) {
      result.upstream = upstream;
    }
  }
  if (parsed.rateLimit !== undefined) {
    if (parsed.rateLimit === null) {
      result.rateLimit = null;
    } else {
      result.rateLimit = {
        limit: parsed.rateLimit.limit,
        windowSec: parsed.rateLimit.windowSec
      };
    }
  }

  return result as NormalizedRouteUpdateInput;
};
