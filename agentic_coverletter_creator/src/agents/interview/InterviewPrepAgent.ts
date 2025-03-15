import {
  ResearchAgent,
  CompanyResearchResult,
} from '../research/ResearchAgent';
import {
  LLMClient,
  LLMGenerationOptions,
} from '../writer/interfaces/LLMClient';
import { LLMClientFactory } from '../writer/clients/LLMClientFactory';
import { InterviewPrepCache } from './InterviewPrepCache';
import { InterviewPrompts } from './templates/InterviewPrompts';
import {
  InterviewPrepOptions,
  InterviewPrepResult,
  Question,
  TalkingPoint,
  ChecklistItem,
} from './interfaces/InterviewTypes';
import logger from '../../utils/logger';

/**
 * Agent responsible for generating interview preparation materials
 */
export class InterviewPrepAgent {
  private researchAgent: ResearchAgent;
  private cache: InterviewPrepCache;
  private llmClient: LLMClient;

  /**
   * Creates a new InterviewPrepAgent
   * @param researchAgent ResearchAgent instance for company research
   * @param llmClient LLMClient instance for text generation
   * @param cacheOptions Optional cache configuration
   */
  constructor(
    researchAgent: ResearchAgent,
    llmClient: LLMClient,
    cacheOptions?: { ttl?: number }
  ) {
    this.researchAgent = researchAgent;
    this.llmClient = llmClient;
    this.cache = new InterviewPrepCache(cacheOptions);
    logger.info('InterviewPrepAgent initialized');
  }

  /**
   * Creates a new InterviewPrepAgent with default dependencies
   * @param cacheOptions Optional cache configuration
   * @returns A new InterviewPrepAgent instance
   */
  public static createDefault(cacheOptions?: {
    ttl?: number;
  }): InterviewPrepAgent {
    const researchAgent = new ResearchAgent();
    const llmClient =
      LLMClientFactory.getInstance().getBestAvailableClient() ||
      (() => {
        throw new Error('No LLM client available for InterviewPrepAgent');
      })();

    return new InterviewPrepAgent(researchAgent, llmClient, cacheOptions);
  }

  /**
   * Generates interview preparation materials
   * @param companyName The name of the company
   * @param jobDescription The job description
   * @param options Optional customization options
   * @returns Promise resolving to interview preparation results
   */
  async generateInterviewPrep(
    companyName: string,
    jobDescription: string,
    options: InterviewPrepOptions = {}
  ): Promise<InterviewPrepResult> {
    logger.info(`Generating interview prep for ${companyName}`);

    // Check cache first if not forcing refresh
    if (!options.forceRefresh) {
      const cachedResult = await this.cache.get(companyName, jobDescription);
      if (cachedResult) {
        logger.info(`Using cached interview prep for ${companyName}`);
        return cachedResult;
      }
    }

    // Gather company research
    logger.info(`Researching company: ${companyName}`);
    const research = await this.researchAgent.researchCompany(
      companyName,
      jobDescription
    );

    // Extract job role from job description
    const jobRole = this.extractJobRole(jobDescription);

    // Generate different types of questions in parallel
    logger.info('Generating interview questions');
    const [technicalQuestions, culturalQuestions, companyQuestions] =
      await Promise.all([
        this.generateTechnicalQuestions(
          research,
          jobDescription,
          jobRole,
          options
        ),
        this.generateCulturalQuestions(research, jobRole, options),
        this.generateCompanyQuestions(research, jobRole, options),
      ]);

    // Generate talking points based on recent developments
    logger.info('Generating talking points');
    const talkingPoints = await this.generateTalkingPoints(research, jobRole);

    // Create preparation checklist
    logger.info('Creating preparation checklist');
    const checklist = await this.createPreparationChecklist(
      research,
      jobDescription,
      jobRole
    );

    // Extract company insights
    logger.info('Extracting company insights');
    const companyInsights = await this.extractCompanyInsights(research);

    // Combine all results
    const result: InterviewPrepResult = {
      questions: [
        ...technicalQuestions,
        ...culturalQuestions,
        ...companyQuestions,
      ],
      talkingPoints,
      checklist,
      companyInsights,
    };

    // Cache the results
    await this.cache.set(companyName, jobDescription, result);
    logger.info(`Completed interview prep for ${companyName}`);

    return result;
  }

  /**
   * Extracts the job role from the job description
   * @param jobDescription The job description
   * @returns The extracted job role
   */
  private extractJobRole(jobDescription: string): string {
    // Simple extraction based on common job title patterns
    // In a real implementation, this would use more sophisticated NLP
    const titlePatterns = [
      /job title:?\s*([^,\n.]+)/i,
      /position:?\s*([^,\n.]+)/i,
      /role:?\s*([^,\n.]+)/i,
      /seeking\s+a\s+([^,\n.]+)/i,
      /hiring\s+a\s+([^,\n.]+)/i,
    ];

    for (const pattern of titlePatterns) {
      const match = jobDescription.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Default to a generic role if we can't extract one
    return 'Software Developer';
  }

  /**
   * Generates technical interview questions
   * @param research Company research results
   * @param jobDescription The job description
   * @param jobRole The job role
   * @param options Interview preparation options
   * @returns Promise resolving to an array of technical questions
   */
  private async generateTechnicalQuestions(
    research: CompanyResearchResult,
    jobDescription: string,
    jobRole: string,
    options: InterviewPrepOptions
  ): Promise<Question[]> {
    // Extract technologies from job description
    const technologies = this.extractTechnologies(jobDescription);

    // Determine question count
    const count = options.questionCount || 5;

    // Determine difficulty level
    const difficulty = options.difficultyLevel || 'mixed';

    // Skip if not in focus areas
    if (options.focusAreas && !options.focusAreas.includes('technical')) {
      return [];
    }

    // Create prompt for technical questions
    const prompt = InterviewPrompts.technicalQuestions
      .replace(/{count}/g, count.toString())
      .replace(/{company}/g, research.companyName)
      .replace(/{industry}/g, research.companyInfo.industry || 'technology')
      .replace(/{role}/g, jobRole)
      .replace(/{technologies}/g, technologies.join(', '))
      .replace(/{difficulty}/g, difficulty)
      .replace(
        /{includeSuggestedAnswers}/g,
        options.includeSuggestedAnswers ? 'true' : 'false'
      );

    // Generate questions using LLM
    const result = await this.llmClient.generate(prompt, {
      temperature: 0.7,
      maxTokens: 2500,
    });

    // Parse the response into structured questions
    return this.parseQuestionsFromLLMResponse(result.text, 'technical');
  }

  /**
   * Generates cultural fit interview questions
   * @param research Company research results
   * @param jobRole The job role
   * @param options Interview preparation options
   * @returns Promise resolving to an array of cultural questions
   */
  private async generateCulturalQuestions(
    research: CompanyResearchResult,
    jobRole: string,
    options: InterviewPrepOptions
  ): Promise<Question[]> {
    // Determine question count
    const count = options.questionCount || 5;

    // Skip if not in focus areas
    if (options.focusAreas && !options.focusAreas.includes('cultural')) {
      return [];
    }

    // Create prompt for cultural questions
    const prompt = InterviewPrompts.culturalQuestions
      .replace(/{count}/g, count.toString())
      .replace(/{company}/g, research.companyName)
      .replace(/{values}/g, research.companyValues.join(', '))
      .replace(
        /{description}/g,
        research.companyInfo.description || 'A company in the technology sector'
      )
      .replace(/{role}/g, jobRole)
      .replace(
        /{includeSuggestedAnswers}/g,
        options.includeSuggestedAnswers ? 'true' : 'false'
      );

    // Generate questions using LLM
    const result = await this.llmClient.generate(prompt, {
      temperature: 0.7,
      maxTokens: 2500,
    });

    // Parse the response into structured questions
    return this.parseQuestionsFromLLMResponse(result.text, 'cultural');
  }

  /**
   * Generates company-specific interview questions
   * @param research Company research results
   * @param jobRole The job role
   * @param options Interview preparation options
   * @returns Promise resolving to an array of company-specific questions
   */
  private async generateCompanyQuestions(
    research: CompanyResearchResult,
    jobRole: string,
    options: InterviewPrepOptions
  ): Promise<Question[]> {
    // Determine question count
    const count = options.questionCount || 5;

    // Skip if not in focus areas
    if (
      options.focusAreas &&
      !options.focusAreas.includes('company-specific')
    ) {
      return [];
    }

    // Extract recent developments from news
    const recentDevelopments = research.recentNews
      .map((news) => news.title)
      .join('; ');

    // Create prompt for company-specific questions
    const prompt = InterviewPrompts.companyQuestions
      .replace(/{count}/g, count.toString())
      .replace(/{company}/g, research.companyName)
      .replace(/{recentDevelopments}/g, recentDevelopments)
      .replace(/{challenges}/g, 'Market competition and innovation')
      .replace(
        /{industryPosition}/g,
        `A company in the ${
          research.companyInfo.industry || 'technology'
        } industry`
      )
      .replace(
        /{includeSuggestedAnswers}/g,
        options.includeSuggestedAnswers ? 'true' : 'false'
      );

    // Generate questions using LLM
    const result = await this.llmClient.generate(prompt, {
      temperature: 0.7,
      maxTokens: 2500,
    });

    // Parse the response into structured questions
    return this.parseQuestionsFromLLMResponse(result.text, 'company-specific');
  }

  /**
   * Generates talking points for the interview
   * @param research Company research results
   * @param jobRole The job role
   * @returns Promise resolving to an array of talking points
   */
  private async generateTalkingPoints(
    research: CompanyResearchResult,
    jobRole: string
  ): Promise<TalkingPoint[]> {
    // Extract recent news
    const recentNews = research.recentNews.map((news) => news.title).join('; ');

    // Create prompt for talking points
    const prompt = InterviewPrompts.talkingPoints
      .replace(/{company}/g, research.companyName)
      .replace(/{recentNews}/g, recentNews)
      .replace(/{values}/g, research.companyValues.join(', '))
      .replace(/{role}/g, jobRole);

    // Generate talking points using LLM
    const result = await this.llmClient.generate(prompt, {
      temperature: 0.7,
      maxTokens: 2000,
    });

    // Parse the response into structured talking points
    return this.parseTalkingPointsFromLLMResponse(result.text);
  }

  /**
   * Creates a preparation checklist for the interview
   * @param research Company research results
   * @param jobDescription The job description
   * @param jobRole The job role
   * @returns Promise resolving to an array of checklist items
   */
  private async createPreparationChecklist(
    research: CompanyResearchResult,
    jobDescription: string,
    jobRole: string
  ): Promise<ChecklistItem[]> {
    // Create prompt for preparation checklist
    const prompt = InterviewPrompts.preparationChecklist
      .replace(/{company}/g, research.companyName)
      .replace(/{industry}/g, research.companyInfo.industry || 'technology')
      .replace(/{role}/g, jobRole)
      .replace(/{timeline}/g, 'One week before the interview');

    // Generate checklist using LLM
    const result = await this.llmClient.generate(prompt, {
      temperature: 0.7,
      maxTokens: 2000,
    });

    // Parse the response into structured checklist items
    return this.parseChecklistFromLLMResponse(result.text);
  }

  /**
   * Extracts company insights for the interview
   * @param research Company research results
   * @returns Promise resolving to company insights
   */
  private async extractCompanyInsights(
    research: CompanyResearchResult
  ): Promise<InterviewPrepResult['companyInsights']> {
    // Extract recent news
    const recentNews = research.recentNews.map((news) => news.title).join('; ');

    // Create prompt for company insights
    const prompt = InterviewPrompts.companyInsights
      .replace(/{company}/g, research.companyName)
      .replace(
        /{companyResearch}/g,
        research.companyInfo.description || 'A technology company'
      )
      .replace(/{recentNews}/g, recentNews)
      .replace(/{values}/g, research.companyValues.join(', '))
      .replace(/{industryTrends}/g, 'Digital transformation and AI adoption');

    // Generate insights using LLM
    const result = await this.llmClient.generate(prompt, {
      temperature: 0.7,
      maxTokens: 1500,
    });

    // Parse the response into structured insights
    return this.parseCompanyInsightsFromLLMResponse(result.text);
  }

  /**
   * Extracts technologies from a job description
   * @param jobDescription The job description
   * @returns Array of extracted technologies
   */
  private extractTechnologies(jobDescription: string): string[] {
    // Common technologies to look for
    const techKeywords = [
      'JavaScript',
      'TypeScript',
      'Python',
      'Java',
      'C#',
      'C++',
      'React',
      'Angular',
      'Vue',
      'Node.js',
      'Express',
      'Django',
      'Flask',
      'Spring',
      'ASP.NET',
      'Ruby on Rails',
      'SQL',
      'NoSQL',
      'MongoDB',
      'PostgreSQL',
      'MySQL',
      'Oracle',
      'AWS',
      'Azure',
      'GCP',
      'Docker',
      'Kubernetes',
      'CI/CD',
      'Git',
      'REST',
      'GraphQL',
      'Microservices',
      'Serverless',
      'TensorFlow',
      'PyTorch',
      'Machine Learning',
      'AI',
      'Agile',
      'Scrum',
      'Kanban',
      'DevOps',
      'SRE',
    ];

    const foundTechnologies: string[] = [];
    const lowerJobDesc = jobDescription.toLowerCase();

    techKeywords.forEach((tech) => {
      if (lowerJobDesc.includes(tech.toLowerCase())) {
        foundTechnologies.push(tech);
      }
    });

    // If no technologies found, return some generic ones
    if (foundTechnologies.length === 0) {
      return ['JavaScript', 'Python', 'SQL', 'Git', 'Agile'];
    }

    return foundTechnologies;
  }

  /**
   * Parses questions from LLM response
   * @param text The LLM response text
   * @param type The type of questions
   * @returns Array of parsed questions
   */
  private parseQuestionsFromLLMResponse(
    text: string,
    type: 'technical' | 'cultural' | 'company-specific'
  ): Question[] {
    // This is a simplified parser - in a real implementation,
    // we would use more sophisticated parsing techniques
    const questions: Question[] = [];

    // Split by numbered questions (1., 2., etc.)
    const questionBlocks = text.split(/\n\s*\d+\.\s+/).filter(Boolean);

    // Skip the first block if it's an introduction
    const startIndex = questionBlocks[0].trim().length < 100 ? 1 : 0;

    for (let i = startIndex; i < questionBlocks.length; i++) {
      const block = questionBlocks[i].trim();

      // Extract the question content (first line)
      const contentMatch = block.match(/^([^\n]+)/);
      const content = contentMatch ? contentMatch[1].trim() : '';

      // Extract context (usually after "Context:" or similar)
      const contextMatch =
        block.match(/Context:?\s*([^\n]+)(\n|$)/i) ||
        block.match(/Why this is relevant:?\s*([^\n]+)(\n|$)/i);
      const context = contextMatch ? contextMatch[1].trim() : '';

      // Extract suggested answer if present
      const answerMatch =
        block.match(/Suggested Answer:?\s*([\s\S]+?)(?=Follow-up|$)/i) ||
        block.match(/Answer:?\s*([\s\S]+?)(?=Follow-up|$)/i);
      const suggestedAnswer = answerMatch ? answerMatch[1].trim() : undefined;

      // Extract follow-up questions
      const followUpMatch = block.match(
        /Follow-up Questions?:?\s*([\s\S]+?)(?=\n\s*\d+\.|$)/i
      );
      let followUpQuestions: string[] | undefined;

      if (followUpMatch) {
        followUpQuestions = followUpMatch[1]
          .split(/\n\s*[-•*]\s*/)
          .filter(Boolean)
          .map((q) => q.trim());
      }

      // Create the question object
      if (content) {
        questions.push({
          type,
          content,
          context: context || 'Relevant to the position and company',
          difficulty: this.determineDifficulty(content, type),
          relevance: {
            jobRole: true,
            companyValues: type === 'cultural',
            industryTrends: type === 'company-specific',
          },
          suggestedAnswer,
          followUpQuestions,
        });
      }
    }

    return questions;
  }

  /**
   * Determines the difficulty of a question
   * @param question The question text
   * @param type The type of question
   * @returns The difficulty level
   */
  private determineDifficulty(
    question: string,
    type: 'technical' | 'cultural' | 'company-specific'
  ): 'basic' | 'intermediate' | 'advanced' {
    // Simple heuristic based on question length and complexity indicators
    const lowerQuestion = question.toLowerCase();

    // Advanced indicators
    if (
      lowerQuestion.includes('complex') ||
      lowerQuestion.includes('advanced') ||
      lowerQuestion.includes('architect') ||
      lowerQuestion.includes('design a system') ||
      lowerQuestion.includes('optimize') ||
      lowerQuestion.includes('scale') ||
      question.length > 150
    ) {
      return 'advanced';
    }

    // Basic indicators
    if (
      lowerQuestion.includes('basic') ||
      lowerQuestion.includes('simple') ||
      lowerQuestion.includes('define') ||
      lowerQuestion.includes('what is') ||
      lowerQuestion.includes('explain') ||
      question.length < 60
    ) {
      return 'basic';
    }

    // Default to intermediate
    return 'intermediate';
  }

  /**
   * Parses talking points from LLM response
   * @param text The LLM response text
   * @returns Array of parsed talking points
   */
  private parseTalkingPointsFromLLMResponse(text: string): TalkingPoint[] {
    // This is a simplified parser - in a real implementation,
    // we would use more sophisticated parsing techniques
    const talkingPoints: TalkingPoint[] = [];

    // Split by numbered talking points (1., 2., etc.)
    const blocks = text.split(/\n\s*\d+\.\s+/).filter(Boolean);

    // Skip the first block if it's an introduction
    const startIndex = blocks[0].trim().length < 100 ? 1 : 0;

    for (let i = startIndex; i < blocks.length; i++) {
      const block = blocks[i].trim();

      // Extract the topic (first line)
      const topicMatch = block.match(/^([^\n]+)/);
      const topic = topicMatch ? topicMatch[1].trim() : '';

      // Extract context
      const contextMatch =
        block.match(/Context:?\s*([^\n]+)(\n|$)/i) ||
        block.match(/Why this is relevant:?\s*([^\n]+)(\n|$)/i);
      const context = contextMatch ? contextMatch[1].trim() : '';

      // Extract key stats if present
      const statsMatch =
        block.match(/Key Statistics:?\s*([\s\S]+?)(?=Discussion|$)/i) ||
        block.match(/Facts:?\s*([\s\S]+?)(?=Discussion|$)/i);
      let keyStats: string[] | undefined;

      if (statsMatch) {
        keyStats = statsMatch[1]
          .split(/\n\s*[-•*]\s*/)
          .filter(Boolean)
          .map((s) => s.trim());
      }

      // Extract discussion angles
      const anglesMatch =
        block.match(/Discussion Angles:?\s*([\s\S]+?)(?=\n\s*\d+\.|$)/i) ||
        block.match(/Angles:?\s*([\s\S]+?)(?=\n\s*\d+\.|$)/i);
      let discussionAngles: string[] = [];

      if (anglesMatch) {
        discussionAngles = anglesMatch[1]
          .split(/\n\s*[-•*]\s*/)
          .filter(Boolean)
          .map((a) => a.trim());
      }

      // Create the talking point object
      if (topic) {
        talkingPoints.push({
          topic,
          context: context || 'Relevant to the company and position',
          keyStats,
          discussionAngles:
            discussionAngles.length > 0
              ? discussionAngles
              : ['General discussion about the topic'],
        });
      }
    }

    return talkingPoints;
  }

  /**
   * Parses checklist items from LLM response
   * @param text The LLM response text
   * @returns Array of parsed checklist items
   */
  private parseChecklistFromLLMResponse(text: string): ChecklistItem[] {
    // This is a simplified parser - in a real implementation,
    // we would use more sophisticated parsing techniques
    const checklistItems: ChecklistItem[] = [];

    // Split by numbered items (1., 2., etc.)
    const blocks = text.split(/\n\s*\d+\.\s+/).filter(Boolean);

    // Skip the first block if it's an introduction
    const startIndex = blocks[0].trim().length < 100 ? 1 : 0;

    for (let i = startIndex; i < blocks.length; i++) {
      const block = blocks[i].trim();

      // Extract the task (first line)
      const taskMatch = block.match(/^([^\n]+)/);
      const task = taskMatch ? taskMatch[1].trim() : '';

      // Extract category
      const categoryMatch = block.match(/Category:?\s*([^\n]+)(\n|$)/i);
      let category: 'research' | 'preparation' | 'logistics' = 'preparation';

      if (categoryMatch) {
        const categoryText = categoryMatch[1].toLowerCase().trim();
        if (categoryText.includes('research')) {
          category = 'research';
        } else if (categoryText.includes('logistics')) {
          category = 'logistics';
        }
      }

      // Extract priority
      const priorityMatch = block.match(/Priority:?\s*([^\n]+)(\n|$)/i);
      let priority: 'high' | 'medium' | 'low' = 'medium';

      if (priorityMatch) {
        const priorityText = priorityMatch[1].toLowerCase().trim();
        if (priorityText.includes('high')) {
          priority = 'high';
        } else if (priorityText.includes('low')) {
          priority = 'low';
        }
      }

      // Extract timeframe
      const timeframeMatch = block.match(/Timeframe:?\s*([^\n]+)(\n|$)/i);
      const timeframe = timeframeMatch
        ? timeframeMatch[1].trim()
        : 'Before the interview';

      // Extract resources if present
      const resourcesMatch = block.match(
        /Resources:?\s*([\s\S]+?)(?=\n\s*\d+\.|$)/i
      );
      let resources: string[] | undefined;

      if (resourcesMatch) {
        resources = resourcesMatch[1]
          .split(/\n\s*[-•*]\s*/)
          .filter(Boolean)
          .map((r) => r.trim());
      }

      // Create the checklist item object
      if (task) {
        checklistItems.push({
          category,
          task,
          priority,
          timeframe,
          resources,
        });
      }
    }

    return checklistItems;
  }

  /**
   * Parses company insights from LLM response
   * @param text The LLM response text
   * @returns Parsed company insights
   */
  private parseCompanyInsightsFromLLMResponse(
    text: string
  ): InterviewPrepResult['companyInsights'] {
    // This is a simplified parser - in a real implementation,
    // we would use more sophisticated parsing techniques

    // Default empty insights
    const insights: InterviewPrepResult['companyInsights'] = {
      cultureHighlights: [],
      recentDevelopments: [],
      challengesOpportunities: [],
    };

    // Extract culture highlights
    const cultureMatch = text.match(
      /Culture Highlights:?\s*([\s\S]+?)(?=Recent Developments|$)/i
    );
    if (cultureMatch) {
      insights.cultureHighlights = cultureMatch[1]
        .split(/\n\s*[-•*]\s*/)
        .filter(Boolean)
        .map((c) => c.trim());
    }

    // Extract recent developments
    const developmentsMatch = text.match(
      /Recent Developments:?\s*([\s\S]+?)(?=Challenges|$)/i
    );
    if (developmentsMatch) {
      insights.recentDevelopments = developmentsMatch[1]
        .split(/\n\s*[-•*]\s*/)
        .filter(Boolean)
        .map((d) => d.trim());
    }

    // Extract challenges and opportunities
    const challengesMatch = text.match(
      /Challenges and Opportunities:?\s*([\s\S]+?)(?=$)/i
    );
    if (challengesMatch) {
      insights.challengesOpportunities = challengesMatch[1]
        .split(/\n\s*[-•*]\s*/)
        .filter(Boolean)
        .map((c) => c.trim());
    }

    return insights;
  }

  /**
   * Gets the cache instance
   * @returns The InterviewPrepCache instance
   */
  public getCache(): InterviewPrepCache {
    return this.cache;
  }

  /**
   * Sets the cache TTL
   * @param ttlMs TTL in milliseconds
   */
  public setCacheTTL(ttlMs: number): void {
    this.cache = new InterviewPrepCache({ ttl: ttlMs });
  }

  /**
   * Clears the cache
   */
  public clearCache(): void {
    this.cache.clear();
  }
}
