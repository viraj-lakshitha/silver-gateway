import {
  Schema,
  model,
  models,
  Types,
  type Model,
  type HydratedDocument,
  type InferSchemaType
} from 'mongoose';

const ApiKeySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    ownerId: { type: Types.ObjectId, ref: 'User' },
    prefix: { type: String, required: true },
    displayId: { type: String, required: true, unique: true },
    keyHash: { type: String, required: true },
    status: {
      type: String,
      enum: ['active', 'revoked'],
      default: 'active'
    },
    scopes: {
      type: [String],
      default: []
    },
    lastUsedAt: { type: Date },
    lastRotatedAt: { type: Date }
  },
  {
    timestamps: true
  }
);

ApiKeySchema.index({ status: 1, displayId: 1 });
ApiKeySchema.index({ ownerId: 1 });

export type ApiKey = InferSchemaType<typeof ApiKeySchema> & {
  ownerId?: Types.ObjectId;
};

export type ApiKeyDocument = HydratedDocument<ApiKey>;

export const ApiKeyModel =
  (models.ApiKey as Model<ApiKey>) || model<ApiKey>('ApiKey', ApiKeySchema, 'api_keys');

export default ApiKeyModel;
