import mongoose, { Document, Schema } from 'mongoose';

export interface ICompanyDetails {
  industry?: string;
  size?: string;
  location?: string;
  website?: string;
  description?: string;
}

export interface ICompany extends Document {
  name: string;
  details: ICompanyDetails;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    details: {
      industry: {
        type: String,
        trim: true,
      },
      size: {
        type: String,
        trim: true,
      },
      location: {
        type: String,
        trim: true,
      },
      website: {
        type: String,
        trim: true,
      },
      description: {
        type: String,
        trim: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

export const Company = mongoose.model<ICompany>('Company', CompanySchema);
