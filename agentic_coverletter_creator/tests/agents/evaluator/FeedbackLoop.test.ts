import {
  FeedbackLoop,
  FeedbackLoopOptions,
  FeedbackLoopResult,
} from '../../../src/agents/evaluator/FeedbackLoop';
import { EvaluatorAgent } from '../../../src/agents/evaluator/EvaluatorAgent';
import {
  WriterAgent,
  CoverLetterTone,
  CoverLetterResult,
} from '../../../src/agents/writer/WriterAgent';
import {
  EvaluationOptions,
  EvaluationResult,
  EvaluationCategory,
  ScoreLevel,
} from '../../../src/agents/evaluator/EvaluationCriteria';
import { LLMClient } from '../../../src/agents/writer/interfaces/LLMClient';

// Mock EvaluatorAgent
class MockEvaluatorAgent {
  private iterations: number = 0;
  private initialScore: number;
  private scoreImprovement: number;
  private maxScore: number;

  constructor(
    initialScore: number = 70,
    scoreImprovement: number = 5,
    maxScore: number = 95
  ) {
    this.initialScore = initialScore;
    this.scoreImprovement = scoreImprovement;
    this.maxScore = maxScore;
  }

  async evaluateCoverLetter(
    coverLetter: string,
    options: EvaluationOptions
  ): Promise<EvaluationResult> {
    // Calculate score based on iteration
    const score = Math.min(
      this.initialScore + this.iterations * this.scoreImprovement,
      this.maxScore
    );
    this.iterations++;

    // Create mock evaluation result
    return {
      overallScore: score,
      overallLevel: this.getScoreLevel(score),
      feedback: [
        {
          category: EvaluationCategory.GRAMMAR,
          score: score,
          level: this.getScoreLevel(score),
          feedback: 'Grammar feedback',
          suggestions: ['Fix grammar issue 1', 'Fix grammar issue 2'],
        },
        {
          category: EvaluationCategory.STYLE,
          score: score - 5,
          level: this.getScoreLevel(score - 5),
          feedback: 'Style feedback',
          suggestions: ['Improve style issue 1'],
        },
        {
          category: EvaluationCategory.RELEVANCE,
          score: score + 5,
          level: this.getScoreLevel(score + 5),
          feedback: 'Relevance feedback',
          suggestions: [],
        },
        {
          category: EvaluationCategory.COMPLETENESS,
          score: score,
          level: this.getScoreLevel(score),
          feedback: 'Completeness feedback',
          suggestions: ['Add missing component'],
        },
      ],
      summary: `This cover letter received a score of ${score}.`,
      improvementPriorities: [
        EvaluationCategory.STYLE,
        EvaluationCategory.GRAMMAR,
        EvaluationCategory.COMPLETENESS,
        EvaluationCategory.RELEVANCE,
      ],
    };
  }

  resetIterations(): void {
    this.iterations = 0;
  }

  getIterations(): any[] {
    return [];
  }

  private getScoreLevel(score: number): ScoreLevel {
    if (score >= 90) return ScoreLevel.EXCELLENT;
    if (score >= 75) return ScoreLevel.GOOD;
    if (score >= 60) return ScoreLevel.SATISFACTORY;
    if (score >= 40) return ScoreLevel.NEEDS_IMPROVEMENT;
    return ScoreLevel.POOR;
  }
}

// Mock WriterAgent
class MockWriterAgent {
  private iterationCount: number = 0;

  async generateCoverLetter(options: any): Promise<CoverLetterResult> {
    this.iterationCount++;

    return {
      coverLetter: `Improved cover letter (Iteration ${this.iterationCount}).\n\nThis cover letter has been improved based on feedback.\n\nIt includes the job title ${options.jobTitle} and company name ${options.companyName}.`,
      metadata: {
        model: 'test-model',
        tokenUsage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
        },
        generationTime: 500,
      },
    };
  }

  getLLMClientName(): string {
    return 'MockLLMClient';
  }
}

describe('FeedbackLoop', () => {
  let feedbackLoop: FeedbackLoop;
  let mockEvaluatorAgent: MockEvaluatorAgent;
  let mockWriterAgent: MockWriterAgent;
  let evaluationOptions: EvaluationOptions;

  beforeEach(() => {
    mockEvaluatorAgent = new MockEvaluatorAgent(70, 10, 95);
    mockWriterAgent = new MockWriterAgent();

    const options: FeedbackLoopOptions = {
      evaluatorAgent: mockEvaluatorAgent as unknown as EvaluatorAgent,
      writerAgent: mockWriterAgent as unknown as WriterAgent,
      maxIterations: 3,
      minAcceptableScore: 85,
      autoApplyFeedback: true,
    };

    feedbackLoop = new FeedbackLoop(options);

    evaluationOptions = {
      jobTitle: 'Software Engineer',
      companyName: 'Acme Corporation',
      jobDescription: 'Developing software applications',
      candidateSkills: 'JavaScript, TypeScript, React',
      candidateExperience: '5 years of software development experience',
    };
  });

  describe('constructor', () => {
    it('should initialize with provided options', () => {
      const options: FeedbackLoopOptions = {
        evaluatorAgent: mockEvaluatorAgent as unknown as EvaluatorAgent,
        writerAgent: mockWriterAgent as unknown as WriterAgent,
        maxIterations: 5,
        minAcceptableScore: 90,
        autoApplyFeedback: false,
      };

      const loop = new FeedbackLoop(options);

      // Test that the loop has the correct properties
      expect(loop['evaluatorAgent']).toBe(mockEvaluatorAgent);
      expect(loop['writerAgent']).toBe(mockWriterAgent);
      expect(loop['maxIterations']).toBe(5);
      expect(loop['minAcceptableScore']).toBe(90);
      expect(loop['autoApplyFeedback']).toBe(false);
    });

    it('should initialize with default values when not provided', () => {
      const options: FeedbackLoopOptions = {
        evaluatorAgent: mockEvaluatorAgent as unknown as EvaluatorAgent,
        writerAgent: mockWriterAgent as unknown as WriterAgent,
      };

      const loop = new FeedbackLoop(options);

      // Test that the loop has the default properties
      expect(loop['evaluatorAgent']).toBe(mockEvaluatorAgent);
      expect(loop['writerAgent']).toBe(mockWriterAgent);
      expect(loop['maxIterations']).toBe(3);
      expect(loop['minAcceptableScore']).toBe(80);
      expect(loop['autoApplyFeedback']).toBe(true);
    });
  });

  describe('run', () => {
    it('should run the feedback loop until an acceptable score is reached', async () => {
      const initialCoverLetter = 'This is the initial cover letter.';

      const result = await feedbackLoop.run(
        initialCoverLetter,
        evaluationOptions
      );

      // With initial score 70 and improvement 10 per iteration,
      // it should take 2 iterations to reach 90, which is above minAcceptableScore (85)
      expect(result.success).toBe(true);
      expect(result.iterationCount).toBe(2);
      expect(result.terminationReason).toBe('Acceptable score reached');
      expect(result.finalEvaluation.overallScore).toBe(90);
      expect(result.improvement).toBe(20);
    });

    it('should stop after reaching the maximum number of iterations', async () => {
      // Set up a scenario where the score improvement is too small to reach the acceptable score
      mockEvaluatorAgent = new MockEvaluatorAgent(60, 5, 95);

      const options: FeedbackLoopOptions = {
        evaluatorAgent: mockEvaluatorAgent as unknown as EvaluatorAgent,
        writerAgent: mockWriterAgent as unknown as WriterAgent,
        maxIterations: 3,
        minAcceptableScore: 85,
      };

      feedbackLoop = new FeedbackLoop(options);

      const initialCoverLetter = 'This is the initial cover letter.';

      const result = await feedbackLoop.run(
        initialCoverLetter,
        evaluationOptions
      );

      // With initial score 60 and improvement 5 per iteration,
      // after 3 iterations it would reach 75, which is below minAcceptableScore (85)
      expect(result.success).toBe(false);
      expect(result.iterationCount).toBe(3);
      expect(result.terminationReason).toBe('Maximum iterations reached');
      expect(result.finalEvaluation.overallScore).toBe(75);
      expect(result.improvement).toBe(15);
    });

    it('should stop if there is no further improvement', async () => {
      // Set up a scenario where the score doesn't improve after the first iteration
      mockEvaluatorAgent = new MockEvaluatorAgent(70, 0, 95);

      const options: FeedbackLoopOptions = {
        evaluatorAgent: mockEvaluatorAgent as unknown as EvaluatorAgent,
        writerAgent: mockWriterAgent as unknown as WriterAgent,
        maxIterations: 3,
        minAcceptableScore: 85,
      };

      feedbackLoop = new FeedbackLoop(options);

      const initialCoverLetter = 'This is the initial cover letter.';

      const result = await feedbackLoop.run(
        initialCoverLetter,
        evaluationOptions
      );

      // With no improvement, it should stop after the first iteration
      expect(result.success).toBe(false);
      expect(result.iterationCount).toBe(2);
      expect(result.terminationReason).toBe('No further improvement');
      expect(result.finalEvaluation.overallScore).toBe(70);
      expect(result.improvement).toBe(0);
    });

    it('should return success if the initial cover letter already meets the minimum score', async () => {
      // Set up a scenario where the initial score is already above the minimum
      mockEvaluatorAgent = new MockEvaluatorAgent(90, 5, 95);

      const options: FeedbackLoopOptions = {
        evaluatorAgent: mockEvaluatorAgent as unknown as EvaluatorAgent,
        writerAgent: mockWriterAgent as unknown as WriterAgent,
        maxIterations: 3,
        minAcceptableScore: 85,
      };

      feedbackLoop = new FeedbackLoop(options);

      const initialCoverLetter = 'This is the initial cover letter.';

      const result = await feedbackLoop.run(
        initialCoverLetter,
        evaluationOptions
      );

      // With initial score 90, which is above minAcceptableScore (85),
      // it should immediately return success
      expect(result.success).toBe(true);
      expect(result.iterationCount).toBe(1);
      expect(result.terminationReason).toBe(
        'Initial cover letter meets minimum score'
      );
      expect(result.finalEvaluation.overallScore).toBe(90);
      expect(result.improvement).toBe(0);
    });

    it('should handle errors during the feedback loop', async () => {
      // Mock the evaluateCoverLetter method to throw an error
      jest
        .spyOn(mockEvaluatorAgent, 'evaluateCoverLetter')
        .mockImplementationOnce(() => {
          throw new Error('Evaluation error');
        });

      const initialCoverLetter = 'This is the initial cover letter.';

      const result = await feedbackLoop.run(
        initialCoverLetter,
        evaluationOptions
      );

      // It should return a result with error information
      expect(result.success).toBe(false);
      expect(result.terminationReason).toBe('Error: Evaluation error');
    });
  });

  describe('iteration management', () => {
    it('should record iterations during the feedback loop', async () => {
      const initialCoverLetter = 'This is the initial cover letter.';

      await feedbackLoop.run(initialCoverLetter, evaluationOptions);

      // Get iterations
      const iterations = feedbackLoop.getIterations();

      // Should have 2 iterations (initial + 1 improvement)
      expect(iterations).toHaveLength(2);

      // Check first iteration
      expect(iterations[0].iteration).toBe(1);
      expect(iterations[0].coverLetter).toBe(initialCoverLetter);
      expect(iterations[0].evaluationResult.overallScore).toBe(70);
      expect(iterations[0].appliedFeedback).toBeUndefined();

      // Check second iteration
      expect(iterations[1].iteration).toBe(2);
      expect(iterations[1].coverLetter).toContain('Improved cover letter');
      expect(iterations[1].evaluationResult.overallScore).toBe(90);
      expect(iterations[1].appliedFeedback).toBeDefined();

      // Check latest iteration
      const latest = feedbackLoop.getLatestIteration();
      expect(latest).toBeDefined();
      expect(latest?.iteration).toBe(2);

      // Reset iterations
      feedbackLoop.resetIterations();
      expect(feedbackLoop.getIterations()).toHaveLength(0);
      expect(feedbackLoop.getLatestIteration()).toBeUndefined();
    });
  });

  describe('utility methods', () => {
    it('should compare two versions of a cover letter', () => {
      const original = 'Line 1\nLine 2\nLine 3';
      const improved = 'Line 1\nImproved Line 2\nLine 3\nAdded Line 4';

      const comparison = FeedbackLoop.compareVersions(original, improved);

      expect(comparison).toContain('Line 2:');
      expect(comparison).toContain('- Line 2');
      expect(comparison).toContain('+ Improved Line 2');
      expect(comparison).toContain('Line 4:');
      expect(comparison).toContain('- ');
      expect(comparison).toContain('+ Added Line 4');
    });
  });
});
