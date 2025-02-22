import OpenAI from 'openai';
import {
  BaseAgent,
  BaseAgentConfig,
  BaseAgentResult,
  AgentStatus,
} from './BaseAgent';
import {
  IGeneratedEmail,
  IEmailDraft,
  INewsArticle,
} from '../models/GeneratedEmail';
import { IContact } from '../models/Contact';
import { ICompany } from '../models/Company';
import { WriterPrompts, PromptVariables } from './prompts/WriterPrompts';

/**
 * Configuration interface for WriterAgent
 */
export interface WriterAgentConfig extends BaseAgentConfig {
  openaiApiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Input data interface for the writer agent
 */
export interface WriterInput {
  emailDoc: IGeneratedEmail & {
    contact: IContact & {
      company: ICompany;
    };
    articles: INewsArticle[];
    drafts?: IEmailDraft[];
  };
  senderName: string;
  senderTitle: string;
  senderCompany: string;
  style?: {
    tone?: 'formal' | 'casual' | 'friendly';
    length?: 'concise' | 'standard' | 'detailed';
    emphasis?: 'business' | 'technical' | 'personal';
  };
}

/**
 * Result interface for the writer agent
 */
export interface WriterResult extends BaseAgentResult {
  draft?: IEmailDraft;
}

interface EmailResponse {
  subject: string;
  body: string;
}

export class WriterAgent extends BaseAgent {
  private openai: OpenAI;
  private readonly model: string;
  private readonly temperature: number;
  private readonly maxTokens: number;

  constructor(config: WriterAgentConfig) {
    super(config);

    if (!config.openaiApiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.openai = new OpenAI({
      apiKey: config.openaiApiKey,
    });

    this.model = config.model || 'gpt-4-turbo-preview';
    this.temperature = config.temperature || 0.7;
    this.maxTokens = config.maxTokens || 2000;
  }

  /**
   * Generate email content using OpenAI
   */
  private async generateEmail(
    vars: PromptVariables,
    template: (vars: PromptVariables) => string = WriterPrompts.baseEmail
  ): Promise<EmailResponse> {
    const response = await this.executeWithTimeout(
      this.openai.chat.completions.create({
        model: this.model,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        messages: [
          {
            role: 'system',
            content: WriterPrompts.system,
          },
          {
            role: 'user',
            content: template(vars),
          },
        ],
      })
    );

    try {
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content generated');
      }

      return JSON.parse(content) as EmailResponse;
    } catch (error) {
      throw new Error(
        `Failed to parse email response: ${(error as Error).message}`
      );
    }
  }

  /**
   * Process the email generation request
   */
  public async process(input: WriterInput): Promise<WriterResult> {
    try {
      this.status = AgentStatus.PROCESSING;

      // Update email status
      await this.updateGeneratedEmail(input.emailDoc, {
        status: 'writing',
      } as Partial<IGeneratedEmail>);

      // Prepare variables for prompt template
      const vars: PromptVariables = {
        companyName: input.emailDoc.contact.company.name,
        contactName: input.emailDoc.contact.name,
        contactTitle: input.emailDoc.contact.title,
        senderName: input.senderName,
        senderTitle: input.senderTitle,
        senderCompany: input.senderCompany,
        articles: input.emailDoc.articles.map((article) => ({
          title: article.title,
          summary: article.summary,
        })),
        style: input.style,
      };

      // Generate email content
      const emailContent = await this.generateEmail(vars);

      // Create new draft
      const draft: IEmailDraft = {
        subject: emailContent.subject,
        body: emailContent.body,
        version: (input.emailDoc.drafts?.length || 0) + 1,
        createdAt: new Date(),
        reviewStatus: 'pending',
      };

      // Update email document with new draft
      await this.updateGeneratedEmail(input.emailDoc, {
        drafts: [...(input.emailDoc.drafts || []), draft],
        status: 'reviewing', // Move to next stage
      } as Partial<IGeneratedEmail>);

      this.status = AgentStatus.SUCCESS;
      return {
        success: true,
        status: this.status,
        draft,
        metadata: {
          model: this.model,
          temperature: this.temperature,
        },
      };
    } catch (error) {
      await this.handleError(error as Error);

      // Update email document with failure
      await this.updateGeneratedEmail(input.emailDoc, {
        status: 'failed',
        failedReason: `Email generation failed: ${(error as Error).message}`,
      } as Partial<IGeneratedEmail>);

      return {
        success: false,
        status: this.status,
        error: error as Error,
      };
    }
  }

  /**
   * Process a revision request
   */
  public async revise(
    emailDoc: IGeneratedEmail & {
      contact: IContact & {
        company: ICompany;
      };
      articles: INewsArticle[];
      drafts: IEmailDraft[];
    },
    feedback: string
  ): Promise<WriterResult> {
    try {
      this.status = AgentStatus.PROCESSING;

      const latestDraft = emailDoc.drafts?.[emailDoc.drafts.length - 1];
      if (!latestDraft) {
        throw new Error('No draft found to revise');
      }

      // Prepare variables for revision template
      const vars: PromptVariables = {
        companyName: emailDoc.contact.company.name,
        contactName: emailDoc.contact.name,
        contactTitle: emailDoc.contact.title,
        senderName: '', // Will be filled from previous draft metadata
        senderTitle: '',
        senderCompany: '',
        articles: emailDoc.articles.map((article) => ({
          title: article.title,
          summary: article.summary,
        })),
      };

      // Generate revised content
      const revisedContent = await this.executeWithTimeout(
        this.openai.chat.completions.create({
          model: this.model,
          temperature: this.temperature,
          max_tokens: this.maxTokens,
          messages: [
            {
              role: 'system',
              content: WriterPrompts.system,
            },
            {
              role: 'user',
              content: WriterPrompts.revision(
                {
                  subject: latestDraft.subject,
                  body: latestDraft.body,
                },
                feedback,
                vars
              ),
            },
          ],
        })
      );

      const content = revisedContent.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content generated for revision');
      }

      const emailContent = JSON.parse(content) as EmailResponse;

      // Create new draft version
      const draft: IEmailDraft = {
        subject: emailContent.subject,
        body: emailContent.body,
        version: latestDraft.version + 1,
        createdAt: new Date(),
        reviewStatus: 'pending',
      };

      // Update email document with new draft
      await this.updateGeneratedEmail(emailDoc, {
        drafts: [...emailDoc.drafts, draft],
        status: 'reviewing',
      } as Partial<IGeneratedEmail>);

      this.status = AgentStatus.SUCCESS;
      return {
        success: true,
        status: this.status,
        draft,
        metadata: {
          model: this.model,
          temperature: this.temperature,
          revisionFeedback: feedback,
        },
      };
    } catch (error) {
      await this.handleError(error as Error);

      // Update email document with failure
      await this.updateGeneratedEmail(emailDoc, {
        status: 'failed',
        failedReason: `Revision failed: ${(error as Error).message}`,
      } as Partial<IGeneratedEmail>);

      return {
        success: false,
        status: this.status,
        error: error as Error,
      };
    }
  }
}
