import { Request, Response } from 'express';
import {
  ResearchAgent,
  ResearchOptions,
} from '../agents/research/ResearchAgent';
import { InputSanitizer } from '../utils/inputSanitizer';
import logger from '../utils/logger';
import { z } from 'zod';

/**
 * Validation schema for company research requests
 */
const companyResearchSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  jobDescription: z.string().optional(),
  options: z
    .object({
      preferredClients: z.array(z.string()).optional(),
      cacheResults: z.boolean().optional(),
      maxResults: z.number().positive().optional(),
    })
    .optional(),
});

/**
 * Controller for handling research-related requests
 */
export class ResearchController {
  private researchAgent: ResearchAgent;
  private inputSanitizer: InputSanitizer;

  constructor() {
    this.researchAgent = new ResearchAgent();
    this.inputSanitizer = new InputSanitizer();
  }

  /**
   * Research a company based on the provided company name and job description
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  async researchCompany(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body against schema
      const validationResult = companyResearchSchema.safeParse(req.body);

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
      const sanitizedJobDescription = jobDescription
        ? this.inputSanitizer.sanitizeJobDescription(jobDescription)
        : '';

      // Log the research request
      logger.info('Company research requested', {
        company: sanitizedCompanyName,
        hasJobDescription: !!sanitizedJobDescription,
      });

      // Perform company research
      const researchResult = await this.researchAgent.researchCompany(
        sanitizedCompanyName,
        sanitizedJobDescription,
        options as ResearchOptions
      );

      // Return the research results
      res.status(200).json({
        success: true,
        data: researchResult,
      });
    } catch (error) {
      logger.error('Error researching company', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to research company',
      });
    }
  }

  /**
   * Clear the research cache
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  clearCache(_req: Request, res: Response): void {
    try {
      this.researchAgent.clearCache();
      logger.info('Research cache cleared');

      res.status(200).json({
        success: true,
        message: 'Research cache cleared successfully',
      });
    } catch (error) {
      logger.error('Error clearing research cache', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to clear research cache',
      });
    }
  }
}
