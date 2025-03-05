import {
  EvaluatorAgent,
  EvaluatorAgentOptions,
  GrammarCheckResult,
  StyleCheckResult,
  RelevanceAssessmentResult,
  CompletenessVerificationResult,
} from '../../../src/agents/evaluator/EvaluatorAgent';
import {
  EvaluationCriteria,
  EvaluationCategory,
  ScoreLevel,
  EvaluationOptions,
  EvaluationResult,
} from '../../../src/agents/evaluator/EvaluationCriteria';
import {
  LLMClient,
  LLMGenerationResult,
} from '../../../src/agents/writer/interfaces/LLMClient';

// Mock LLMClient for testing
class MockLLMClient implements LLMClient {
  private mockResponses: Map<string, string> = new Map();

  constructor() {
    // Set up default mock responses
    this.setMockResponse(
      'grammar',
      JSON.stringify({
        score: 85,
        errors: [
          {
            text: 'their',
            suggestion: 'there',
            explanation: 'Using the wrong form of "there/their/they\'re"',
          },
        ],
        feedback: 'Overall good grammar with a few minor errors.',
      })
    );

    this.setMockResponse(
      'style',
      JSON.stringify({
        score: 75,
        issues: [
          {
            issue: 'Passive voice',
            suggestion: 'Use active voice',
            explanation:
              'Active voice makes your writing more direct and engaging.',
          },
        ],
        feedback: 'Good professional tone but could be more engaging.',
      })
    );

    this.setMockResponse(
      'relevance',
      JSON.stringify({
        score: 90,
        strengths: [
          'Highlights relevant experience',
          'Mentions company values',
        ],
        weaknesses: ['Could emphasize technical skills more'],
        missingKeywords: ['innovation', 'leadership'],
        feedback:
          'Good alignment with job requirements but missing some key terms.',
      })
    );

    this.setMockResponse(
      'completeness',
      JSON.stringify({
        score: 80,
        missingComponents: [],
        weakComponents: ['Call to action could be stronger'],
        feedback:
          'Contains all necessary components but some could be strengthened.',
      })
    );

    this.setMockResponse(
      'summary',
      'This cover letter is well-structured and professionally written, scoring 82 overall (GOOD). The letter effectively highlights relevant experience and aligns with company values, but could benefit from stronger emphasis on technical skills and a more compelling call to action. Consider incorporating keywords like "innovation" and "leadership" and converting passive voice to active for more engaging content.'
    );
  }

  setMockResponse(type: string, response: string): void {
    this.mockResponses.set(type, response);
  }

  async generate(prompt: string, options?: any): Promise<LLMGenerationResult> {
    // Determine which type of response to return based on the prompt content
    let responseType = 'summary';
    if (prompt.includes('grammar, spelling, and punctuation')) {
      responseType = 'grammar';
    } else if (prompt.includes('writing style, tone, clarity, and flow')) {
      responseType = 'style';
    } else if (prompt.includes('addresses the specific job requirements')) {
      responseType = 'relevance';
    } else if (prompt.includes('includes all necessary components')) {
      responseType = 'completeness';
    }

    const text =
      this.mockResponses.get(responseType) ||
      '{"score": 50, "feedback": "No mock response available"}';

    return {
      text,
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
      model: 'test-model',
    };
  }

  isConfigured(): boolean {
    return true;
  }

  getName(): string {
    return 'MockLLMClient';
  }

  getTokenUsage(): any {
    return {
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      totalRequests: 1,
      failedRequests: 0,
    };
  }
}

describe('EvaluatorAgent', () => {
  let evaluatorAgent: EvaluatorAgent;
  let mockLLMClient: MockLLMClient;
  let evaluationOptions: EvaluationOptions;

  beforeEach(() => {
    mockLLMClient = new MockLLMClient();

    const options: EvaluatorAgentOptions = {
      llmClient: mockLLMClient,
      maxIterations: 3,
      minAcceptableScore: 75,
    };

    evaluatorAgent = new EvaluatorAgent(options);

    evaluationOptions = {
      jobTitle: 'Software Engineer',
      companyName: 'Acme Corporation',
      jobDescription:
        'Developing software applications using TypeScript and React.',
      candidateSkills: 'JavaScript, TypeScript, React, Node.js',
      candidateExperience: '5 years of software development experience',
    };
  });

  describe('constructor', () => {
    it('should initialize with provided options', () => {
      const customCriteria = new EvaluationCriteria({
        [EvaluationCategory.GRAMMAR]: 0.1,
        [EvaluationCategory.STYLE]: 0.1,
        [EvaluationCategory.RELEVANCE]: 0.4,
        [EvaluationCategory.COMPLETENESS]: 0.4,
      });

      const options: EvaluatorAgentOptions = {
        llmClient: mockLLMClient,
        evaluationCriteria: customCriteria,
        maxIterations: 5,
        minAcceptableScore: 80,
      };

      const agent = new EvaluatorAgent(options);

      // Test that the agent has the correct properties
      expect(agent['llmClient']).toBe(mockLLMClient);
      expect(agent['evaluationCriteria']).toBe(customCriteria);
      expect(agent['maxIterations']).toBe(5);
      expect(agent['minAcceptableScore']).toBe(80);
    });

    it('should initialize with default values when not provided', () => {
      const options: EvaluatorAgentOptions = {
        llmClient: mockLLMClient,
      };

      const agent = new EvaluatorAgent(options);

      // Test that the agent has the default properties
      expect(agent['llmClient']).toBe(mockLLMClient);
      expect(agent['evaluationCriteria']).toBeInstanceOf(EvaluationCriteria);
      expect(agent['maxIterations']).toBe(3);
      expect(agent['minAcceptableScore']).toBe(75);
    });
  });

  describe('evaluateCoverLetter', () => {
    it('should evaluate a cover letter and return a result', async () => {
      const coverLetter = `
        Dear Hiring Manager,
        
        I am writing to express my interest in the Software Engineer position at Acme Corporation. 
        With 5 years of experience in software development, I believe I would be a valuable addition to your team.
        
        Throughout my career, I have worked with JavaScript, TypeScript, React, and Node.js to build scalable applications.
        I am particularly impressed by Acme's commitment to quality and innovation in the tech industry.
        
        I look forward to the opportunity to discuss how my skills align with your needs.
        
        Sincerely,
        John Doe
      `;

      const result = await evaluatorAgent.evaluateCoverLetter(
        coverLetter,
        evaluationOptions
      );

      // Test that the result has the expected structure
      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.overallLevel).toBeDefined();
      expect(result.feedback).toHaveLength(4);
      expect(result.summary).toBeDefined();
      expect(result.improvementPriorities).toBeDefined();

      // Test that the feedback items have the expected categories
      const categories = result.feedback.map((item) => item.category);
      expect(categories).toContain(EvaluationCategory.GRAMMAR);
      expect(categories).toContain(EvaluationCategory.STYLE);
      expect(categories).toContain(EvaluationCategory.RELEVANCE);
      expect(categories).toContain(EvaluationCategory.COMPLETENESS);
    });

    it('should handle errors during evaluation', async () => {
      // Make the mock client throw an error
      jest.spyOn(mockLLMClient, 'generate').mockImplementation(() => {
        throw new Error('API error');
      });

      const coverLetter = 'Test cover letter';

      await expect(
        evaluatorAgent.evaluateCoverLetter(coverLetter, evaluationOptions)
      ).rejects.toThrow('Failed to evaluate cover letter');
    });
  });

  describe('iteration management', () => {
    it('should record iterations when evaluating cover letters', async () => {
      const coverLetter1 = 'First version of the cover letter';
      const coverLetter2 = 'Improved version of the cover letter';

      // Evaluate first version
      await evaluatorAgent.evaluateCoverLetter(coverLetter1, evaluationOptions);

      // Evaluate second version
      await evaluatorAgent.evaluateCoverLetter(coverLetter2, evaluationOptions);

      // Check that iterations were recorded
      const iterations = evaluatorAgent.getIterations();
      expect(iterations).toHaveLength(2);
      expect(iterations[0].coverLetter).toBe(coverLetter1);
      expect(iterations[1].coverLetter).toBe(coverLetter2);

      // Check latest iteration
      const latest = evaluatorAgent.getLatestIteration();
      expect(latest).toBeDefined();
      expect(latest?.coverLetter).toBe(coverLetter2);

      // Reset iterations
      evaluatorAgent.resetIterations();
      expect(evaluatorAgent.getIterations()).toHaveLength(0);
      expect(evaluatorAgent.getLatestIteration()).toBeUndefined();
    });

    it('should correctly determine if a cover letter is acceptable', async () => {
      // Set up mock responses for acceptable and unacceptable scores
      const acceptableMock = new MockLLMClient();
      acceptableMock.setMockResponse(
        'grammar',
        JSON.stringify({ score: 80, errors: [], feedback: 'Good' })
      );
      acceptableMock.setMockResponse(
        'style',
        JSON.stringify({ score: 80, issues: [], feedback: 'Good' })
      );
      acceptableMock.setMockResponse(
        'relevance',
        JSON.stringify({
          score: 80,
          strengths: [],
          weaknesses: [],
          missingKeywords: [],
          feedback: 'Good',
        })
      );
      acceptableMock.setMockResponse(
        'completeness',
        JSON.stringify({
          score: 80,
          missingComponents: [],
          weakComponents: [],
          feedback: 'Good',
        })
      );

      const unacceptableMock = new MockLLMClient();
      unacceptableMock.setMockResponse(
        'grammar',
        JSON.stringify({ score: 60, errors: [], feedback: 'Poor' })
      );
      unacceptableMock.setMockResponse(
        'style',
        JSON.stringify({ score: 60, issues: [], feedback: 'Poor' })
      );
      unacceptableMock.setMockResponse(
        'relevance',
        JSON.stringify({
          score: 60,
          strengths: [],
          weaknesses: [],
          missingKeywords: [],
          feedback: 'Poor',
        })
      );
      unacceptableMock.setMockResponse(
        'completeness',
        JSON.stringify({
          score: 60,
          missingComponents: [],
          weakComponents: [],
          feedback: 'Poor',
        })
      );

      // Create agents with different mock clients
      const acceptableAgent = new EvaluatorAgent({
        llmClient: acceptableMock,
        minAcceptableScore: 75,
      });

      const unacceptableAgent = new EvaluatorAgent({
        llmClient: unacceptableMock,
        minAcceptableScore: 75,
      });

      const coverLetter = 'Test cover letter';

      // Evaluate with both agents
      const acceptableResult = await acceptableAgent.evaluateCoverLetter(
        coverLetter,
        evaluationOptions
      );
      const unacceptableResult = await unacceptableAgent.evaluateCoverLetter(
        coverLetter,
        evaluationOptions
      );

      // Check acceptability
      expect(acceptableAgent.isAcceptable(acceptableResult)).toBe(true);
      expect(unacceptableAgent.isAcceptable(unacceptableResult)).toBe(false);
    });

    it('should correctly determine if max iterations have been reached', async () => {
      const agent = new EvaluatorAgent({
        llmClient: mockLLMClient,
        maxIterations: 2,
      });

      const coverLetter = 'Test cover letter';

      // Initially should not have reached max iterations
      expect(agent.hasReachedMaxIterations()).toBe(false);

      // First evaluation
      await agent.evaluateCoverLetter(coverLetter, evaluationOptions);
      expect(agent.hasReachedMaxIterations()).toBe(false);

      // Second evaluation (reaches max)
      await agent.evaluateCoverLetter(coverLetter, evaluationOptions);
      expect(agent.hasReachedMaxIterations()).toBe(true);

      // Reset iterations
      agent.resetIterations();
      expect(agent.hasReachedMaxIterations()).toBe(false);
    });
  });

  describe('individual evaluation methods', () => {
    it('should handle errors in grammar checking', async () => {
      jest.spyOn(mockLLMClient, 'generate').mockImplementationOnce(() => {
        throw new Error('Grammar check error');
      });

      // @ts-ignore - Accessing private method for testing
      const result = await evaluatorAgent['checkGrammar']('Test cover letter');

      expect(result.score).toBe(50);
      expect(result.errors).toHaveLength(0);
      expect(result.feedback).toContain('Unable to perform grammar check');
    });

    it('should handle errors in style checking', async () => {
      jest.spyOn(mockLLMClient, 'generate').mockImplementationOnce(() => {
        throw new Error('Style check error');
      });

      // @ts-ignore - Accessing private method for testing
      const result = await evaluatorAgent['checkStyle']('Test cover letter');

      expect(result.score).toBe(50);
      expect(result.issues).toHaveLength(0);
      expect(result.feedback).toContain('Unable to perform style check');
    });

    it('should handle errors in relevance assessment', async () => {
      jest.spyOn(mockLLMClient, 'generate').mockImplementationOnce(() => {
        throw new Error('Relevance assessment error');
      });

      // @ts-ignore - Accessing private method for testing
      const result = await evaluatorAgent['assessRelevance'](
        'Test cover letter',
        evaluationOptions
      );

      expect(result.score).toBe(50);
      expect(result.strengths).toHaveLength(0);
      expect(result.weaknesses).toHaveLength(0);
      expect(result.missingKeywords).toHaveLength(0);
      expect(result.feedback).toContain(
        'Unable to perform relevance assessment'
      );
    });

    it('should handle errors in completeness verification', async () => {
      jest.spyOn(mockLLMClient, 'generate').mockImplementationOnce(() => {
        throw new Error('Completeness verification error');
      });

      // @ts-ignore - Accessing private method for testing
      const result = await evaluatorAgent['verifyCompleteness'](
        'Test cover letter',
        evaluationOptions
      );

      expect(result.score).toBe(50);
      expect(result.missingComponents).toHaveLength(0);
      expect(result.weakComponents).toHaveLength(0);
      expect(result.feedback).toContain(
        'Unable to perform completeness verification'
      );
    });

    it('should handle errors in summary generation', async () => {
      jest.spyOn(mockLLMClient, 'generate').mockImplementationOnce(() => {
        throw new Error('Summary generation error');
      });

      const feedback = [
        {
          category: EvaluationCategory.GRAMMAR,
          score: 80,
          level: ScoreLevel.GOOD,
          feedback: 'Good grammar',
          suggestions: [],
        },
      ];

      // @ts-ignore - Accessing private method for testing
      const result = await evaluatorAgent['generateSummary'](
        'Test cover letter',
        feedback,
        80,
        ScoreLevel.GOOD
      );

      expect(result).toContain(
        'This cover letter received an overall score of 80'
      );
    });
  });
});
