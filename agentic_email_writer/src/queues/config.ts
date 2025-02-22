import { QueueOptions } from 'bull';
import dotenv from 'dotenv';

dotenv.config();

export const defaultQueueConfig: QueueOptions = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: false,
    removeOnFail: false,
  },
};

export enum QueueName {
  RESEARCHER = 'researcher',
  WRITER = 'writer',
  REVIEWER = 'reviewer',
}

// Job types for each queue
export interface ResearcherJobData {
  generatedEmailId: string;
  contactId: string;
  companyId: string;
  timeframe?: {
    startDate: Date;
    endDate: Date;
  };
}

export interface WriterJobData {
  generatedEmailId: string;
  articles: string[];
  contactId: string;
  userId: string;
}

export interface ReviewerJobData {
  generatedEmailId: string;
  draftId: string;
  version: number;
}

// Error handling utilities
export class QueueError extends Error {
  constructor(
    message: string,
    public readonly queueName: QueueName,
    public readonly jobId?: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'QueueError';
  }
}

export function handleQueueError(
  queueName: QueueName,
  error: Error,
  jobId?: string
): QueueError {
  console.error(`Error in ${queueName} queue:`, error);
  return new QueueError(
    `Queue operation failed: ${error.message}`,
    queueName,
    jobId,
    error
  );
}
