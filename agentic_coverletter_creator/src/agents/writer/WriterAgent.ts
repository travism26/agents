import { LLMClientFactory } from './clients/LLMClientFactory';
import { LLMClient, LLMGenerationOptions } from './interfaces/LLMClient';
import { PromptTemplate, DEFAULT_TEMPLATES } from './templates/PromptTemplate';
import logger from '../../utils/logger';

/**
 * Tone options for cover letter generation
 */
export enum CoverLetterTone {
  PROFESSIONAL = 'PROFESSIONAL',
  ENTHUSIASTIC = 'ENTHUSIASTIC',
  CONFIDENT = 'CONFIDENT',
  CREATIVE = 'CREATIVE',
  BALANCED = 'BALANCED',
}

/**
 * Options for cover letter generation
 */
export interface CoverLetterOptions {
  candidateName: string;
  jobTitle: string;
  companyName: string;
  companyInfo: string;
  companyValues: string;
  jobDescription: string;
  candidateSkills: string;
  candidateExperience: string;
  candidateEducation: string;
  tone: CoverLetterTone;
  maxLength?: number;
  customInstructions?: string;
}

/**
 * Result of cover letter generation
 */
export interface CoverLetterResult {
  coverLetter: string;
  metadata: {
    model: string;
    tokenUsage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    generationTime: number;
  };
}

/**
 * Agent for generating cover letters using LLMs
 */
export class WriterAgent {
  private llmClient: LLMClient;
  private defaultModel: string;

  /**
   * Creates a new WriterAgent instance
   * @param llmClient Optional LLM client to use (will use best available if not provided)
   * @param defaultModel Default model to use for generation
   */
  constructor(llmClient?: LLMClient, defaultModel: string = 'gpt-4o') {
    // Use provided client or get best available
    this.llmClient = llmClient || this.getBestAvailableClient();
    this.defaultModel = defaultModel;

    logger.info(
      `WriterAgent initialized with ${this.llmClient.getName()} client`
    );
  }

  /**
   * Gets the best available LLM client
   * @returns The best available LLM client
   * @throws Error if no configured clients are available
   */
  private getBestAvailableClient(): LLMClient {
    const factory = LLMClientFactory.getInstance();
    const client = factory.getBestAvailableClient();

    if (!client) {
      throw new Error('No configured LLM clients available');
    }

    return client;
  }

  /**
   * Generates a cover letter based on the provided options
   * @param options Options for cover letter generation
   * @returns Promise resolving to the generated cover letter
   */
  public async generateCoverLetter(
    options: CoverLetterOptions
  ): Promise<CoverLetterResult> {
    logger.info(
      `Generating cover letter for ${options.candidateName} applying to ${options.companyName}`
    );

    // Validate options
    this.validateOptions(options);

    // Create prompt
    const prompt = this.createPrompt(options);

    // Set generation options
    const generationOptions: LLMGenerationOptions = {
      model: this.defaultModel,
      systemPrompt: DEFAULT_TEMPLATES.SYSTEM_PROMPT,
      temperature: 0.7,
      maxTokens: options.maxLength
        ? Math.min(options.maxLength * 1.5, 2000)
        : 1500,
    };

    // Track generation time
    const startTime = Date.now();

    try {
      // Generate cover letter
      const result = await this.llmClient.generate(prompt, generationOptions);

      // Calculate generation time
      const generationTime = Date.now() - startTime;

      logger.info(`Cover letter generated successfully in ${generationTime}ms`);

      // Return result
      return {
        coverLetter: result.text,
        metadata: {
          model: result.model,
          tokenUsage: {
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
            totalTokens: result.usage.totalTokens,
          },
          generationTime,
        },
      };
    } catch (error) {
      logger.error(
        `Error generating cover letter: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      throw error;
    }
  }

  /**
   * Validates the cover letter options
   * @param options The options to validate
   * @throws Error if options are invalid
   */
  private validateOptions(options: CoverLetterOptions): void {
    const requiredFields: (keyof CoverLetterOptions)[] = [
      'candidateName',
      'jobTitle',
      'companyName',
      'companyInfo',
      'jobDescription',
      'candidateSkills',
      'candidateExperience',
      'candidateEducation',
    ];

    // Check required fields
    for (const field of requiredFields) {
      if (
        !options[field] ||
        (typeof options[field] === 'string' && options[field].trim() === '')
      ) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate tone
    if (!options.tone) {
      options.tone = CoverLetterTone.PROFESSIONAL;
    } else if (!Object.values(CoverLetterTone).includes(options.tone)) {
      throw new Error(`Invalid tone: ${options.tone}`);
    }
  }

  /**
   * Creates a prompt for cover letter generation
   * @param options The cover letter options
   * @returns The generated prompt
   */
  private createPrompt(options: CoverLetterOptions): string {
    // Create template
    const template = new PromptTemplate(DEFAULT_TEMPLATES.COVER_LETTER);

    // Set variables
    template.setVariables({
      candidateName: options.candidateName,
      jobTitle: options.jobTitle,
      companyName: options.companyName,
      companyInfo: options.companyInfo,
      companyValues: options.companyValues || 'Not specified',
      jobDescription: options.jobDescription,
      candidateSkills: options.candidateSkills,
      candidateExperience: options.candidateExperience,
      candidateEducation: options.candidateEducation,
      tone: options.tone,
    });

    // Get tone instructions
    const toneInstructions = DEFAULT_TEMPLATES.TONE_INSTRUCTIONS[options.tone];

    // Render the template
    let prompt = template.render();

    // Add tone instructions
    if (toneInstructions) {
      prompt += `\n\n${toneInstructions}`;
    }

    // Add custom instructions if provided
    if (options.customInstructions) {
      prompt += `\n\n<AdditionalInstructions>
  <Content>${options.customInstructions}</Content>
</AdditionalInstructions>`;
    }

    return prompt;
  }

  /**
   * Gets the token usage statistics for the LLM client
   * @returns The token usage statistics
   */
  public getTokenUsage(): {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    totalRequests: number;
    failedRequests: number;
  } {
    return this.llmClient.getTokenUsage();
  }

  /**
   * Gets the name of the LLM client
   * @returns The name of the LLM client
   */
  public getLLMClientName(): string {
    return this.llmClient.getName();
  }
}
