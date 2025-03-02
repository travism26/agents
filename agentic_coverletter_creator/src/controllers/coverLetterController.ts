import { Request, Response } from 'express';
import { ResumeParser } from '../utils/resumeParser';
import { InputSanitizer } from '../utils/inputSanitizer';
import logger from '../utils/logger';

/**
 * Controller for handling cover letter generation requests
 */
export class CoverLetterController {
  private resumeParser: ResumeParser;
  private inputSanitizer: InputSanitizer;

  constructor() {
    this.resumeParser = new ResumeParser();
    this.inputSanitizer = new InputSanitizer();
  }

  /**
   * Generate a cover letter based on the provided resume and job details
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  async generateCoverLetter(req: Request, res: Response): Promise<void> {
    try {
      // Extract and sanitize inputs
      const { companyName, jobTitle, jobDescription, tonePreference } =
        req.body;

      // Validate required fields
      if (!companyName || !jobTitle) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Company name and job title are required',
        });
        return;
      }

      // Sanitize inputs
      const sanitizedCompanyName =
        this.inputSanitizer.sanitizeCompanyName(companyName);
      const sanitizedJobTitle = this.inputSanitizer.sanitizeJobTitle(jobTitle);
      const sanitizedJobDescription = jobDescription
        ? this.inputSanitizer.sanitizeJobDescription(jobDescription)
        : undefined;
      const sanitizedTonePreference = tonePreference
        ? this.inputSanitizer.sanitizeTonePreference(tonePreference)
        : 'balanced';

      // Parse resume from request (if provided)
      let resume;
      if (req.file) {
        const buffer = req.file.buffer;
        const fileType = req.file.mimetype;

        if (fileType === 'application/pdf') {
          resume = await this.resumeParser.parseFromPDF(buffer);
        } else if (
          fileType ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
          resume = await this.resumeParser.parseFromDOCX(buffer);
        } else if (fileType === 'application/json') {
          resume = this.resumeParser.parseFromJSON(buffer.toString());
        } else {
          res.status(400).json({
            error: 'Bad Request',
            message: 'Unsupported file format',
          });
          return;
        }
      } else if (req.body.resume) {
        // If resume is provided as JSON in the request body
        try {
          resume = this.resumeParser.parseFromJSON(
            typeof req.body.resume === 'string'
              ? req.body.resume
              : JSON.stringify(req.body.resume)
          );
        } catch (error) {
          res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid resume format',
          });
          return;
        }
      } else {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Resume is required',
        });
        return;
      }

      // TODO: Implement actual cover letter generation using the orchestrator
      // This is a placeholder response until the orchestrator is implemented
      logger.info('Cover letter generation requested', {
        company: sanitizedCompanyName,
        jobTitle: sanitizedJobTitle,
        tonePreference: sanitizedTonePreference,
      });

      // Return a placeholder response
      res.status(200).json({
        message: 'Cover letter generation is not yet implemented',
        inputs: {
          companyName: sanitizedCompanyName,
          jobTitle: sanitizedJobTitle,
          jobDescription: sanitizedJobDescription,
          tonePreference: sanitizedTonePreference,
          resumeProvided: !!resume,
        },
      });
    } catch (error) {
      logger.error('Error generating cover letter', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to generate cover letter',
      });
    }
  }
}
