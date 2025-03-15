import { Request, Response } from 'express';
import { z } from 'zod';
import { InterviewPrepAgent } from '../agents/interview/InterviewPrepAgent';
import { InterviewPrepOptions } from '../agents/interview/interfaces/InterviewTypes';
import { InputSanitizer } from '../utils/inputSanitizer';
import {
  getFeatureFlags,
  defaultInterviewPrepOptions,
} from '../config/featureFlags';
import logger from '../utils/logger';

/**
 * Validation schema for interview preparation requests
 */
const interviewPrepRequestSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  jobDescription: z.string().min(1, 'Job description is required'),
  options: z
    .object({
      questionCount: z.number().positive().optional(),
      includeSuggestedAnswers: z.boolean().optional(),
      difficultyLevel: z
        .enum(['basic', 'intermediate', 'advanced', 'mixed'])
        .optional(),
      focusAreas: z
        .array(z.enum(['technical', 'cultural', 'company-specific']))
        .optional(),
      forceRefresh: z.boolean().optional(),
    })
    .optional(),
});

/**
 * Controller for handling interview preparation requests
 */
export class InterviewController {
  private interviewPrepAgent: InterviewPrepAgent;
  private inputSanitizer: InputSanitizer;
  private featureFlags: ReturnType<typeof getFeatureFlags>;

  /**
   * Creates a new InterviewController instance
   */
  constructor() {
    // Get feature flags
    this.featureFlags = getFeatureFlags();

    // Initialize services
    this.inputSanitizer = new InputSanitizer();
    this.interviewPrepAgent = InterviewPrepAgent.createDefault();

    logger.info('InterviewController initialized');
  }

  /**
   * Generate interview preparation materials
   * @param req Express request object
   * @param res Express response object
   */
  async generateInterviewPrep(req: Request, res: Response): Promise<void> {
    try {
      // Check if the feature is enabled
      if (!this.featureFlags.enableInterviewPrep) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Interview preparation feature is not enabled',
        });
        return;
      }

      // Validate request body against schema
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

      const sanitizedCompanyName =
        this.inputSanitizer.sanitizeCompanyName(companyName);
      const sanitizedJobDescription =
        this.inputSanitizer.sanitizeJobDescription(jobDescription);

      // Merge default options with provided options
      const interviewPrepOptions: InterviewPrepOptions = {
        ...defaultInterviewPrepOptions,
        ...options,
      };

      // Log the interview prep generation request
      logger.info('Interview preparation requested', {
        company: sanitizedCompanyName,
        optionsProvided: !!options,
      });

      // Generate interview preparation materials
      const interviewPrep = await this.interviewPrepAgent.generateInterviewPrep(
        sanitizedCompanyName,
        sanitizedJobDescription,
        interviewPrepOptions
      );

      // Return the generated interview preparation materials
      res.status(200).json({
        success: true,
        data: interviewPrep,
      });
    } catch (error) {
      logger.error('Error generating interview preparation', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to generate interview preparation materials',
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }

  /**
   * Clear the interview preparation cache
   * @param _req Express request object
   * @param res Express response object
   */
  clearCache(_req: Request, res: Response): void {
    try {
      this.interviewPrepAgent.clearCache();

      res.status(200).json({
        success: true,
        message: 'Interview preparation cache cleared',
      });
    } catch (error) {
      logger.error('Error clearing interview preparation cache', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to clear interview preparation cache',
      });
    }
  }
}
