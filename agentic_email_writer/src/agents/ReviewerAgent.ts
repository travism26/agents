import {
  BaseAgent,
  BaseAgentConfig,
  BaseAgentResult,
  AgentStatus,
} from './BaseAgent';
import { IGeneratedEmail, IEmailDraft } from '../models/GeneratedEmail';
import { CEFRValidator, CEFRLevel } from '../utils/CEFRValidator';

/**
 * Configuration interface for ReviewerAgent
 */
export interface ReviewerAgentConfig extends BaseAgentConfig {
  minCEFRLevel?: CEFRLevel;
  maxRevisions?: number;
  styleGuide?: {
    tone?: 'formal' | 'casual' | 'friendly';
    length?: 'concise' | 'standard' | 'detailed';
    emphasis?: 'business' | 'technical' | 'personal';
  };
}

/**
 * Input data interface for the reviewer agent
 */
export interface ReviewerInput {
  emailDoc: IGeneratedEmail & {
    drafts: IEmailDraft[];
  };
}

/**
 * Result interface for the reviewer agent
 */
export interface ReviewerResult extends BaseAgentResult {
  approved: boolean;
  feedback?: string[];
  cefrLevel?: CEFRLevel;
  revisionNeeded?: boolean;
}

export class ReviewerAgent extends BaseAgent {
  private readonly minCEFRLevel: CEFRLevel;
  private readonly maxRevisions: number;
  private readonly styleGuide: Required<ReviewerAgentConfig>['styleGuide'];

  constructor(config: ReviewerAgentConfig) {
    super(config);

    this.minCEFRLevel = config.minCEFRLevel || CEFRLevel.B2;
    this.maxRevisions = config.maxRevisions || 3;
    this.styleGuide = {
      tone: config.styleGuide?.tone || 'formal',
      length: config.styleGuide?.length || 'standard',
      emphasis: config.styleGuide?.emphasis || 'business',
    };
  }

  /**
   * Validate CEFR language level
   */
  private validateLanguageLevel(text: string): {
    valid: boolean;
    level: CEFRLevel;
    issues: string[];
  } {
    const result = CEFRValidator.meetsMinimumLevel(text, this.minCEFRLevel);
    return {
      valid: result.meets,
      level: result.actual,
      issues: result.issues,
    };
  }

  /**
   * Validate style guidelines
   */
  private validateStyle(draft: IEmailDraft): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check tone
    if (this.styleGuide.tone === 'formal') {
      if (/\b(hey|hi|hello)\b/i.test(draft.body)) {
        issues.push('Informal greeting detected in formal context');
      }
      if (/!{2,}|\?{2,}|\.{3,}/g.test(draft.body)) {
        issues.push('Excessive punctuation in formal context');
      }
    }

    // Check length
    const wordCount = draft.body.split(/\s+/).length;
    switch (this.styleGuide.length) {
      case 'concise':
        if (wordCount > 150) {
          issues.push('Email exceeds concise length guideline (max 150 words)');
        }
        break;
      case 'standard':
        if (wordCount > 300) {
          issues.push(
            'Email exceeds standard length guideline (max 300 words)'
          );
        }
        break;
      case 'detailed':
        if (wordCount > 500) {
          issues.push(
            'Email exceeds detailed length guideline (max 500 words)'
          );
        }
        break;
    }

    // Check emphasis
    if (this.styleGuide.emphasis === 'business') {
      if (
        !/\b(meeting|discuss|opportunity|business|collaboration)\b/i.test(
          draft.body
        )
      ) {
        issues.push('Lacks clear business focus or call to action');
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Process the review request
   */
  public async process(input: ReviewerInput): Promise<ReviewerResult> {
    try {
      this.status = AgentStatus.PROCESSING;

      // Update email status
      await this.updateGeneratedEmail(input.emailDoc, {
        status: 'reviewing',
      } as Partial<IGeneratedEmail>);

      const latestDraft =
        input.emailDoc.drafts[input.emailDoc.drafts.length - 1];
      const combinedText = `${latestDraft.subject}\n\n${latestDraft.body}`;

      // Validate CEFR level
      const languageValidation = this.validateLanguageLevel(combinedText);

      // Validate style guidelines
      const styleValidation = this.validateStyle(latestDraft);

      // Combine all validation issues
      const allIssues = [
        ...languageValidation.issues,
        ...styleValidation.issues,
      ];

      // Determine if revision is needed
      const revisionNeeded = allIssues.length > 0;
      const revisionPossible = input.emailDoc.drafts.length < this.maxRevisions;

      if (!revisionNeeded) {
        // Email meets all criteria
        await this.updateGeneratedEmail(input.emailDoc, {
          status: 'completed',
          finalDraft: latestDraft,
          completedAt: new Date(),
        } as Partial<IGeneratedEmail>);

        this.status = AgentStatus.SUCCESS;
        return {
          success: true,
          status: this.status,
          approved: true,
          cefrLevel: languageValidation.level,
        };
      } else if (revisionPossible) {
        // Revision needed and possible
        await this.updateGeneratedEmail(input.emailDoc, {
          status: 'writing', // Send back to writer for revision
        } as Partial<IGeneratedEmail>);

        this.status = AgentStatus.SUCCESS;
        return {
          success: true,
          status: this.status,
          approved: false,
          feedback: allIssues,
          cefrLevel: languageValidation.level,
          revisionNeeded: true,
        };
      } else {
        // Max revisions reached
        await this.updateGeneratedEmail(input.emailDoc, {
          status: 'failed',
          failedReason: `Failed to meet quality standards after ${this.maxRevisions} revisions`,
        } as Partial<IGeneratedEmail>);

        this.status = AgentStatus.FAILED;
        return {
          success: false,
          status: this.status,
          approved: false,
          feedback: [
            `Maximum revisions (${this.maxRevisions}) reached`,
            ...allIssues,
          ],
          cefrLevel: languageValidation.level,
        };
      }
    } catch (error) {
      await this.handleError(error as Error);

      // Update email document with failure
      await this.updateGeneratedEmail(input.emailDoc, {
        status: 'failed',
        failedReason: `Review failed: ${(error as Error).message}`,
      } as Partial<IGeneratedEmail>);

      return {
        success: false,
        status: this.status,
        approved: false,
        error: error as Error,
      };
    }
  }
}
