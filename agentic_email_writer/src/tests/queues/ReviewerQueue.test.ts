import { Job } from 'bull';
import { ReviewerQueue } from '../../queues/ReviewerQueue';
import { GeneratedEmail } from '../../models';
import { QueueName } from '../../queues/config';

// Mock Bull
jest.mock('bull');

// Mock GeneratedEmail model
jest.mock('../../models', () => ({
  GeneratedEmail: {
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

describe('ReviewerQueue', () => {
  let queue: ReviewerQueue;

  beforeEach(() => {
    queue = ReviewerQueue.getInstance();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await queue.close();
  });

  it('should be a singleton', () => {
    const instance1 = ReviewerQueue.getInstance();
    const instance2 = ReviewerQueue.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should initialize with correct queue name', () => {
    expect(queue.getQueue().name).toBe(QueueName.REVIEWER);
  });

  describe('process', () => {
    const mockDraft = {
      version: 1,
      subject: 'Test Subject',
      body: 'Test Body',
    };

    const mockEmailRecord = {
      _id: 'email-id',
      drafts: [mockDraft],
    };

    beforeEach(() => {
      (GeneratedEmail.findById as jest.Mock).mockResolvedValue(mockEmailRecord);
      (GeneratedEmail.findOneAndUpdate as jest.Mock).mockResolvedValue({});
      (GeneratedEmail.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
    });

    it('should process review job and approve draft', async () => {
      const mockJob = {
        id: 'test-job-id',
        data: {
          generatedEmailId: 'email-id',
          draftId: 'draft-1',
          version: 1,
        },
      } as Job;

      await queue.processJob(mockJob, jest.fn());

      expect(GeneratedEmail.findById).toHaveBeenCalledWith('email-id');
      expect(GeneratedEmail.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: 'email-id',
          'drafts.version': 1,
        },
        expect.objectContaining({
          $set: expect.objectContaining({
            'drafts.$.reviewStatus': 'approved',
            status: 'completed',
          }),
        })
      );
    });

    it('should handle missing email record', async () => {
      const mockJob = {
        id: 'test-job-id',
        data: {
          generatedEmailId: 'email-id',
          draftId: 'draft-1',
          version: 1,
        },
      } as Job;

      (GeneratedEmail.findById as jest.Mock).mockResolvedValue(null);

      const mockDone = jest.fn();
      await queue.processJob(mockJob, mockDone);

      expect(mockDone).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Generated email record not found',
        })
      );

      expect(GeneratedEmail.findByIdAndUpdate).toHaveBeenCalledWith(
        'email-id',
        {
          status: 'failed',
          failedReason: 'Review failed: Generated email record not found',
        }
      );
    });

    it('should handle missing draft version', async () => {
      const mockJob = {
        id: 'test-job-id',
        data: {
          generatedEmailId: 'email-id',
          draftId: 'draft-1',
          version: 2, // Non-existent version
        },
      } as Job;

      const mockDone = jest.fn();
      await queue.processJob(mockJob, mockDone);

      expect(mockDone).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Draft version 2 not found',
        })
      );

      expect(GeneratedEmail.findByIdAndUpdate).toHaveBeenCalledWith(
        'email-id',
        {
          status: 'failed',
          failedReason: 'Review failed: Draft version 2 not found',
        }
      );
    });

    it('should handle processing errors', async () => {
      const mockJob = {
        id: 'test-job-id',
        data: {
          generatedEmailId: 'email-id',
          draftId: 'draft-1',
          version: 1,
        },
      } as Job;

      const testError = new Error('Database error');
      (GeneratedEmail.findById as jest.Mock).mockRejectedValue(testError);

      const mockDone = jest.fn();
      await queue.processJob(mockJob, mockDone);

      expect(mockDone).toHaveBeenCalledWith(testError);
      expect(GeneratedEmail.findByIdAndUpdate).toHaveBeenCalledWith(
        'email-id',
        {
          status: 'failed',
          failedReason: 'Review failed: Database error',
        }
      );
    });
  });
});
