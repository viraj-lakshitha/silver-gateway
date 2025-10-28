import { Schema, model, models, type InferSchemaType } from 'mongoose';

const UsageLogSchema = new Schema(
  {
    routeId: { type: Schema.Types.ObjectId, ref: 'Route', required: true },
    method: { type: String, required: true },
    statusCode: { type: Number, required: true },
    durationMs: { type: Number, required: true },
    bytesIn: { type: Number, default: 0 },
    bytesOut: { type: Number, default: 0 },
    principalId: { type: String },
    principalSource: { type: String },
    principalScopes: { type: [String], default: [] },
    apiKeyDisplayId: { type: String },
    requestId: { type: String },
    timestamp: { type: Date, default: () => new Date(), index: true }
  },
  {
    versionKey: false
  }
);

UsageLogSchema.index({ routeId: 1, timestamp: -1 });
UsageLogSchema.index({ apiKeyDisplayId: 1, timestamp: -1 });

export type UsageLog = InferSchemaType<typeof UsageLogSchema>;

export const UsageLogModel =
  models.UsageLog || model<UsageLog>('UsageLog', UsageLogSchema, 'usage_logs');

export default UsageLogModel;
