import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  title: string;
  company: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
