import logger from '../../utils/logger';
import { EvaluatorAgent } from './EvaluatorAgent';
import { WriterAgent, CoverLetterTone } from '../writer/WriterAgent';
import {
  EvaluationOptions,
  EvaluationResult,
  EvaluationCategory,
} from './EvaluationCriteria';

/**
 * Options for the FeedbackLoop
 */
export interface FeedbackLoopOptions {
  /**
   * The evaluator agent to use for evaluations
   */
  evaluatorAgent: EvaluatorAgent;

  /**
   * The writer agent to use for generating improved cover letters
   */
  writerAgent: WriterAgent;

  /**
   * Maximum number of iterations (default: 3)
   */
  maxIterations?: number;

  /**
   * Minimum acceptable score to consider the cover letter complete (default: 80)
   */
  minAcceptableScore?: number;

  /**
   * Whether to automatically apply feedback (default: true)
   */
  autoApplyFeedback?: boolean;
}

/**
 * Iteration result for the feedback loop
 */
export interface FeedbackIteration {
  /**
   * The iteration number
   */
  iteration: number;

  /**
   * The cover letter for this iteration
   */
  coverLetter: string;

  /**
   * The evaluation result for this iteration
   */
  evaluationResult: EvaluationResult;

  /**
   * The feedback applied to generate the next iteration
   */
  appliedFeedback?: string;

  /**
   * The timestamp for this iteration
   */
  timestamp: Date;
}

/**
 * Feedback loop result
 */
export interface FeedbackLoopResult {
  /**
   * Whether the feedback loop was successful
   */
  success: boolean;

  /**
   * The final cover letter
   */
  finalCoverLetter: string;

  /**
   * The final evaluation result
   */
  finalEvaluation: EvaluationResult;

  /**
   * All iterations of the feedback loop
   */
  iterations: FeedbackIteration[];

  /**
   * The reason for termination
   */
  terminationReason: string;

  /**
   * The number of iterations performed
   */
  iterationCount: number;

  /**
   * The improvement from the initial to final score
   */
  improvement: number;
}

/**
 * Class for implementing a feedback loop to iteratively improve cover letters
 */
export class FeedbackLoop {
  private evaluatorAgent: EvaluatorAgent;
  private writerAgent: WriterAgent;
  private maxIterations: number;
  private minAcceptableScore: number;
  private autoApplyFeedback: boolean;
  private iterations: FeedbackIteration[] = [];

  /**
   * Creates a new FeedbackLoop
   * @param options The options for the feedback loop
   */
  constructor(options: FeedbackLoopOptions) {
    this.evaluatorAgent = options.evaluatorAgent;
    this.writerAgent = options.writerAgent;
    this.maxIterations = options.maxIterations || 3;
    this.minAcceptableScore = options.minAcceptableScore || 80;
    this.autoApplyFeedback = options.autoApplyFeedback !== false;

    logger.info('FeedbackLoop initialized', {
      maxIterations: this.maxIterations,
      minAcceptableScore: this.minAcceptableScore,
      autoApplyFeedback: this.autoApplyFeedback,
    });
  }

  /**
   * Runs the feedback loop to iteratively improve a cover letter
   * @param initialCoverLetter The initial cover letter
   * @param evaluationOptions The evaluation options
   * @returns The feedback loop result
   */
  public async run(
    initialCoverLetter: string,
    evaluationOptions: EvaluationOptions
  ): Promise<FeedbackLoopResult> {
    logger.info('Starting feedback loop', {
      initialCoverLetterLength: initialCoverLetter.length,
      jobTitle: evaluationOptions.jobTitle,
      companyName: evaluationOptions.companyName,
    });

    // Reset iterations
    this.iterations = [];
    this.evaluatorAgent.resetIterations();

    let currentCoverLetter = initialCoverLetter;
    let initialEvaluation: EvaluationResult | null = null;
    let finalEvaluation: EvaluationResult | null = null;
    let terminationReason = 'Maximum iterations reached';
    let success = false;

    try {
      // Evaluate the initial cover letter
      let evaluation = await this.evaluatorAgent.evaluateCoverLetter(
        currentCoverLetter,
        evaluationOptions
      );

      initialEvaluation = evaluation;
      finalEvaluation = evaluation;

      // Record the initial iteration
      this.recordIteration(currentCoverLetter, evaluation);

      // Check if the initial cover letter is already acceptable
      if (evaluation.overallScore >= this.minAcceptableScore) {
        terminationReason = 'Initial cover letter meets minimum score';
        success = true;
        logger.info('Initial cover letter meets minimum score', {
          score: evaluation.overallScore,
          minAcceptableScore: this.minAcceptableScore,
        });
      } else {
        // Iterate until we reach the maximum iterations or an acceptable score
        for (let i = 1; i < this.maxIterations; i++) {
          // Generate feedback for improvement
          const feedback = this.generateFeedback(evaluation);

          logger.info(`Iteration ${i}: Applying feedback`, {
            feedbackLength: feedback.length,
          });

          // Apply feedback to generate an improved cover letter
          const improvedCoverLetter = await this.applyFeedback(
            currentCoverLetter,
            feedback,
            evaluationOptions
          );

          // Evaluate the improved cover letter
          const newEvaluation = await this.evaluatorAgent.evaluateCoverLetter(
            improvedCoverLetter,
            evaluationOptions
          );

          // Record this iteration
          this.recordIteration(improvedCoverLetter, newEvaluation, feedback);

          // Update the current cover letter and evaluation
          currentCoverLetter = improvedCoverLetter;
          finalEvaluation = newEvaluation;

          logger.info(`Iteration ${i}: Evaluation completed`, {
            score: newEvaluation.overallScore,
            previousScore: evaluation.overallScore,
            improvement: newEvaluation.overallScore - evaluation.overallScore,
          });

          // Check if we've reached an acceptable score
          if (newEvaluation.overallScore >= this.minAcceptableScore) {
            terminationReason = 'Acceptable score reached';
            success = true;
            logger.info('Acceptable score reached', {
              score: newEvaluation.overallScore,
              minAcceptableScore: this.minAcceptableScore,
              iteration: i + 1,
            });
            break;
          }

          // Check if we're no longer improving
          if (newEvaluation.overallScore <= evaluation.overallScore) {
            terminationReason = 'No further improvement';
            logger.info('No further improvement detected', {
              currentScore: newEvaluation.overallScore,
              previousScore: evaluation.overallScore,
              iteration: i + 1,
            });
            break;
          }

          // Update the evaluation for the next iteration
          evaluation = newEvaluation;
        }
      }

      // Calculate improvement
      const improvement = initialEvaluation
        ? finalEvaluation.overallScore - initialEvaluation.overallScore
        : 0;

      // Create the result
      const result: FeedbackLoopResult = {
        success,
        finalCoverLetter: currentCoverLetter,
        finalEvaluation: finalEvaluation,
        iterations: [...this.iterations],
        terminationReason,
        iterationCount: this.iterations.length,
        improvement,
      };

      logger.info('Feedback loop completed', {
        success,
        terminationReason,
        iterationCount: this.iterations.length,
        improvement,
        finalScore: finalEvaluation.overallScore,
      });

      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error('Error in feedback loop', { error: errorMessage });

      // Create a result with the error information
      return {
        success: false,
        finalCoverLetter: currentCoverLetter,
        finalEvaluation: finalEvaluation || initialEvaluation!,
        iterations: [...this.iterations],
        terminationReason: `Error: ${errorMessage}`,
        iterationCount: this.iterations.length,
        improvement:
          initialEvaluation && finalEvaluation
            ? finalEvaluation.overallScore - initialEvaluation.overallScore
            : 0,
      };
    }
  }

  /**
   * Generates feedback for improvement based on an evaluation result
   * @param evaluation The evaluation result
   * @returns The feedback for improvement
   */
  private generateFeedback(evaluation: EvaluationResult): string {
    logger.info('Generating feedback for improvement');

    // Start with the summary
    let feedback = `${evaluation.summary}\n\n`;

    // Add feedback for each category, prioritized by improvement needs
    feedback += 'Specific improvements needed:\n\n';

    // Add feedback for each priority category
    evaluation.improvementPriorities.forEach((category, index) => {
      const feedbackItem = evaluation.feedback.find(
        (item) => item.category === category
      );

      if (feedbackItem) {
        feedback += `${index + 1}. ${category} (Score: ${
          feedbackItem.score
        }):\n`;
        feedback += `   ${feedbackItem.feedback}\n`;

        // Add suggestions if available
        if (feedbackItem.suggestions.length > 0) {
          feedback += '   Suggestions:\n';
          feedbackItem.suggestions.forEach((suggestion) => {
            feedback += `   - ${suggestion}\n`;
          });
        }

        feedback += '\n';
      }
    });

    return feedback;
  }

  /**
   * Applies feedback to generate an improved cover letter
   * @param coverLetter The current cover letter
   * @param feedback The feedback for improvement
   * @param evaluationOptions The evaluation options
   * @returns The improved cover letter
   */
  private async applyFeedback(
    coverLetter: string,
    feedback: string,
    evaluationOptions: EvaluationOptions
  ): Promise<string> {
    logger.info('Applying feedback to generate improved cover letter');

    if (!this.autoApplyFeedback) {
      logger.info(
        'Auto-apply feedback is disabled, returning original cover letter'
      );
      return coverLetter;
    }

    try {
      // Create a prompt for the writer agent to improve the cover letter
      const prompt = `
<CoverLetterImprovementRequest>
  <Purpose>Improve the cover letter based on feedback provided</Purpose>
  <OriginalCoverLetter>${coverLetter}</OriginalCoverLetter>
  <Feedback>${feedback}</Feedback>
  <JobDetails>
    <JobTitle>${evaluationOptions.jobTitle}</JobTitle>
    <Company>${evaluationOptions.companyName}</Company>
    <JobDescription>${evaluationOptions.jobDescription}</JobDescription>
    <CandidateSkills>${evaluationOptions.candidateSkills}</CandidateSkills>
    <CandidateExperience>${evaluationOptions.candidateExperience}</CandidateExperience>
  </JobDetails>
  <Requirements>
    <Item>Provide an improved version of the cover letter that addresses the feedback</Item>
    <Item>Maintain the same overall structure but enhance the content</Item>
    <Item>Focus particularly on the areas that received the lowest scores</Item>
  </Requirements>
</CoverLetterImprovementRequest>`;

      // Use the writer agent to generate an improved cover letter
      const improvedCoverLetter = await this.writerAgent.generateCoverLetter({
        candidateName: 'Candidate', // Default value
        jobTitle: evaluationOptions.jobTitle,
        companyName: evaluationOptions.companyName,
        companyInfo: 'Company information', // Default value
        companyValues: 'Company values', // Default value
        jobDescription: evaluationOptions.jobDescription,
        candidateSkills: evaluationOptions.candidateSkills,
        candidateExperience: evaluationOptions.candidateExperience,
        candidateEducation: 'Candidate education', // Default value
        customInstructions: prompt,
        tone: CoverLetterTone.PROFESSIONAL,
      });

      logger.info('Generated improved cover letter', {
        originalLength: coverLetter.length,
        improvedLength: improvedCoverLetter.coverLetter.length,
      });

      return improvedCoverLetter.coverLetter;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error('Error applying feedback', { error: errorMessage });
      // Return the original cover letter if there's an error
      return coverLetter;
    }
  }

  /**
   * Records a feedback iteration
   * @param coverLetter The cover letter
   * @param evaluationResult The evaluation result
   * @param appliedFeedback The feedback applied to generate this iteration (optional)
   */
  private recordIteration(
    coverLetter: string,
    evaluationResult: EvaluationResult,
    appliedFeedback?: string
  ): void {
    const iteration: FeedbackIteration = {
      iteration: this.iterations.length + 1,
      coverLetter,
      evaluationResult,
      appliedFeedback,
      timestamp: new Date(),
    };

    this.iterations.push(iteration);

    logger.info('Recorded feedback iteration', {
      iterationNumber: iteration.iteration,
      timestamp: iteration.timestamp,
      score: evaluationResult.overallScore,
    });
  }

  /**
   * Gets all recorded feedback iterations
   * @returns The feedback iterations
   */
  public getIterations(): FeedbackIteration[] {
    return [...this.iterations];
  }

  /**
   * Gets the latest feedback iteration
   * @returns The latest feedback iteration or undefined if none exists
   */
  public getLatestIteration(): FeedbackIteration | undefined {
    if (this.iterations.length === 0) {
      return undefined;
    }
    return this.iterations[this.iterations.length - 1];
  }

  /**
   * Resets the feedback iterations
   */
  public resetIterations(): void {
    this.iterations = [];
    this.evaluatorAgent.resetIterations();
    logger.info('Reset feedback iterations');
  }

  /**
   * Compares two cover letter versions and returns the differences
   * @param originalCoverLetter The original cover letter
   * @param improvedCoverLetter The improved cover letter
   * @returns The differences between the two versions
   */
  public static compareVersions(
    originalCoverLetter: string,
    improvedCoverLetter: string
  ): string {
    // This is a simple implementation that just highlights the differences
    // A more sophisticated implementation could use a diff algorithm
    const originalLines = originalCoverLetter.split('\n');
    const improvedLines = improvedCoverLetter.split('\n');

    let comparison = 'Changes between versions:\n\n';

    // Find the maximum length
    const maxLength = Math.max(originalLines.length, improvedLines.length);

    for (let i = 0; i < maxLength; i++) {
      const originalLine = i < originalLines.length ? originalLines[i] : '';
      const improvedLine = i < improvedLines.length ? improvedLines[i] : '';

      if (originalLine !== improvedLine) {
        comparison += `Line ${i + 1}:\n`;
        comparison += `- ${originalLine}\n`;
        comparison += `+ ${improvedLine}\n\n`;
      }
    }

    return comparison;
  }
}
