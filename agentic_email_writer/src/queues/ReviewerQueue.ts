import { Job } from 'bull';
import { BaseQueue } from './BaseQueue';
import { QueueName, ReviewerJobData } from './config';
import { GeneratedEmail } from '../models';

interface QualityCheckResult {
  passed: boolean;
  cefrLevel: string;
  issues: string[];
  suggestions: string[];
}

export class ReviewerQueue extends BaseQueue<ReviewerJobData> {
  private static instance: ReviewerQueue;

  private constructor() {
    super(QueueName.REVIEWER);
  }

  public static getInstance(): ReviewerQueue {
    if (!ReviewerQueue.instance) {
      ReviewerQueue.instance = new ReviewerQueue();
    }
    return ReviewerQueue.instance;
  }

  private async performQualityCheck(draft: {
    subject: string;
    body: string;
  }): Promise<QualityCheckResult> {
    // TODO: Implement actual quality checks with language model
    // For now, return placeholder data
    return {
      passed: true,
      cefrLevel: 'C1',
      issues: [],
      suggestions: [
        'Consider adding more specific details about the company developments',
        'You might want to include a clear call to action',
      ],
    };
  }

  protected async process(job: Job<ReviewerJobData>): Promise<void> {
    const { generatedEmailId, draftId, version } = job.data;

    try {
      // Fetch the email record
      const emailRecord = await GeneratedEmail.findById(generatedEmailId);
      if (!emailRecord) {
        throw new Error('Generated email record not found');
      }

      // Find the draft to review
      const draft = emailRecord.drafts.find((d) => d.version === version);
      if (!draft) {
        throw new Error(`Draft version ${version} not found`);
      }

      // Perform quality checks
      const checkResult = await this.performQualityCheck({
        subject: draft.subject,
        body: draft.body,
      });

      if (checkResult.passed) {
        // Update the draft status and add any suggestions
        await GeneratedEmail.findOneAndUpdate(
          {
            _id: generatedEmailId,
            'drafts.version': version,
          },
          {
            $set: {
              'drafts.$.reviewStatus': 'approved',
              'drafts.$.reviewNotes': [
                `CEFR Level: ${checkResult.cefrLevel}`,
                ...checkResult.suggestions,
              ].join('\n'),
              status: 'completed',
              finalDraft: draft,
              completedAt: new Date(),
            },
          }
        );

        console.log(
          `Draft ${version} for email ${generatedEmailId} approved with CEFR level ${checkResult.cefrLevel}`
        );
      } else {
        // If quality checks failed, update status and trigger a new draft
        const reviewNotes = [
          `CEFR Level: ${checkResult.cefrLevel}`,
          'Issues:',
          ...checkResult.issues,
          'Suggestions:',
          ...checkResult.suggestions,
        ].join('\n');

        await GeneratedEmail.findOneAndUpdate(
          {
            _id: generatedEmailId,
            'drafts.version': version,
          },
          {
            $set: {
              'drafts.$.reviewStatus': 'rejected',
              'drafts.$.reviewNotes': reviewNotes,
              status: 'writing', // Return to writing stage
            },
          }
        );

        console.log(
          `Draft ${version} for email ${generatedEmailId} rejected. Requesting revision.`
        );
      }
    } catch (error) {
      // Update GeneratedEmail with failure status
      await GeneratedEmail.findByIdAndUpdate(generatedEmailId, {
        status: 'failed',
        failedReason: `Review failed: ${(error as Error).message}`,
      });

      throw error;
    }
  }
}

// Export singleton instance
export const reviewerQueue = ReviewerQueue.getInstance();
