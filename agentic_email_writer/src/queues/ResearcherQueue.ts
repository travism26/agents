import { Job } from 'bull';
import { BaseQueue } from './BaseQueue';
import { QueueName } from './config';

export interface ResearcherJobData {
  generatedEmailId: string;
  contactId: string;
  companyId: string;
  timeframe?: {
    startDate?: Date;
    endDate?: Date;
  };
}

export class ResearcherQueue extends BaseQueue<ResearcherJobData> {
  private static instance: ResearcherQueue | null = null;

  private constructor() {
    super(QueueName.RESEARCHER);
  }

  static getInstance(): ResearcherQueue {
    if (!ResearcherQueue.instance) {
      ResearcherQueue.instance = new ResearcherQueue();
    }
    return ResearcherQueue.instance;
  }

  protected async process(job: Job<ResearcherJobData>): Promise<void> {
    // Job processing logic will be implemented here
    // This is called by the parent class's processJob method
    console.log(`Processing researcher job ${job.id}`);
  }
}

// Export the singleton instance
export const researcherQueue = ResearcherQueue.getInstance();
