import Bull, { Queue, Job, DoneCallback } from 'bull';
import { BaseQueue } from '../../queues/BaseQueue';
import { GeneratedEmail } from '../../models';
import { QueueName } from '../../queues/config';

// Mock Bull
jest.mock('bull');
const MockedBull = Bull as jest.MockedClass<typeof Bull>;

// Mock GeneratedEmail model
jest.mock('../../models', () => ({
  GeneratedEmail: {
    findByIdAndUpdate: jest.fn(),
  },
}));

// Test implementation of BaseQueue
class TestQueue extends BaseQueue<{
  testData: string;
  generatedEmailId?: string;
}> {
  protected async process(
    job: Job<{ testData: string; generatedEmailId?: string }>
  ): Promise<void> {
    // Simple process implementation for testing
    console.log(`Processing job ${job.id} with data:`, job.data);
  }
}

describe('BaseQueue', () => {
  let testQueue: TestQueue;
  let mockQueue: jest.Mocked<Queue>;
  let mockOn: jest.Mock;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup queue event listener mock
    mockOn = jest.fn();
    mockQueue = {
      on: mockOn,
      add: jest.fn(),
      close: jest.fn(),
    } as unknown as jest.Mocked<Queue>;

    // Setup Bull constructor mock
    MockedBull.mockImplementation(() => mockQueue);

    // Create test queue instance
    testQueue = new TestQueue(QueueName.RESEARCHER);
  });

  afterEach(async () => {
    await testQueue.close();
  });

  describe('Constructor and Setup', () => {
    it('should create a new queue and setup listeners', () => {
      expect(MockedBull).toHaveBeenCalledWith(
        QueueName.RESEARCHER,
        expect.any(Object)
      );
      expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('failed', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('completed', expect.any(Function));
    });
  });

  describe('addJob', () => {
    it('should add a job to the queue with default options', async () => {
      const jobData = { testData: 'test' };
      const mockJob = { id: 'test-job-id' };
      mockQueue.add.mockResolvedValue(mockJob as any);

      const result = await testQueue.addJob(jobData);

      expect(mockQueue.add).toHaveBeenCalledWith(jobData, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      });
      expect(result).toBe(mockJob);
    });

    it('should add a job with custom options', async () => {
      const jobData = { testData: 'test' };
      const customOpts = {
        attempts: 5,
        backoff: {
          type: 'fixed',
          delay: 2000,
        },
      };
      const mockJob = { id: 'test-job-id' };
      mockQueue.add.mockResolvedValue(mockJob as any);

      await testQueue.addJob(jobData, customOpts);

      expect(mockQueue.add).toHaveBeenCalledWith(jobData, customOpts);
    });

    it('should handle queue errors', async () => {
      const error = new Error('Queue error');
      mockQueue.add.mockRejectedValue(error);

      await expect(testQueue.addJob({ testData: 'test' })).rejects.toThrow();
    });
  });

  describe('processJob', () => {
    it('should process a job and update GeneratedEmail status', async () => {
      const mockJob = {
        id: 'test-job-id',
        data: {
          testData: 'test',
          generatedEmailId: 'email-id',
        },
      } as Job;
      const mockDone = jest.fn() as DoneCallback;

      await testQueue.processJob(mockJob, mockDone);

      expect(GeneratedEmail.findByIdAndUpdate).toHaveBeenCalledWith(
        'email-id',
        { status: QueueName.RESEARCHER }
      );
      expect(mockDone).toHaveBeenCalled();
    });

    it('should handle processing errors', async () => {
      const mockJob = {
        id: 'test-job-id',
        data: { testData: 'test', generatedEmailId: 'email-id' },
      } as Job;
      const mockDone = jest.fn() as DoneCallback;
      const testError = new Error('Database error');

      // Mock GeneratedEmail.findByIdAndUpdate to throw an error
      (GeneratedEmail.findByIdAndUpdate as jest.Mock).mockRejectedValue(
        testError
      );

      await testQueue.processJob(mockJob, mockDone);

      expect(mockDone).toHaveBeenCalledWith(testError);
    });
  });

  describe('Queue Events', () => {
    it('should handle error events', () => {
      const errorHandler = mockOn.mock.calls.find(
        (call) => call[0] === 'error'
      )[1];
      const error = new Error('Test error');

      // Trigger error handler
      errorHandler(error);
      // Error is logged to console, but we don't test console output
    });

    it('should handle failed job events', () => {
      const failedHandler = mockOn.mock.calls.find(
        (call) => call[0] === 'failed'
      )[1];
      const mockJob = { id: 'test-job-id' };
      const error = new Error('Job failed');

      // Trigger failed handler
      failedHandler(mockJob, error);
      // Failure is logged to console, but we don't test console output
    });

    it('should handle completed job events', async () => {
      const completedHandler = mockOn.mock.calls.find(
        (call) => call[0] === 'completed'
      )[1];
      const mockJob = {
        id: 'test-job-id',
        moveToCompleted: jest.fn().mockResolvedValue(undefined),
        remove: jest.fn().mockResolvedValue(undefined),
      };

      // Trigger completed handler
      await completedHandler(mockJob);

      expect(mockJob.moveToCompleted).toHaveBeenCalled();
      expect(mockJob.remove).toHaveBeenCalled();
    });
  });

  describe('Queue Management', () => {
    it('should close the queue', async () => {
      await testQueue.close();
      expect(mockQueue.close).toHaveBeenCalled();
    });

    it('should return the queue instance', () => {
      const queue = testQueue.getQueue();
      expect(queue).toBe(mockQueue);
    });
  });
});
