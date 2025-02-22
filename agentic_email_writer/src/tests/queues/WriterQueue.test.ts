import { Job } from 'bull';
import { WriterQueue } from '../../queues/WriterQueue';
import { GeneratedEmail, Contact, User } from '../../models';
import { QueueName } from '../../queues/config';

// Mock Bull
jest.mock('bull');

// Mock models
jest.mock('../../models', () => ({
  GeneratedEmail: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
  Contact: {
    findById: jest.fn(),
  },
  User: {
    findById: jest.fn(),
  },
}));

describe('WriterQueue', () => {
  let queue: WriterQueue;

  beforeEach(() => {
    queue = WriterQueue.getInstance();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await queue.close();
  });

  it('should be a singleton', () => {
    const instance1 = WriterQueue.getInstance();
    const instance2 = WriterQueue.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should initialize with correct queue name', () => {
    expect(queue.getQueue().name).toBe(QueueName.WRITER);
  });

  describe('process', () => {
    const mockContact = {
      name: 'John Doe',
      company: {
        name: 'Test Company',
      },
    };

    const mockUser = {
      name: 'Jane Smith',
      title: 'Sales Manager',
    };

    const mockEmailRecord = {
      _id: 'email-id',
    };

    beforeEach(() => {
      (Contact.findById as jest.Mock).mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockContact),
      }));
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (GeneratedEmail.findById as jest.Mock).mockResolvedValue(mockEmailRecord);
      (GeneratedEmail.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
    });

    it('should process writing job and generate draft', async () => {
      const mockJob = {
        id: 'test-job-id',
        data: {
          generatedEmailId: 'email-id',
          articles: ['article1', 'article2'],
          contactId: 'contact-id',
          userId: 'user-id',
        },
      } as Job;

      await queue.processJob(mockJob, jest.fn());

      expect(Contact.findById).toHaveBeenCalledWith('contact-id');
      expect(User.findById).toHaveBeenCalledWith('user-id');
      expect(GeneratedEmail.findById).toHaveBeenCalledWith('email-id');

      expect(GeneratedEmail.findByIdAndUpdate).toHaveBeenCalledWith(
        'email-id',
        expect.objectContaining({
          $push: expect.any(Object),
          $set: { status: 'reviewing' },
        })
      );
    });

    it('should handle missing data errors', async () => {
      const mockJob = {
        id: 'test-job-id',
        data: {
          generatedEmailId: 'email-id',
          articles: [],
          contactId: 'contact-id',
          userId: 'user-id',
        },
      } as Job;

      (Contact.findById as jest.Mock).mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(null),
      }));

      const mockDone = jest.fn();
      await queue.processJob(mockJob, mockDone);

      expect(mockDone).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Required data not found'),
        })
      );

      expect(GeneratedEmail.findByIdAndUpdate).toHaveBeenCalledWith(
        'email-id',
        {
          status: 'failed',
          failedReason: expect.stringContaining('Required data not found'),
        }
      );
    });

    it('should handle processing errors', async () => {
      const mockJob = {
        id: 'test-job-id',
        data: {
          generatedEmailId: 'email-id',
          articles: [],
          contactId: 'contact-id',
          userId: 'user-id',
        },
      } as Job;

      const testError = new Error('Database error');
      (Contact.findById as jest.Mock).mockRejectedValue(testError);

      const mockDone = jest.fn();
      await queue.processJob(mockJob, mockDone);

      expect(mockDone).toHaveBeenCalledWith(testError);
      expect(GeneratedEmail.findByIdAndUpdate).toHaveBeenCalledWith(
        'email-id',
        {
          status: 'failed',
          failedReason: expect.stringContaining('Database error'),
        }
      );
    });
  });
});
