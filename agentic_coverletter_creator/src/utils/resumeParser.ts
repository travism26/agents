import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import { z } from 'zod';
import logger from './logger';
import { AIParsingService, ParsingResult } from '../services/AIParsingService';
import { FeatureFlags } from '../config/featureFlags';

/**
 * Schema for parsed resume data
 */
export const ResumeSchema = z.object({
  personalInfo: z.object({
    name: z.string(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
  }),
  experience: z.array(
    z.object({
      title: z.string(),
      company: z.string(),
      duration: z.string().optional(),
      description: z.string().optional(),
    })
  ),
  education: z.array(
    z.object({
      degree: z.string(),
      institution: z.string(),
      year: z.string().optional(),
    })
  ),
  skills: z.array(z.string()).optional(),
});

/**
 * Type definition for Resume data
 */
export type Resume = z.infer<typeof ResumeSchema>;

/**
 * ResumeParser class for extracting structured data from different resume formats
 */
export class ResumeParser {
  private featureFlags: FeatureFlags;
  private aiParsingService?: AIParsingService;

  /**
   * Creates a new ResumeParser instance
   * @param featureFlags Feature flags configuration
   * @param aiParsingService Optional AI parsing service
   */
  constructor(featureFlags: FeatureFlags, aiParsingService?: AIParsingService) {
    this.featureFlags = featureFlags;
    if (featureFlags.useAIResumeParser) {
      this.aiParsingService = aiParsingService;
    }
  }

  /**
   * Parse resume data from a PDF file
   *
   * @param buffer - Buffer containing the PDF file
   * @returns Structured resume data
   */
  async parseFromPDF(buffer: Buffer): Promise<Resume> {
    try {
      const data = await pdfParse(buffer);
      return await this.extractResumeData(data.text);
    } catch (error) {
      logger.error('Error parsing PDF resume', { error });
      throw new Error('Failed to parse PDF resume');
    }
  }

  /**
   * Parse resume data from a DOCX file
   *
   * @param buffer - Buffer containing the DOCX file
   * @returns Structured resume data
   */
  async parseFromDOCX(buffer: Buffer): Promise<Resume> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return await this.extractResumeData(result.value);
    } catch (error) {
      logger.error('Error parsing DOCX resume', { error });
      throw new Error('Failed to parse DOCX resume');
    }
  }

  /**
   * Parse resume data from a JSON string
   *
   * @param json - JSON string containing resume data
   * @returns Structured resume data
   */
  parseFromJSON(json: string): Resume {
    try {
      const parsed = JSON.parse(json);
      return ResumeSchema.parse(parsed);
    } catch (error) {
      logger.error('Error parsing JSON resume', { error });
      throw new Error('Failed to parse JSON resume');
    }
  }

  /**
   * Extract structured resume data from text
   *
   * @param text - Raw text from resume
   * @returns Structured resume data
   */
  private async extractResumeData(text: string): Promise<Resume> {
    if (this.featureFlags.useAIResumeParser && this.aiParsingService) {
      try {
        logger.info('Using AI-powered resume parsing');
        return await this.extractResumeDataAI(text);
      } catch (error) {
        logger.error('AI parsing failed, falling back to legacy parser', {
          error,
        });
        return this.extractResumeDataLegacy(text);
      }
    }

    logger.info('Using legacy resume parsing');
    return this.extractResumeDataLegacy(text);
  }

  /**
   * Extract structured resume data from text using legacy parsing
   *
   * @param text - Raw text from resume
   * @returns Structured resume data
   */
  private extractResumeDataLegacy(text: string): Resume {
    // This is a simplified placeholder implementation
    logger.info('Extracting resume data using legacy parser', {
      textLength: text.length,
    });

    // For now, return a placeholder resume
    return {
      personalInfo: {
        name: 'Extracted Name',
        email: 'example@email.com',
      },
      experience: [
        {
          title: 'Extracted Job Title',
          company: 'Extracted Company',
          description: 'Extracted description of responsibilities',
        },
      ],
      education: [
        {
          degree: 'Extracted Degree',
          institution: 'Extracted University',
        },
      ],
      skills: ['Extracted Skill 1', 'Extracted Skill 2'],
    };
  }

  /**
   * Extract structured resume data from text using AI
   *
   * @param text - Raw text from resume
   * @returns Structured resume data
   * @throws Error if AI parsing fails
   */
  private async extractResumeDataAI(text: string): Promise<Resume> {
    if (!this.aiParsingService) {
      throw new Error('AI parsing service not available');
    }

    const result: ParsingResult = await this.aiParsingService.parseResume(text);

    if (!result.data) {
      logger.warn('AI parsing returned no data', {
        errors: result.errors,
        warnings: result.warnings,
      });
      throw new Error('AI parsing failed to extract resume data');
    }

    logger.info('AI parsing successful', {
      confidence: result.confidence.overall,
      warnings: result.warnings.length,
    });

    return result.data;
  }
}
