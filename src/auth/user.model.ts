import { Schema, model, models, InferSchemaType } from 'mongoose';

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, trim: true },
    role: {
      type: String,
      enum: ['admin', 'developer'],
      default: 'developer'
    },
    status: {
      type: String,
      enum: ['active', 'disabled'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

UserSchema.index({ email: 1 }, { unique: true });

export type UserDocument = InferSchemaType<typeof UserSchema>;

export const UserModel = models.User || model<UserDocument>('User', UserSchema);

export default UserModel;
