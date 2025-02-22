import mongoose, { Document, Schema } from 'mongoose';
import { ICompany } from './Company';

export interface IContact extends Document {
  name: string;
  title: string;
  company: ICompany['_id'];
  email?: string;
  linkedIn?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema(
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
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    linkedIn: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
ContactSchema.index({ company: 1, email: 1 });

export const Contact = mongoose.model<IContact>('Contact', ContactSchema);
