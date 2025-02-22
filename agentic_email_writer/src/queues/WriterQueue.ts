import { Job } from 'bull';
import { BaseQueue } from './BaseQueue';
import { QueueName, WriterJobData } from './config';
import { GeneratedEmail, Contact, User } from '../models';

export class WriterQueue extends BaseQueue<WriterJobData> {
  private static instance: WriterQueue;

  private constructor() {
    super(QueueName.WRITER);
  }

  public static getInstance(): WriterQueue {
    if (!WriterQueue.instance) {
      WriterQueue.instance = new WriterQueue();
    }
    return WriterQueue.instance;
  }

  protected async process(job: Job<WriterJobData>): Promise<void> {
    const { generatedEmailId, articles, contactId, userId } = job.data;

    try {
      // Fetch necessary data
      const [contact, user, emailRecord] = await Promise.all([
        Contact.findById(contactId).populate('company'),
        User.findById(userId),
        GeneratedEmail.findById(generatedEmailId),
      ]);

      if (!contact || !user || !emailRecord) {
        throw new Error('Required data not found');
      }

      // TODO: Implement language model integration
      // For now, we'll use placeholder data
      const draft = {
        subject: `Following up on recent developments at ${
          (contact.company as any).name
        }`,
        body: `Dear ${contact.name},

I hope this email finds you well. I noticed some interesting developments at ${
          (contact.company as any).name
        } and wanted to reach out.

[Insert personalized content based on articles]

I would love to discuss how we might be able to collaborate.

Best regards,
${user.name}
${user.title}`,
        version: 1,
        createdAt: new Date(),
        reviewStatus: 'pending' as const,
      };

      // Update GeneratedEmail with the draft
      await GeneratedEmail.findByIdAndUpdate(
        generatedEmailId,
        {
          $push: { drafts: draft },
          $set: { status: 'reviewing' }, // Move to next stage
        },
        { new: true }
      );

      // Log progress
      console.log(
        `Email draft generated for ${generatedEmailId}, version ${draft.version}`
      );
    } catch (error) {
      // Update GeneratedEmail with failure status
      await GeneratedEmail.findByIdAndUpdate(generatedEmailId, {
        status: 'failed',
        failedReason: `Writing failed: ${(error as Error).message}`,
      });

      throw error;
    }
  }
}

// Export singleton instance
export const writerQueue = WriterQueue.getInstance();
