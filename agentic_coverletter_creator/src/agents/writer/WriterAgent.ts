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
 * Approach options for cover letter generation
 */
export enum CoverLetterApproach {
  STANDARD = 'STANDARD', // Default approach
  ACHIEVEMENT_FOCUSED = 'ACHIEVEMENT_FOCUSED',
  COMPANY_CULTURE_MATCH = 'COMPANY_CULTURE_MATCH',
  SKILLS_HIGHLIGHT = 'SKILLS_HIGHLIGHT',
  REQUIREMENTS_TABLE = 'REQUIREMENTS_TABLE', // Template with requirements-qualifications table
  CUSTOM_TEMPLATE = 'CUSTOM_TEMPLATE', // For user's successful template
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
  approach?: CoverLetterApproach;
}

/**
 * Options for multiple cover letter generation
 */
export interface MultiCoverLetterOptions extends CoverLetterOptions {
  variations: {
    count: number;
    approaches: CoverLetterApproach[];
  };
  customTemplate?: string; // Optional custom template text
}

/**
 * Result of cover letter generation
 */
export interface CoverLetterResult {
  coverLetter: string;
  approach?: CoverLetterApproach;
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
 * Result of multiple cover letter generation
 */
export interface MultiCoverLetterResult {
  coverLetters: CoverLetterResult[];
  metadata: {
    totalGenerationTime: number;
    totalTokenUsage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
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
    // If an approach is specified, use the appropriate prompt creation method
    if (options.approach) {
      return this.createPromptForApproach(options, options.approach);
    }

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
   * Creates a prompt for a specific cover letter approach
   * @param options The cover letter options
   * @param approach The approach to use
   * @returns The generated prompt
   */
  private createPromptForApproach(
    options: CoverLetterOptions,
    approach: CoverLetterApproach
  ): string {
    switch (approach) {
      case CoverLetterApproach.ACHIEVEMENT_FOCUSED:
        return this.createAchievementFocusedPrompt(options);
      case CoverLetterApproach.COMPANY_CULTURE_MATCH:
        return this.createCompanyCultureMatchPrompt(options);
      case CoverLetterApproach.SKILLS_HIGHLIGHT:
        return this.createSkillsHighlightPrompt(options);
      case CoverLetterApproach.REQUIREMENTS_TABLE:
        return this.createRequirementsTablePrompt(options);
      case CoverLetterApproach.CUSTOM_TEMPLATE:
        // Check if options has customTemplate property (which would mean it's MultiCoverLetterOptions)
        if ('customTemplate' in options && options.customTemplate) {
          return this.createCustomTemplatePrompt(
            options as MultiCoverLetterOptions
          );
        }
        throw new Error(
          'Custom template is required for CUSTOM_TEMPLATE approach'
        );
      case CoverLetterApproach.STANDARD:
      default:
        // Use the standard prompt creation method
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
        const toneInstructions =
          DEFAULT_TEMPLATES.TONE_INSTRUCTIONS[options.tone];

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
  }

  /**
   * Creates a prompt for achievement-focused cover letter
   * @param options The cover letter options
   * @returns The generated prompt
   */
  private createAchievementFocusedPrompt(options: CoverLetterOptions): string {
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

    // Add achievement-focused instructions
    prompt += `\n\n<ApproachInstructions type="ACHIEVEMENT_FOCUSED">
  <Description>Create a cover letter that emphasizes the candidate's specific achievements and measurable results</Description>
  <Guidelines>
    <Item>Focus on quantifiable achievements and metrics (e.g., percentages, dollar amounts, time saved)</Item>
    <Item>Highlight specific projects or initiatives where the candidate made a significant impact</Item>
    <Item>Use action verbs and concrete examples rather than general statements</Item>
    <Item>Connect past achievements to potential future contributions at the company</Item>
    <Item>Include at least 3-4 specific achievements with measurable results</Item>
  </Guidelines>
  <Structure>
    <Section>Opening paragraph introducing the candidate and position</Section>
    <Section>2-3 paragraphs highlighting specific achievements with measurable results</Section>
    <Section>Closing paragraph connecting achievements to potential value for the company</Section>
  </Structure>
</ApproachInstructions>`;

    // Add custom instructions if provided
    if (options.customInstructions) {
      prompt += `\n\n<AdditionalInstructions>
  <Content>${options.customInstructions}</Content>
</AdditionalInstructions>`;
    }

    return prompt;
  }

  /**
   * Creates a prompt for company culture match cover letter
   * @param options The cover letter options
   * @returns The generated prompt
   */
  private createCompanyCultureMatchPrompt(options: CoverLetterOptions): string {
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

    // Add company culture match instructions
    prompt += `\n\n<ApproachInstructions type="COMPANY_CULTURE_MATCH">
  <Description>Create a cover letter that emphasizes the alignment between the candidate's values and the company's culture</Description>
  <Guidelines>
    <Item>Research and reference the company's mission, vision, and values</Item>
    <Item>Highlight specific examples of how the candidate has demonstrated similar values in past roles</Item>
    <Item>Show genuine enthusiasm for the company's products, services, or initiatives</Item>
    <Item>Explain why the candidate is attracted to the company's culture specifically</Item>
    <Item>Demonstrate knowledge of the company beyond surface-level information</Item>
  </Guidelines>
  <Structure>
    <Section>Opening paragraph expressing enthusiasm for the company's mission and values</Section>
    <Section>1-2 paragraphs connecting candidate's values to company culture with specific examples</Section>
    <Section>1 paragraph highlighting relevant skills and experience</Section>
    <Section>Closing paragraph emphasizing cultural fit and potential contributions</Section>
  </Structure>
</ApproachInstructions>`;

    // Add custom instructions if provided
    if (options.customInstructions) {
      prompt += `\n\n<AdditionalInstructions>
  <Content>${options.customInstructions}</Content>
</AdditionalInstructions>`;
    }

    return prompt;
  }

  /**
   * Creates a prompt for skills highlight cover letter
   * @param options The cover letter options
   * @returns The generated prompt
   */
  private createSkillsHighlightPrompt(options: CoverLetterOptions): string {
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

    // Add skills highlight instructions
    prompt += `\n\n<ApproachInstructions type="SKILLS_HIGHLIGHT">
  <Description>Create a cover letter that clearly maps the candidate's skills to the job requirements</Description>
  <Guidelines>
    <Item>Analyze the job description to identify key required skills and qualifications</Item>
    <Item>Organize the letter around 3-5 core skills that directly match the job requirements</Item>
    <Item>For each skill, provide a specific example of how the candidate has demonstrated it</Item>
    <Item>Use bold formatting to highlight key skills throughout the letter</Item>
    <Item>Include both technical/hard skills and soft skills relevant to the position</Item>
  </Guidelines>
  <Structure>
    <Section>Brief opening paragraph introducing the candidate and position</Section>
    <Section>3-5 paragraphs, each focusing on a specific skill with concrete examples</Section>
    <Section>Closing paragraph summarizing the skill match and expressing interest</Section>
  </Structure>
</ApproachInstructions>`;

    // Add custom instructions if provided
    if (options.customInstructions) {
      prompt += `\n\n<AdditionalInstructions>
  <Content>${options.customInstructions}</Content>
</AdditionalInstructions>`;
    }

    return prompt;
  }

  /**
   * Creates a prompt for requirements table cover letter
   * @param options The cover letter options
   * @returns The generated prompt
   */
  private createRequirementsTablePrompt(options: CoverLetterOptions): string {
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

    // Add requirements table instructions
    prompt += `\n\n<ApproachInstructions type="REQUIREMENTS_TABLE">
  <Description>Create a cover letter with a three-part structure including a requirements-qualifications table</Description>
  <Guidelines>
    <Item>Extract 5-7 key requirements from the job description</Item>
    <Item>Create a two-column table mapping job requirements to the candidate's qualifications</Item>
    <Item>Keep the introduction and closing paragraphs concise and focused</Item>
    <Item>Format the table clearly with proper alignment and spacing</Item>
    <Item>Address any potential gaps and highlight continuous learning</Item>
  </Guidelines>
  <Structure>
    <Section>Brief introduction expressing interest in the position and highlighting key personal traits</Section>
    <Section>A two-column table with "Your Requirements" and "My Qualifications" headings</Section>
    <Section>Closing paragraph selling why the candidate is a good fit and addressing any gaps</Section>
  </Structure>
  <TableFormat>
    Your Requirements | My Qualifications
    -----------------|------------------
    [Requirement 1]   | [Qualification 1]
    [Requirement 2]   | [Qualification 2]
    ...               | ...
  </TableFormat>
</ApproachInstructions>`;

    // Add custom instructions if provided
    if (options.customInstructions) {
      prompt += `\n\n<AdditionalInstructions>
  <Content>${options.customInstructions}</Content>
</AdditionalInstructions>`;
    }

    return prompt;
  }

  /**
   * Creates a prompt for custom template cover letter
   * @param options The cover letter options with custom template
   * @returns The generated prompt
   */
  private createCustomTemplatePrompt(options: MultiCoverLetterOptions): string {
    // We already checked for customTemplate in the calling method, but double-check here
    if (!options.customTemplate) {
      throw new Error(
        'Custom template is required for CUSTOM_TEMPLATE approach'
      );
    }

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

    // Add custom template instructions
    prompt += `\n\n<ApproachInstructions type="CUSTOM_TEMPLATE">
  <Description>Create a cover letter based on the provided custom template, adapting it to the current job application</Description>
  <Guidelines>
    <Item>Use the provided template as a structural and stylistic guide</Item>
    <Item>Maintain the overall flow, tone, and approach of the template</Item>
    <Item>Replace specific details with information relevant to the current job and company</Item>
    <Item>Preserve any particularly effective phrases or techniques from the template</Item>
    <Item>Ensure the final letter feels personalized to this specific application</Item>
  </Guidelines>
  <CustomTemplate>
    ${options.customTemplate}
  </CustomTemplate>
</ApproachInstructions>`;

    // Add custom instructions if provided
    if (options.customInstructions) {
      prompt += `\n\n<AdditionalInstructions>
  <Content>${options.customInstructions}</Content>
</AdditionalInstructions>`;
    }

    return prompt;
  }

  /**
   * Generates multiple cover letters with different approaches
   * @param options Options for multiple cover letter generation
   * @returns Promise resolving to multiple generated cover letters
   */
  public async generateMultipleCoverLetters(
    options: MultiCoverLetterOptions
  ): Promise<MultiCoverLetterResult> {
    logger.info(
      `Generating ${options.variations.count} cover letters for ${options.candidateName} applying to ${options.companyName}`
    );

    // Validate options
    this.validateOptions(options);

    // Validate variations
    if (
      !options.variations ||
      !options.variations.approaches ||
      options.variations.approaches.length === 0
    ) {
      throw new Error(
        'At least one approach must be specified for multiple cover letter generation'
      );
    }

    if (options.variations.approaches.length !== options.variations.count) {
      throw new Error(
        'Number of approaches must match the count of variations'
      );
    }

    // Check for CUSTOM_TEMPLATE approach without a template
    if (
      options.variations.approaches.includes(
        CoverLetterApproach.CUSTOM_TEMPLATE
      ) &&
      !options.customTemplate
    ) {
      throw new Error(
        'Custom template is required when using CUSTOM_TEMPLATE approach'
      );
    }

    // Track total generation time
    const startTime = Date.now();

    // Generate cover letters in parallel
    const coverLetterPromises = options.variations.approaches.map(
      async (approach) => {
        // Create a copy of options with the specific approach
        const approachOptions: CoverLetterOptions = {
          ...options,
          approach,
        };

        try {
          // Generate cover letter with the specific approach
          const result = await this.generateCoverLetter(approachOptions);

          // Add approach information to the result
          return {
            ...result,
            approach,
          };
        } catch (error) {
          logger.error(
            `Error generating cover letter with approach ${approach}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
          throw error;
        }
      }
    );

    try {
      // Wait for all cover letters to be generated
      const coverLetters = await Promise.all(coverLetterPromises);

      // Calculate total generation time
      const totalGenerationTime = Date.now() - startTime;

      // Calculate total token usage
      const totalTokenUsage = coverLetters.reduce(
        (total, result) => {
          return {
            promptTokens:
              total.promptTokens + result.metadata.tokenUsage.promptTokens,
            completionTokens:
              total.completionTokens +
              result.metadata.tokenUsage.completionTokens,
            totalTokens:
              total.totalTokens + result.metadata.tokenUsage.totalTokens,
          };
        },
        { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      );

      logger.info(
        `Generated ${coverLetters.length} cover letters successfully in ${totalGenerationTime}ms`
      );

      // Return result
      return {
        coverLetters,
        metadata: {
          totalGenerationTime,
          totalTokenUsage,
        },
      };
    } catch (error) {
      logger.error(
        `Error generating multiple cover letters: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      throw error;
    }
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
