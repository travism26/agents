import { researcherQueue } from './ResearcherQueue';
import { writerQueue } from './WriterQueue';
import { reviewerQueue } from './ReviewerQueue';
import { QueueName } from './config';
import { BaseQueue } from './BaseQueue';

export { ResearcherJobData, WriterJobData, ReviewerJobData } from './config';
export { researcherQueue, writerQueue, reviewerQueue };

// Map of all queues for easy access
export const queues: Record<QueueName, BaseQueue<any>> = {
  [QueueName.RESEARCHER]: researcherQueue,
  [QueueName.WRITER]: writerQueue,
  [QueueName.REVIEWER]: reviewerQueue,
};

// Initialize all queues
export async function initializeQueues(): Promise<void> {
  try {
    console.log('Initializing queues...');

    // Start processing jobs for each queue
    await Promise.all([
      researcherQueue.getQueue().isReady(),
      writerQueue.getQueue().isReady(),
      reviewerQueue.getQueue().isReady(),
    ]);

    // Set up job processing
    researcherQueue
      .getQueue()
      .process(async (job, done) => researcherQueue.processJob(job, done));
    writerQueue
      .getQueue()
      .process(async (job, done) => writerQueue.processJob(job, done));
    reviewerQueue
      .getQueue()
      .process(async (job, done) => reviewerQueue.processJob(job, done));

    console.log('All queues initialized successfully');
  } catch (error) {
    console.error('Failed to initialize queues:', error);
    throw error;
  }
}

// Gracefully shut down all queues
export async function shutdownQueues(): Promise<void> {
  try {
    console.log('Shutting down queues...');
    await Promise.all([
      researcherQueue.close(),
      writerQueue.close(),
      reviewerQueue.close(),
    ]);
    console.log('All queues shut down successfully');
  } catch (error) {
    console.error('Error shutting down queues:', error);
    throw error;
  }
}

// Helper function to get a queue by name
export function getQueueByName(name: QueueName) {
  return queues[name];
}
