import { Schema, InferSchemaType, model, models } from 'mongoose';

const UpstreamSchema = new Schema(
  {
    target: {
      type: String,
      required: true
    },
    timeoutMs: {
      type: Number,
      default: 10_000,
      min: 100,
      max: 120_000
    },
    headers: {
      type: Map,
      of: String,
      default: undefined
    }
  },
  { _id: false }
);

const RateLimitSchema = new Schema(
  {
    limit: { type: Number, min: 1, required: true },
    windowSec: { type: Number, min: 1, required: true }
  },
  { _id: false }
);

const RouteSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    pattern: { type: String, required: true },
    methods: {
      type: [String],
      default: ['GET'],
      set: (methods: string[]) => methods.map((method) => method.toUpperCase())
    },
    authMode: {
      type: String,
      enum: ['apiKey', 'jwt', 'both', 'none'],
      default: 'none'
    },
    enabled: { type: Boolean, default: true },
    priority: { type: Number, default: 0, min: 0 },
    upstream: {
      type: UpstreamSchema,
      required: true
    },
    rateLimit: {
      type: RateLimitSchema,
      required: false
    }
  },
  {
    timestamps: true
  }
);

RouteSchema.index({ pattern: 1, methods: 1 }, { unique: false });
RouteSchema.index({ priority: -1, updatedAt: -1 });

export type Route = InferSchemaType<typeof RouteSchema>;

export const RouteModel = models.Route || model<Route>('Route', RouteSchema, 'routes');
