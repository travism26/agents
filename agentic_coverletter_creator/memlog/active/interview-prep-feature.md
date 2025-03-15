# Interview Preparation Feature

**Created:** 2025-03-15 17:11:43 (America/Moncton, UTC-3:00)  
**Status:** In Progress  
**Priority:** High  
**Related:** cover-letter-agent.md, multiple-cover-letter-feature.md

## Overview

Extend the cover letter generator to include company research and interview preparation capabilities. This feature will leverage the existing ResearchAgent to gather company information and generate tailored interview preparation materials.

## Task List

### Phase 1: Core Interview Prep Infrastructure (5-6 days)

- [x] **1.1 Create Interview Prep Types (1 day)**

  - Create `src/agents/interview/interfaces/InterviewTypes.ts`
  - Define Question, TalkingPoint, ChecklistItem interfaces
  - Define InterviewPrepResult interface

  ```typescript
  // Pseudocode for InterviewTypes.ts
  interface Question {
    type: 'technical' | 'cultural' | 'company-specific';
    content: string;
    context: string;
    difficulty: 'basic' | 'intermediate' | 'advanced';
    relevance: {
      jobRole: boolean;
      companyValues: boolean;
      industryTrends: boolean;
    };
    suggestedAnswer?: string;
    followUpQuestions?: string[];
  }

  interface TalkingPoint {
    topic: string;
    context: string;
    relevantNews?: string[];
    keyStats?: string[];
    discussionAngles: string[];
  }

  interface ChecklistItem {
    category: 'research' | 'preparation' | 'logistics';
    task: string;
    priority: 'high' | 'medium' | 'low';
    timeframe: string;
    resources?: string[];
  }

  interface InterviewPrepResult {
    questions: Question[];
    talkingPoints: TalkingPoint[];
    checklist: ChecklistItem[];
    companyInsights: {
      cultureHighlights: string[];
      recentDevelopments: string[];
      challengesOpportunities: string[];
    };
  }

  interface InterviewPrepOptions {
    questionCount?: number;
    includeSuggestedAnswers?: boolean;
    difficultyLevel?: 'basic' | 'intermediate' | 'advanced' | 'mixed';
    focusAreas?: ('technical' | 'cultural' | 'company-specific')[];
    forceRefresh?: boolean;
  }
  ```

- [x] **1.2 Create Interview Prep Cache (1 day)**

  - Create `src/agents/interview/InterviewPrepCache.ts`
  - Implement caching mechanism for interview prep results

  ```typescript
  // Pseudocode for InterviewPrepCache.ts
  class InterviewPrepCache {
    private cache: Map<
      string,
      { timestamp: number; data: InterviewPrepResult }
    >;
    private cacheTTL: number;

    constructor(options?: { ttl?: number }) {
      this.cache = new Map();
      this.cacheTTL = options?.ttl || 24 * 60 * 60 * 1000; // 24 hours default
    }

    async get(
      companyName: string,
      jobDescription: string
    ): Promise<InterviewPrepResult | undefined> {
      const key = this.generateCacheKey(companyName, jobDescription);
      const cached = this.cache.get(key);

      if (!cached) return undefined;

      // Check if expired
      if (Date.now() - cached.timestamp > this.cacheTTL) {
        this.cache.delete(key);
        return undefined;
      }

      return cached.data;
    }

    async set(
      companyName: string,
      jobDescription: string,
      data: InterviewPrepResult
    ): Promise<void> {
      const key = this.generateCacheKey(companyName, jobDescription);
      this.cache.set(key, {
        timestamp: Date.now(),
        data,
      });
    }

    private generateCacheKey(
      companyName: string,
      jobDescription: string
    ): string {
      // Create a simple hash of the job description
      const jobHash = Buffer.from(jobDescription)
        .toString('base64')
        .substring(0, 10);
      return `${companyName.toLowerCase()}_${jobHash}`;
    }

    clear(): void {
      this.cache.clear();
    }
  }
  ```

- [x] **1.3 Implement InterviewPrepAgent (2-3 days)**

  - Create `src/agents/interview/InterviewPrepAgent.ts`
  - Implement question generation methods
  - Add talking points generation
  - Create preparation checklist generator

  ```typescript
  // Pseudocode for InterviewPrepAgent.ts
  export class InterviewPrepAgent {
    private researchAgent: ResearchAgent;
    private cache: InterviewPrepCache;
    private llmClient: LLMClient;

    constructor(
      researchAgent: ResearchAgent,
      llmClient: LLMClient,
      cacheOptions?: { ttl?: number }
    ) {
      this.researchAgent = researchAgent;
      this.llmClient = llmClient;
      this.cache = new InterviewPrepCache(cacheOptions);
    }

    async generateInterviewPrep(
      companyName: string,
      jobDescription: string,
      options: InterviewPrepOptions = {}
    ): Promise<InterviewPrepResult> {
      // Check cache first
      const cachedResult = await this.cache.get(companyName, jobDescription);
      if (cachedResult && !options.forceRefresh) {
        return cachedResult;
      }

      // Gather company research
      const research = await this.researchAgent.researchCompany(
        companyName,
        jobDescription
      );

      // Generate different types of questions in parallel
      const [technicalQuestions, culturalQuestions, companyQuestions] =
        await Promise.all([
          this.generateTechnicalQuestions(research, jobDescription, options),
          this.generateCulturalQuestions(research, options),
          this.generateCompanyQuestions(research, options),
        ]);

      // Generate talking points based on recent developments
      const talkingPoints = await this.generateTalkingPoints(
        research.recentNews,
        research.companyValues
      );

      // Create preparation checklist
      const checklist = this.createPreparationChecklist(
        research,
        jobDescription
      );

      const result: InterviewPrepResult = {
        questions: [
          ...technicalQuestions,
          ...culturalQuestions,
          ...companyQuestions,
        ],
        talkingPoints,
        checklist,
        companyInsights: {
          cultureHighlights: this.extractCultureHighlights(research),
          recentDevelopments: this.extractRecentDevelopments(research),
          challengesOpportunities:
            this.analyzeChallengesOpportunities(research),
        },
      };

      // Cache the results
      await this.cache.set(companyName, jobDescription, result);

      return result;
    }

    // Helper methods for generating different components
    private async generateTechnicalQuestions(
      research: CompanyResearchResult,
      jobDescription: string,
      options: InterviewPrepOptions
    ): Promise<Question[]> {
      // Implementation details...
    }

    private async generateCulturalQuestions(
      research: CompanyResearchResult,
      options: InterviewPrepOptions
    ): Promise<Question[]> {
      // Implementation details...
    }

    private async generateCompanyQuestions(
      research: CompanyResearchResult,
      options: InterviewPrepOptions
    ): Promise<Question[]> {
      // Implementation details...
    }

    private async generateTalkingPoints(
      recentNews: any[],
      companyValues: string[]
    ): Promise<TalkingPoint[]> {
      // Implementation details...
    }

    private createPreparationChecklist(
      research: CompanyResearchResult,
      jobDescription: string
    ): ChecklistItem[] {
      // Implementation details...
    }

    // Additional helper methods...
  }
  ```

- [x] **1.4 Update Orchestrator (1-2 days)**

  - Update `src/orchestrator/interfaces/OrchestratorTypes.ts` to include interview prep options
  - Modify `src/orchestrator/Orchestrator.ts` to integrate InterviewPrepAgent
  - Update state management for interview prep

  ```typescript
  // Pseudocode for OrchestratorTypes.ts updates
  interface OrchestratorConfig {
    // Existing fields...
    interviewPrep?: {
      enabled: boolean;
      options?: InterviewPrepOptions;
    };
  }

  interface OrchestratorResult {
    // Existing fields...
    interviewPrep?: InterviewPrepResult;
  }
  ```

  ```typescript
  // Pseudocode for Orchestrator.ts updates
  class Orchestrator {
    private interviewPrepAgent?: InterviewPrepAgent;

    constructor(config: OrchestratorConfig) {
      // Existing initialization...

      // Initialize InterviewPrepAgent if enabled
      if (config.interviewPrep?.enabled) {
        this.interviewPrepAgent = new InterviewPrepAgent(
          this.researchAgent,
          this.llmClientFactory.getBestAvailableClient()
        );
      }
    }

    async process(input: OrchestratorInput): Promise<OrchestratorResult> {
      // Existing processing...

      // Add interview prep if enabled
      let interviewPrepResult;
      if (this.interviewPrepAgent && this.config.interviewPrep?.enabled) {
        interviewPrepResult =
          await this.interviewPrepAgent.generateInterviewPrep(
            input.companyName,
            input.jobDescription,
            this.config.interviewPrep.options
          );
      }

      return {
        // Existing fields...
        interviewPrep: interviewPrepResult,
      };
    }
  }
  ```

### Phase 2: API and Controller Updates (2 days)

- [x] **2.1 Update API Endpoints (1 day)**

  - Update `src/controllers/coverLetterController.ts` to include interview prep options
  - Add validation for interview prep options

  ```typescript
  // Pseudocode for coverLetterController.ts updates
  const coverLetterRequestSchema = z.object({
    // Existing fields...
    includeInterviewPrep: z.boolean().optional().default(false),
    interviewPrepOptions: z.object({
      questionCount: z.number().positive().optional(),
      includeSuggestedAnswers: z.boolean().optional(),
      difficultyLevel: z.enum(['basic', 'intermediate', 'advanced', 'mixed']).optional(),
      focusAreas: z.array(z.enum(['technical', 'cultural', 'company-specific'])).optional()
    }).optional()
  });

  async generateCoverLetter(req: Request, res: Response): Promise<void> {
    // Existing validation and processing...

    // Configure orchestrator with interview prep options if requested
    const orchestratorConfig: OrchestratorConfig = {
      // Existing config...
      interviewPrep: validatedData.includeInterviewPrep ? {
        enabled: true,
        options: validatedData.interviewPrepOptions
      } : undefined
    };

    // Process and return results including interview prep if requested
  }
  ```

- [x] **2.2 Create Interview Controller (1 day)**

  - Create `src/controllers/interviewController.ts`
  - Implement standalone interview prep endpoints

  ```typescript
  // Pseudocode for interviewController.ts
  export class InterviewController {
    private interviewPrepAgent: InterviewPrepAgent;
    private inputSanitizer: InputSanitizer;

    constructor() {
      const researchAgent = new ResearchAgent();
      const llmClient = LLMClientFactory.getInstance().getBestAvailableClient();
      this.interviewPrepAgent = new InterviewPrepAgent(
        researchAgent,
        llmClient
      );
      this.inputSanitizer = new InputSanitizer();
    }

    async generateInterviewPrep(req: Request, res: Response): Promise<void> {
      try {
        // Validate request
        const validationResult = interviewPrepRequestSchema.safeParse(req.body);
        if (!validationResult.success) {
          res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid request parameters',
            details: validationResult.error.format(),
          });
          return;
        }

        // Extract and sanitize inputs
        const { companyName, jobDescription, options } = validationResult.data;

        // Generate interview prep
        const interviewPrep =
          await this.interviewPrepAgent.generateInterviewPrep(
            companyName,
            jobDescription,
            options
          );

        // Return results
        res.status(200).json({
          success: true,
          data: interviewPrep,
        });
      } catch (error) {
        // Error handling
      }
    }

    // Additional endpoints for cache management, etc.
  }
  ```

### Phase 3: Integration and Enhancement (2-3 days)

- [x] **3.1 Update Feature Flags (0.5 day)**

  - Update `src/config/featureFlags.ts` to include interview prep feature flag

  ```typescript
  // Pseudocode for featureFlags.ts updates
  export const featureFlags = {
    // Existing flags...
    interviewPrep: {
      enabled: process.env.FEATURE_INTERVIEW_PREP === 'true',
      defaultOptions: {
        questionCount: 10,
        includeSuggestedAnswers: true,
        difficultyLevel: 'mixed',
        focusAreas: ['technical', 'cultural', 'company-specific'],
      },
    },
  };
  ```

- [ ] **3.2 Enhance Research Integration (1-2 days)**

  - Update `src/agents/research/ResearchAgent.ts` to add interview-specific research methods
  - Implement industry trends analysis

  ```typescript
  // Pseudocode for ResearchAgent.ts updates
  export class ResearchAgent {
    // Existing methods...

    async getIndustryTrends(
      companyName: string,
      industry?: string
    ): Promise<{ trends: string[]; sources: SearchResult[] }> {
      // Implementation details...
    }

    async getInterviewExperiences(
      companyName: string
    ): Promise<{ experiences: string[]; sources: SearchResult[] }> {
      // Implementation details...
    }
  }
  ```

- [x] **3.3 Create LLM Prompts for Interview Questions (1 day)**

  - Create `src/agents/interview/templates/InterviewPrompts.ts`
  - Implement prompt templates for different question types

  ```typescript
  // Pseudocode for InterviewPrompts.ts
  export const InterviewPrompts = {
    technicalQuestions: `
      Generate {count} technical interview questions for a {role} position at {company}.
      Focus on these technologies: {technologies}.
      Difficulty level: {difficulty}.
      
      For each question, provide:
      1. The question text
      2. Context about why this is relevant
      3. A suggested answer if {includeSuggestedAnswers} is true
      4. 1-2 potential follow-up questions
    `,

    culturalQuestions: `
      Generate {count} cultural fit questions for {company}, which values: {values}.
      Company description: {description}
      
      For each question, provide:
      1. The question text
      2. Context about why this relates to the company culture
      3. A suggested approach to answering if {includeSuggestedAnswers} is true
    `,

    // Additional prompt templates...
  };
  ```

### Phase 4: Testing and Documentation (3-4 days)

- [ ] **4.1 Add Test Coverage (2-3 days)**

  - Create `tests/agents/interview/InterviewPrepAgent.test.ts`
  - Create `tests/controllers/interviewController.test.ts`
  - Add mock fixtures for interview prep responses

  ```typescript
  // Pseudocode for InterviewPrepAgent.test.ts
  describe('InterviewPrepAgent', () => {
    let interviewPrepAgent: InterviewPrepAgent;
    let mockResearchAgent: jest.Mocked<ResearchAgent>;
    let mockLLMClient: jest.Mocked<LLMClient>;

    beforeEach(() => {
      // Setup mocks and agent instance
    });

    describe('generateInterviewPrep', () => {
      it('should return cached results when available', async () => {
        // Test implementation
      });

      it('should generate new results when cache is empty', async () => {
        // Test implementation
      });

      it('should generate new results when forceRefresh is true', async () => {
        // Test implementation
      });

      // Additional test cases...
    });

    // Additional test suites for helper methods...
  });
  ```

- [x] **4.2 Update Documentation (1 day)**

  - Create `docs/interview-prep.md`
  - Update README.md to include interview prep feature
  - Add API documentation for new endpoints

## Implementation Notes

- The InterviewPrepAgent will leverage the existing ResearchAgent to gather company information
- Caching will be implemented to avoid redundant API calls and improve performance
- The feature will be integrated with the existing cover letter flow but also available as a standalone endpoint
- LLM prompts will be carefully crafted to generate high-quality, relevant interview questions
- The implementation will follow the existing architecture patterns and coding standards

## Future Enhancements

- Add support for industry-specific question templates
- Implement a feedback mechanism to improve question quality over time
- Add support for role-specific preparation checklists
- Integrate with calendar tools for interview scheduling reminders
- Provide company-specific interview process insights

## Updates

**2025-03-15 17:11:43**: Created task list and initial planning
**2025-03-15 17:26:53**: Completed core infrastructure implementation (Phase 1), API and controller updates (Phase 2), feature flags and prompts (Phase 3.1, 3.3), and documentation (Phase 4.2)
**2025-03-15 17:35:44**: Fixed missing LLMClientFactory import in coverLetterController.ts that was causing errors after adding interview prep feature
**2025-03-15 17:37:43**: Added interview preparation routes to index.ts to enable API endpoints for the feature
**2025-03-15 17:48:00**: Updated README.md with detailed examples of how to use the interview prep feature, both as a standalone service and integrated with cover letter generation
**2025-03-15 17:52:27**: Enhanced README.md with comprehensive examples for the interview prep feature, including basic, intermediate, and advanced usage scenarios with all available options
