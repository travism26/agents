import { Job } from 'bull';
import { ResearcherQueue } from '../../queues/ResearcherQueue';
import { GeneratedEmail } from '../../models';
import { QueueName } from '../../queues/config';

// Mock Bull
jest.mock('bull');

// Mock GeneratedEmail model
jest.mock('../../models', () => ({
  GeneratedEmail: {
    findByIdAndUpdate: jest.fn(),
  },
}));

describe('ResearcherQueue', () => {
  let queue: ResearcherQueue;

  beforeEach(() => {
    queue = ResearcherQueue.getInstance();
  });

  afterEach(async () => {
    await queue.close();
  });

  it('should be a singleton', () => {
    const instance1 = ResearcherQueue.getInstance();
    const instance2 = ResearcherQueue.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should initialize with correct queue name', () => {
    expect(queue.getQueue().name).toBe(QueueName.RESEARCHER);
  });

  describe('process', () => {
    it('should process research job and update status', async () => {
      const mockJob = {
        id: 'test-job-id',
        data: {
          generatedEmailId: 'email-id',
          contactId: 'contact-id',
          companyId: 'company-id',
        },
      } as Job;

      await queue.processJob(mockJob, jest.fn());

      expect(GeneratedEmail.findByIdAndUpdate).toHaveBeenCalledWith(
        'email-id',
        { status: QueueName.RESEARCHER }
      );
    });

    it('should handle processing errors', async () => {
      const mockJob = {
        id: 'test-job-id',
        data: {
          generatedEmailId: 'email-id',
          contactId: 'contact-id',
          companyId: 'company-id',
        },
      } as Job;
      const mockDone = jest.fn();
      const testError = new Error('Processing error');

      (GeneratedEmail.findByIdAndUpdate as jest.Mock).mockRejectedValue(
        testError
      );

      await queue.processJob(mockJob, mockDone);

      expect(mockDone).toHaveBeenCalledWith(testError);
    });
  });
});
