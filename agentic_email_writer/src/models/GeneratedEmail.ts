import mongoose, { Document, Schema } from 'mongoose';
import { IContact } from './Contact';
import { IUser } from './User';

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
  user: IUser['_id'];
  contact: IContact['_id'];
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
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    contact: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
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

// Indexes for efficient querying
GeneratedEmailSchema.index({ user: 1, status: 1 });
GeneratedEmailSchema.index({ contact: 1, createdAt: -1 });

export const GeneratedEmail = mongoose.model<IGeneratedEmail>(
  'GeneratedEmail',
  GeneratedEmailSchema
);
