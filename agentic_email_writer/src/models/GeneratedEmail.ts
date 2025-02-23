import mongoose, { Document, Schema } from 'mongoose';
export interface IUserDetails {
  name: string;
  title: string;
  company: string;
}

export interface ICompanyDetails {
  name: string;
  industry?: string;
  website?: string;
}

export interface IContactDetails {
  name: string;
  title: string;
  company: ICompanyDetails;
  email?: string;
  linkedIn?: string;
}

export interface INewsArticle {
  title: string;
  url: string;
  publishedDate: Date;
  summary: string;
  relevanceScore?: number;
}

export interface IEmailDraft {
  subject: string;
  body: string;
  version: number;
  createdAt: Date;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  reviewNotes?: string;
}

export interface IGeneratedEmail extends Document {
  user: IUserDetails;
  contact: IContactDetails;
  status:
    | 'pending'
    | 'researching'
    | 'writing'
    | 'reviewing'
    | 'completed'
    | 'failed';
  failedReason?: string;
  articles: INewsArticle[];
  drafts: IEmailDraft[];
  finalDraft?: IEmailDraft;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

const UserDetailsSchema = new Schema(
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
  { _id: false }
);

const CompanyDetailsSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    industry: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const ContactDetailsSchema = new Schema(
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
      type: CompanyDetailsSchema,
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
  { _id: false }
);

const NewsArticleSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    publishedDate: {
      type: Date,
      required: true,
    },
    summary: {
      type: String,
      required: true,
    },
    relevanceScore: {
      type: Number,
      min: 0,
      max: 1,
    },
  },
  { _id: false }
);

const EmailDraftSchema = new Schema(
  {
    subject: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    version: {
      type: Number,
      required: true,
      min: 1,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    reviewStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewNotes: String,
  },
  { _id: false }
);

const GeneratedEmailSchema = new Schema(
  {
    user: {
      type: UserDetailsSchema,
      required: true,
    },
    contact: {
      type: ContactDetailsSchema,
      required: true,
    },
    status: {
      type: String,
      enum: [
        'pending',
        'researching',
        'writing',
        'reviewing',
        'completed',
        'failed',
      ],
      default: 'pending',
    },
    failedReason: {
      type: String,
    },
    articles: [NewsArticleSchema],
    drafts: [EmailDraftSchema],
    finalDraft: EmailDraftSchema,
    completedAt: Date,
  },
  {
    timestamps: true,
  }
);

export const GeneratedEmail = mongoose.model<IGeneratedEmail>(
  'GeneratedEmail',
  GeneratedEmailSchema
);
