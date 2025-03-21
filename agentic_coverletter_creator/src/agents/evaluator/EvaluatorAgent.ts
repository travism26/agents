import logger from '../../utils/logger';
import {
  EvaluationCriteria,
  EvaluationCategory,
  ScoreLevel,
  EvaluationOptions,
  EvaluationResult,
  FeedbackItem,
} from './EvaluationCriteria';
import {
  LLMClient,
  LLMGenerationOptions,
} from '../writer/interfaces/LLMClient';

/**
 * Options for the EvaluatorAgent
 */
export interface EvaluatorAgentOptions {
  /**
   * The LLM client to use for evaluations
   */
  llmClient: LLMClient;

  /**
   * Custom evaluation criteria (optional)
   */
  evaluationCriteria?: EvaluationCriteria;

  /**
   * Maximum number of iterations for feedback loop (default: 3)
   */
  maxIterations?: number;

  /**
   * Minimum overall score to consider the cover letter acceptable (default: 75)
   */
  minAcceptableScore?: number;
}

/**
 * Grammar check result
 */
export interface GrammarCheckResult {
  score: number;
  errors: Array<{
    text: string;
    suggestion: string;
    explanation: string;
  }>;
  feedback: string;
}

/**
 * Style check result
 */
export interface StyleCheckResult {
  score: number;
  issues: Array<{
    issue: string;
    suggestion: string;
    explanation: string;
  }>;
  feedback: string;
}

/**
 * Relevance assessment result
 */
export interface RelevanceAssessmentResult {
  score: number;
  strengths: string[];
  weaknesses: string[];
  missingKeywords: string[];
  feedback: string;
}

/**
 * Completeness verification result
 */
export interface CompletenessVerificationResult {
  score: number;
  missingComponents: string[];
  weakComponents: string[];
  feedback: string;
}

/**
 * Evaluation iteration result
 */
export interface EvaluationIteration {
  iteration: number;
  coverLetter: string;
  result: EvaluationResult;
  timestamp: Date;
}

/**
 * Class for evaluating cover letters and providing feedback
 */
export class EvaluatorAgent {
  private llmClient: LLMClient;
  private evaluationCriteria: EvaluationCriteria;
  private maxIterations: number;
  private minAcceptableScore: number;
  private iterations: EvaluationIteration[] = [];

  /**
   * Creates a new EvaluatorAgent
   * @param options The options for the evaluator agent
   */
  constructor(options: EvaluatorAgentOptions) {
    this.llmClient = options.llmClient;
    this.evaluationCriteria =
      options.evaluationCriteria || new EvaluationCriteria();
    this.maxIterations = options.maxIterations || 3;
    this.minAcceptableScore = options.minAcceptableScore || 75;

    logger.info('EvaluatorAgent initialized', {
      maxIterations: this.maxIterations,
      minAcceptableScore: this.minAcceptableScore,
    });
  }

  /**
   * Evaluates a cover letter
   * @param coverLetter The cover letter to evaluate
   * @param options The evaluation options
   * @returns The evaluation result
   */
  public async evaluateCoverLetter(
    coverLetter: string,
    options: EvaluationOptions
  ): Promise<EvaluationResult> {
    logger.info('Evaluating cover letter', {
      coverLetterLength: coverLetter.length,
      jobTitle: options.jobTitle,
      companyName: options.companyName,
    });

    try {
      // Create evaluation prompts
      const prompts = this.evaluationCriteria.createEvaluationPrompts(
        coverLetter,
        options
      );

      // Perform evaluations for each category
      const [
        grammarCheck,
        styleCheck,
        relevanceAssessment,
        completenessVerification,
      ] = await Promise.all([
        this.checkGrammar(coverLetter),
        this.checkStyle(coverLetter),
        this.assessRelevance(coverLetter, options),
        this.verifyCompleteness(coverLetter, options),
      ]);

      // Calculate scores for each category
      const scores = {
        [EvaluationCategory.GRAMMAR]: grammarCheck.score,
        [EvaluationCategory.STYLE]: styleCheck.score,
        [EvaluationCategory.RELEVANCE]: relevanceAssessment.score,
        [EvaluationCategory.COMPLETENESS]: completenessVerification.score,
      };

      // Calculate overall score
      const overallScore =
        this.evaluationCriteria.calculateOverallScore(scores);
      const overallLevel = this.evaluationCriteria.getScoreLevel(overallScore);

      // Determine improvement priorities
      const improvementPriorities =
        this.evaluationCriteria.determineImprovementPriorities(scores);

      // Create feedback items
      const feedback: FeedbackItem[] = [
        {
          category: EvaluationCategory.GRAMMAR,
          score: grammarCheck.score,
          level: this.evaluationCriteria.getScoreLevel(grammarCheck.score),
          feedback: grammarCheck.feedback,
          suggestions: grammarCheck.errors.map(
            (error) => `${error.text}: ${error.suggestion}`
          ),
        },
        {
          category: EvaluationCategory.STYLE,
          score: styleCheck.score,
          level: this.evaluationCriteria.getScoreLevel(styleCheck.score),
          feedback: styleCheck.feedback,
          suggestions: styleCheck.issues.map(
            (issue) => `${issue.issue}: ${issue.suggestion}`
          ),
        },
        {
          category: EvaluationCategory.RELEVANCE,
          score: relevanceAssessment.score,
          level: this.evaluationCriteria.getScoreLevel(
            relevanceAssessment.score
          ),
          feedback: relevanceAssessment.feedback,
          suggestions: [
            ...relevanceAssessment.weaknesses.map(
              (weakness) => `Address weakness: ${weakness}`
            ),
            ...relevanceAssessment.missingKeywords.map(
              (keyword) => `Include keyword: ${keyword}`
            ),
          ],
        },
        {
          category: EvaluationCategory.COMPLETENESS,
          score: completenessVerification.score,
          level: this.evaluationCriteria.getScoreLevel(
            completenessVerification.score
          ),
          feedback: completenessVerification.feedback,
          suggestions: [
            ...completenessVerification.missingComponents.map(
              (component) => `Add missing component: ${component}`
            ),
            ...completenessVerification.weakComponents.map(
              (component) => `Strengthen component: ${component}`
            ),
          ],
        },
      ];

      // Generate summary
      const summary = await this.generateSummary(
        coverLetter,
        feedback,
        overallScore,
        overallLevel
      );

      // Create evaluation result
      const result: EvaluationResult = {
        overallScore,
        overallLevel,
        feedback,
        summary,
        improvementPriorities,
      };

      // Record this iteration
      this.recordIteration(coverLetter, result);

      logger.info('Cover letter evaluation completed', {
        overallScore,
        overallLevel,
        improvementPriorities,
      });

      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error('Error evaluating cover letter', { error: errorMessage });
      throw new Error(`Failed to evaluate cover letter: ${errorMessage}`);
    }
  }

  /**
   * Checks grammar and spelling in a cover letter
   * @param coverLetter The cover letter to check
   * @returns The grammar check result
   */
  private async checkGrammar(coverLetter: string): Promise<GrammarCheckResult> {
    logger.info('Checking grammar and spelling');

    try {
      const prompt = `
<GrammarAnalysisRequest>
  <Purpose>Analyze cover letter for grammar, spelling, and punctuation errors</Purpose>
  <CoverLetter>${coverLetter}</CoverLetter>
  <ReturnStructure>
Return ONLY raw JSON without any markdown formatting, code blocks, or backticks. The response must be valid JSON that can be directly parsed:
{
  "score": <number between 0-100 representing grammar quality>,
  "errors": [
    {
      "text": "<problematic text>",
      "suggestion": "<corrected text>",
      "explanation": "<explanation of the error>"
    }
  ],
  "feedback": "<overall feedback on grammar and spelling>"
}
  </ReturnStructure>
</GrammarAnalysisRequest>`;

      const response = await this.llmClient.generate(prompt, {
        temperature: 0.3,
        maxTokens: 1000,
        responseFormat: { type: 'json_object' },
      });

      // Parse the response
      const result = JSON.parse(response.text) as GrammarCheckResult;

      logger.info('Grammar check completed', {
        score: result.score,
        errorCount: result.errors.length,
      });

      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error('Error checking grammar', { error: errorMessage });
      // Return a default result in case of error
      return {
        score: 50,
        errors: [],
        feedback: 'Unable to perform grammar check due to an error.',
      };
    }
  }

  /**
   * Checks writing style in a cover letter
   * @param coverLetter The cover letter to check
   * @returns The style check result
   */
  private async checkStyle(coverLetter: string): Promise<StyleCheckResult> {
    logger.info('Checking writing style');

    try {
      const prompt = `
<StyleAnalysisRequest>
  <Purpose>Analyze cover letter for writing style, tone, clarity, and flow</Purpose>
  <Considerations>
    <Item>Professional tone</Item>
    <Item>Clear language</Item>
    <Item>Appropriate formality</Item>
    <Item>Good paragraph transitions</Item>
  </Considerations>
  <CoverLetter>${coverLetter}</CoverLetter>
  <ReturnStructure>
Return ONLY raw JSON without any markdown formatting, code blocks, or backticks. The response must be valid JSON that can be directly parsed:
{
  "score": <number between 0-100 representing style quality>,
  "issues": [
    {
      "issue": "<description of the style issue>",
      "suggestion": "<suggested improvement>",
      "explanation": "<explanation of why this is an issue>"
    }
  ],
  "feedback": "<overall feedback on writing style>"
}
  </ReturnStructure>
</StyleAnalysisRequest>`;

      const response = await this.llmClient.generate(prompt, {
        temperature: 0.3,
        maxTokens: 1000,
        responseFormat: { type: 'json_object' },
      });

      // Parse the response
      const result = JSON.parse(response.text) as StyleCheckResult;

      logger.info('Style check completed', {
        score: result.score,
        issueCount: result.issues.length,
      });

      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error('Error checking style', { error: errorMessage });
      // Return a default result in case of error
      return {
        score: 50,
        issues: [],
        feedback: 'Unable to perform style check due to an error.',
      };
    }
  }

  /**
   * Assesses relevance of a cover letter to the job and company
   * @param coverLetter The cover letter to assess
   * @param options The evaluation options
   * @returns The relevance assessment result
   */
  private async assessRelevance(
    coverLetter: string,
    options: EvaluationOptions
  ): Promise<RelevanceAssessmentResult> {
    logger.info('Assessing relevance to job and company');

    try {
      const prompt = `
<RelevanceAnalysisRequest>
  <Purpose>Analyze how well the cover letter addresses specific job requirements and company values</Purpose>
  <CoverLetter>${coverLetter}</CoverLetter>
  <JobDetails>
    <JobTitle>${options.jobTitle}</JobTitle>
    <Company>${options.companyName}</Company>
    <JobDescription>${options.jobDescription}</JobDescription>
    <CandidateSkills>${options.candidateSkills}</CandidateSkills>
    <CandidateExperience>${options.candidateExperience}</CandidateExperience>
  </JobDetails>
  <ReturnStructure>
Return ONLY raw JSON without any markdown formatting, code blocks, or backticks. The response must be valid JSON that can be directly parsed:
{
  "score": <number between 0-100 representing relevance>,
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "weaknesses": ["<weakness 1>", "<weakness 2>", ...],
  "missingKeywords": ["<important keyword 1>", "<important keyword 2>", ...],
  "feedback": "<overall feedback on relevance>"
}
  </ReturnStructure>
</RelevanceAnalysisRequest>`;

      const response = await this.llmClient.generate(prompt, {
        temperature: 0.3,
        maxTokens: 1000,
        responseFormat: { type: 'json_object' },
      });

      // Parse the response
      const result = JSON.parse(response.text) as RelevanceAssessmentResult;

      logger.info('Relevance assessment completed', {
        score: result.score,
        strengthCount: result.strengths.length,
        weaknessCount: result.weaknesses.length,
        missingKeywordCount: result.missingKeywords.length,
      });

      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error('Error assessing relevance', { error: errorMessage });
      // Return a default result in case of error
      return {
        score: 50,
        strengths: [],
        weaknesses: [],
        missingKeywords: [],
        feedback: 'Unable to perform relevance assessment due to an error.',
      };
    }
  }

  /**
   * Verifies completeness of a cover letter
   * @param coverLetter The cover letter to verify
   * @param options The evaluation options
   * @returns The completeness verification result
   */
  private async verifyCompleteness(
    coverLetter: string,
    options: EvaluationOptions
  ): Promise<CompletenessVerificationResult> {
    logger.info('Verifying completeness');

    try {
      const prompt = `
<CompletenessAnalysisRequest>
  <Purpose>Evaluate whether the cover letter includes all necessary components</Purpose>
  <RequiredComponents>
    <Component>Introduction with position and company name</Component>
    <Component>Skills and experience highlights relevant to the position</Component>
    <Component>Explanation of fit with company culture and values</Component>
    <Component>Call to action (interview request)</Component>
    <Component>Professional closing</Component>
  </RequiredComponents>
  <CoverLetter>${coverLetter}</CoverLetter>
  <JobDetails>
    <JobTitle>${options.jobTitle}</JobTitle>
    <Company>${options.companyName}</Company>
  </JobDetails>
  <ReturnStructure>
Return ONLY raw JSON without any markdown formatting, code blocks, or backticks. The response must be valid JSON that can be directly parsed:
{
  "score": <number between 0-100 representing completeness>,
  "missingComponents": ["<missing component 1>", "<missing component 2>", ...],
  "weakComponents": ["<weak component 1>", "<weak component 2>", ...],
  "feedback": "<overall feedback on completeness>"
}
  </ReturnStructure>
</CompletenessAnalysisRequest>`;

      const response = await this.llmClient.generate(prompt, {
        temperature: 0.3,
        maxTokens: 1000,
        responseFormat: { type: 'json_object' },
      });

      // Parse the response
      const result = JSON.parse(
        response.text
      ) as CompletenessVerificationResult;

      logger.info('Completeness verification completed', {
        score: result.score,
        missingComponentCount: result.missingComponents.length,
        weakComponentCount: result.weakComponents.length,
      });

      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error('Error verifying completeness', { error: errorMessage });
      // Return a default result in case of error
      return {
        score: 50,
        missingComponents: [],
        weakComponents: [],
        feedback:
          'Unable to perform completeness verification due to an error.',
      };
    }
  }

  /**
   * Generates a summary of the evaluation
   * @param coverLetter The cover letter
   * @param feedback The feedback items
   * @param overallScore The overall score
   * @param overallLevel The overall score level
   * @returns The summary
   */
  private async generateSummary(
    coverLetter: string,
    feedback: FeedbackItem[],
    overallScore: number,
    overallLevel: ScoreLevel
  ): Promise<string> {
    logger.info('Generating evaluation summary');

    try {
      const feedbackSummary = feedback
        .map(
          (item) =>
            `${item.category}: Score ${item.score} (${item.level}) - ${item.feedback}`
        )
        .join('\n');

      const prompt = `
<SummaryRequest>
  <Purpose>Create a concise summary of the cover letter evaluation</Purpose>
  <EvaluationDetails>
    <OverallScore>${overallScore}</OverallScore>
    <OverallLevel>${overallLevel}</OverallLevel>
    <DetailedFeedback>${feedbackSummary}</DetailedFeedback>
  </EvaluationDetails>
  <CoverLetter>${coverLetter}</CoverLetter>
  <Requirements>
    <Length>3-5 sentences</Length>
    <Focus>
      <Item>Main strengths</Item>
      <Item>Areas for improvement</Item>
      <Item>Actionable insights</Item>
      <Item>Prioritized feedback</Item>
    </Focus>
  </Requirements>
</SummaryRequest>`;

      const response = await this.llmClient.generate(prompt, {
        temperature: 0.5,
        maxTokens: 300,
      });

      logger.info('Summary generation completed');

      return response.text;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error('Error generating summary', { error: errorMessage });
      // Return a default summary in case of error
      return `This cover letter received an overall score of ${overallScore} (${overallLevel}). Review the detailed feedback for specific improvement areas.`;
    }
  }

  /**
   * Records an evaluation iteration
   * @param coverLetter The cover letter
   * @param result The evaluation result
   */
  private recordIteration(coverLetter: string, result: EvaluationResult): void {
    const iteration: EvaluationIteration = {
      iteration: this.iterations.length + 1,
      coverLetter,
      result,
      timestamp: new Date(),
    };

    this.iterations.push(iteration);

    logger.info('Recorded evaluation iteration', {
      iterationNumber: iteration.iteration,
      timestamp: iteration.timestamp,
      overallScore: result.overallScore,
    });
  }

  /**
   * Gets all recorded evaluation iterations
   * @returns The evaluation iterations
   */
  public getIterations(): EvaluationIteration[] {
    return [...this.iterations];
  }

  /**
   * Gets the latest evaluation iteration
   * @returns The latest evaluation iteration or undefined if none exists
   */
  public getLatestIteration(): EvaluationIteration | undefined {
    if (this.iterations.length === 0) {
      return undefined;
    }
    return this.iterations[this.iterations.length - 1];
  }

  /**
   * Checks if the cover letter meets the minimum acceptable score
   * @param result The evaluation result
   * @returns True if the cover letter is acceptable, false otherwise
   */
  public isAcceptable(result: EvaluationResult): boolean {
    return result.overallScore >= this.minAcceptableScore;
  }

  /**
   * Checks if the maximum number of iterations has been reached
   * @returns True if the maximum number of iterations has been reached, false otherwise
   */
  public hasReachedMaxIterations(): boolean {
    return this.iterations.length >= this.maxIterations;
  }

  /**
   * Resets the evaluation iterations
   */
  public resetIterations(): void {
    this.iterations = [];
    logger.info('Reset evaluation iterations');
  }
}
