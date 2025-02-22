import Bull, { Queue, Job, DoneCallback, JobOptions } from 'bull';
import { defaultQueueConfig, QueueName, handleQueueError } from './config';
import { GeneratedEmail } from '../models';

export abstract class BaseQueue<T extends object> {
  protected queue: Queue<T>;
  protected queueName: QueueName;

  constructor(queueName: QueueName) {
    this.queueName = queueName;
    this.queue = new Bull<T>(queueName, defaultQueueConfig);
    this.setupListeners();
  }

  protected setupListeners(): void {
    // Global error handler
    this.queue.on('error', (error) => {
      console.error(`Queue ${this.queueName} error:`, error);
    });

    // Log failed jobs
    this.queue.on('failed', (job, error) => {
      console.error(
        `Job ${job.id} in queue ${this.queueName} failed:`,
        error.message
      );
    });

    // Clean up completed jobs after 24 hours
    this.queue.on('completed', async (job) => {
      await job.moveToCompleted();
      await job.remove();
    });
  }

  public async addJob(data: T, opts?: JobOptions): Promise<Job<T>> {
    try {
      const job = await this.queue.add(data, {
        ...opts,
        attempts: opts?.attempts || 3,
        backoff: opts?.backoff || {
          type: 'exponential',
          delay: 1000,
        },
      });

      console.log(
        `Job ${job.id} added to queue ${this.queueName}`,
        JSON.stringify(data)
      );

      return job;
    } catch (error) {
      throw handleQueueError(this.queueName, error as Error);
    }
  }

  public async processJob(job: Job<T>, done: DoneCallback): Promise<void> {
    try {
      // Update job status in GeneratedEmail
      if ('generatedEmailId' in job.data) {
        const emailId = (job.data as any).generatedEmailId;
        await GeneratedEmail.findByIdAndUpdate(emailId, {
          status: this.queueName,
        });
      }

      // Process the job (implemented by child classes)
      await this.process(job);

      done();
    } catch (error) {
      console.error(
        `Error processing job ${job.id} in queue ${this.queueName}:`,
        error
      );
      done(error as Error);
    }
  }

  // Abstract method to be implemented by child classes
  protected abstract process(job: Job<T>): Promise<void>;

  public async close(): Promise<void> {
    await this.queue.close();
  }

  public getQueue(): Queue<T> {
    return this.queue;
  }

  public async getJob(jobId: string): Promise<Job<T> | null> {
    return this.queue.getJob(jobId);
  }
}
