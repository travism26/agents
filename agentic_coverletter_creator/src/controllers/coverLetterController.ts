import { Request, Response } from 'express';
import { ResumeParser } from '../utils/resumeParser';
import { InputSanitizer } from '../utils/inputSanitizer';
import logger from '../utils/logger';
import {
  WriterAgent,
  CoverLetterTone,
  CoverLetterApproach,
  CoverLetterOptions,
  MultiCoverLetterOptions,
} from '../agents/writer/WriterAgent';
import { ResearchAgent } from '../agents/research/ResearchAgent';
import { EvaluatorAgent } from '../agents/evaluator/EvaluatorAgent';
import { Orchestrator } from '../orchestrator/Orchestrator';
import { InterviewPrepOptions } from '../agents/interview/interfaces/InterviewTypes';
import { z } from 'zod';
import {
  getFeatureFlags,
  defaultInterviewPrepOptions,
} from '../config/featureFlags';
import { AIParsingService } from '../services/AIParsingService';
import { OpenAIClient } from '../agents/writer/clients/OpenAIClient';
import { LLMClientFactory } from '../agents/writer/clients/LLMClientFactory';

/**
 * Validation schema for interview prep options
 */
const interviewPrepOptionsSchema = z.object({
  questionCount: z.number().positive().optional(),
  includeSuggestedAnswers: z.boolean().optional(),
  difficultyLevel: z
    .enum(['basic', 'intermediate', 'advanced', 'mixed'])
    .optional(),
  focusAreas: z
    .array(z.enum(['technical', 'cultural', 'company-specific']))
    .optional(),
  forceRefresh: z.boolean().optional(),
});

/**
 * Validation schema for cover letter generation requests
 */
const coverLetterGenerationSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  jobTitle: z.string().min(1, 'Job title is required'),
  jobDescription: z.string().optional(),
  tonePreference: z
    .enum([
      CoverLetterTone.PROFESSIONAL,
      CoverLetterTone.ENTHUSIASTIC,
      CoverLetterTone.CONFIDENT,
      CoverLetterTone.CREATIVE,
      CoverLetterTone.BALANCED,
    ])
    .optional(),
  maxLength: z.number().positive().optional(),
  customInstructions: z.string().optional(),
  resume: z.any().optional(), // Will be validated separately
  options: z
    .object({
      skipResearch: z.boolean().optional(),
      cacheResults: z.boolean().optional(),
      preferredLLMModel: z.string().optional(),
    })
    .optional(),
  // New fields for multiple cover letter generation
  generateMultiple: z
    .union([
      z.boolean(),
      z.string().transform((val) => val.toLowerCase() === 'true'),
    ])
    .optional(),
  customTemplate: z.string().optional(),
  approach: z
    .enum([
      CoverLetterApproach.STANDARD,
      CoverLetterApproach.ACHIEVEMENT_FOCUSED,
      CoverLetterApproach.COMPANY_CULTURE_MATCH,
      CoverLetterApproach.SKILLS_HIGHLIGHT,
      CoverLetterApproach.REQUIREMENTS_TABLE,
      CoverLetterApproach.CUSTOM_TEMPLATE,
    ])
    .optional(),
  approaches: z
    .array(
      z.enum([
        CoverLetterApproach.STANDARD,
        CoverLetterApproach.ACHIEVEMENT_FOCUSED,
        CoverLetterApproach.COMPANY_CULTURE_MATCH,
        CoverLetterApproach.SKILLS_HIGHLIGHT,
        CoverLetterApproach.REQUIREMENTS_TABLE,
        CoverLetterApproach.CUSTOM_TEMPLATE,
      ])
    )
    .optional(),
  // New fields for interview preparation
  includeInterviewPrep: z
    .union([
      z.boolean(),
      z.string().transform((val) => val.toLowerCase() === 'true'),
    ])
    .optional(),
  interviewPrepOptions: interviewPrepOptionsSchema.optional(),
});

/**
 * Controller for handling cover letter generation requests
 */
export class CoverLetterController {
  private resumeParser: ResumeParser;
  private inputSanitizer: InputSanitizer;
  private writerAgent: WriterAgent;
  private researchAgent: ResearchAgent;
  private evaluatorAgent: EvaluatorAgent;
  private orchestrator: Orchestrator;
  private featureFlags: ReturnType<typeof getFeatureFlags>;

  constructor() {
    // Get feature flags
    this.featureFlags = getFeatureFlags();

    // Initialize services
    this.inputSanitizer = new InputSanitizer();
    this.writerAgent = new WriterAgent();
    this.researchAgent = new ResearchAgent();

    // Get LLM client for evaluator
    const llmClientFactory = LLMClientFactory.getInstance();
    const llmClient = llmClientFactory.getClient('openai');

    if (!llmClient) {
      throw new Error('OpenAI client not available for EvaluatorAgent');
    }

    this.evaluatorAgent = new EvaluatorAgent({ llmClient });

    // Initialize orchestrator
    this.orchestrator = new Orchestrator(
      this.researchAgent,
      this.writerAgent,
      this.evaluatorAgent
    );

    // Initialize AI parsing service if feature flag is enabled
    let aiParsingService;
    if (this.featureFlags.useAIResumeParser) {
      // Use the same OpenAI client that the writer agent uses
      // In a production environment, you might want to inject this dependency
      const openAIApiKey = process.env.OPENAI_API_KEY || '';
      if (openAIApiKey) {
        const openAIClient = new OpenAIClient(openAIApiKey);
        aiParsingService = new AIParsingService(openAIClient);
        logger.info('AI resume parsing service initialized');
      } else {
        logger.warn('OpenAI API key not found, AI resume parsing disabled');
      }
    }

    // Initialize resume parser with feature flags and AI parsing service
    this.resumeParser = new ResumeParser(this.featureFlags, aiParsingService);
  }

  /**
   * Generate a cover letter based on the provided resume and job details
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  async generateCoverLetter(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body against schema
      const validationResult = coverLetterGenerationSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid request parameters',
          details: validationResult.error.format(),
        });
        return;
      }

      // Extract and sanitize inputs
      const {
        companyName,
        jobTitle,
        jobDescription,
        tonePreference,
        maxLength,
        customInstructions,
        options,
        generateMultiple,
        customTemplate,
        approach,
        approaches,
        includeInterviewPrep,
        interviewPrepOptions,
      } = validationResult.data;

      const sanitizedCompanyName =
        this.inputSanitizer.sanitizeCompanyName(companyName);
      const sanitizedJobTitle = this.inputSanitizer.sanitizeJobTitle(jobTitle);
      const sanitizedJobDescription = jobDescription
        ? this.inputSanitizer.sanitizeJobDescription(jobDescription)
        : '';
      const sanitizedTonePreference =
        tonePreference || CoverLetterTone.BALANCED;

      // Parse resume from request (if provided)
      let resume;
      if (req.file) {
        const buffer = req.file.buffer;
        const fileType = req.file.mimetype;

        // Log file information for debugging
        logger.info('Processing uploaded file', {
          filename: req.file.originalname,
          mimetype: fileType,
          size: req.file.size,
        });

        if (fileType === 'application/pdf') {
          resume = await this.resumeParser.parseFromPDF(buffer);
        } else if (
          fileType ===
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          // Add support for alternative DOCX MIME types
          fileType === 'application/msword' ||
          fileType === 'application/vnd.ms-word.document.macroEnabled.12' ||
          // Handle case where MIME type might be detected incorrectly
          (req.file.originalname.toLowerCase().endsWith('.docx') &&
            (fileType === 'application/octet-stream' ||
              fileType.includes('word')))
        ) {
          logger.info('Processing DOCX file', { mimetype: fileType });
          resume = await this.resumeParser.parseFromDOCX(buffer);
        } else if (fileType === 'application/json') {
          resume = this.resumeParser.parseFromJSON(buffer.toString());
        } else {
          logger.warn('Unsupported file format', {
            mimetype: fileType,
            filename: req.file.originalname,
          });
          res.status(400).json({
            error: 'Bad Request',
            message: 'Unsupported file format',
            details: `File type ${fileType} is not supported. Please upload a PDF, DOCX, or JSON file.`,
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

      // Log the cover letter generation request
      logger.info('Cover letter generation requested', {
        company: sanitizedCompanyName,
        jobTitle: sanitizedJobTitle,
        tonePreference: sanitizedTonePreference,
      });

      // Perform company research if not skipped
      let companyInfo = '';
      let companyValues: string[] = [];

      if (!options?.skipResearch) {
        try {
          const researchResult = await this.researchAgent.researchCompany(
            sanitizedCompanyName,
            sanitizedJobDescription,
            {
              cacheResults: options?.cacheResults,
            }
          );

          // Extract relevant information from research results
          companyInfo = researchResult.companyInfo.description || '';
          companyValues = researchResult.companyValues;

          logger.info('Company research completed successfully', {
            company: sanitizedCompanyName,
          });
        } catch (error) {
          logger.warn(
            'Error during company research, proceeding without research data',
            {
              error: error instanceof Error ? error.message : String(error),
            }
          );
        }
      }

      // Check if multiple cover letter generation is enabled and requested
      if (generateMultiple && this.featureFlags.enableMultipleCoverLetters) {
        // Validate approaches
        if (!approaches || approaches.length === 0) {
          res.status(400).json({
            error: 'Bad Request',
            message:
              'At least one approach must be specified for multiple cover letter generation',
          });
          return;
        }

        // Configure orchestrator for multiple cover letter generation
        const orchestratorOptions = {
          generateMultiple: true,
          approaches: approaches,
          customTemplate: customTemplate,
          includeInterviewPrep:
            includeInterviewPrep && this.featureFlags.enableInterviewPrep,
          interviewPrepOptions:
            includeInterviewPrep && this.featureFlags.enableInterviewPrep
              ? { ...defaultInterviewPrepOptions, ...interviewPrepOptions }
              : undefined,
        };

        // Create request for orchestrator
        const orchestratorRequest = {
          resume,
          companyName: sanitizedCompanyName,
          jobTitle: sanitizedJobTitle,
          jobDescription: sanitizedJobDescription,
          tonePreference: sanitizedTonePreference,
          approaches,
          customTemplate,
          includeInterviewPrep:
            includeInterviewPrep && this.featureFlags.enableInterviewPrep,
          interviewPrepOptions: interviewPrepOptions,
        };

        // Generate multiple cover letters using orchestrator
        const multiCoverLetterResult =
          await this.orchestrator.generateMultipleCoverLetters(
            orchestratorRequest
          );

        // Return the generated cover letters
        res.status(200).json({
          success: true,
          data: {
            coverLetters: multiCoverLetterResult.coverLetters.map((result) => ({
              coverLetter: result.coverLetter,
              approach: result.approach,
              evaluation: result.evaluation,
            })),
            companyResearch: multiCoverLetterResult.companyResearch,
            interviewPrep: multiCoverLetterResult.interviewPrep,
          },
        });
      } else {
        // Configure orchestrator for single cover letter generation
        const orchestratorOptions = {
          approach: approach,
          includeInterviewPrep:
            includeInterviewPrep && this.featureFlags.enableInterviewPrep,
          interviewPrepOptions:
            includeInterviewPrep && this.featureFlags.enableInterviewPrep
              ? { ...defaultInterviewPrepOptions, ...interviewPrepOptions }
              : undefined,
        };

        // Create request for orchestrator
        const orchestratorRequest = {
          resume,
          companyName: sanitizedCompanyName,
          jobTitle: sanitizedJobTitle,
          jobDescription: sanitizedJobDescription,
          tonePreference: sanitizedTonePreference,
          approach,
          includeInterviewPrep:
            includeInterviewPrep && this.featureFlags.enableInterviewPrep,
          interviewPrepOptions: interviewPrepOptions,
        };

        // Generate cover letter using orchestrator
        const coverLetterResult = await this.orchestrator.generateCoverLetter(
          orchestratorRequest
        );

        // Return the generated cover letter
        res.status(200).json({
          success: true,
          data: {
            coverLetter: coverLetterResult.coverLetter,
            approach:
              coverLetterResult.approach || CoverLetterApproach.STANDARD,
            evaluation: coverLetterResult.evaluation,
            companyResearch: coverLetterResult.companyResearch,
            interviewPrep: coverLetterResult.interviewPrep,
          },
        });
      }
    } catch (error) {
      logger.error('Error generating cover letter', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to generate cover letter',
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }

  /**
   * Get token usage statistics for the writer agent
   *
   * @param _req - Express request object
   * @param res - Express response object
   */
  getTokenUsage(_req: Request, res: Response): void {
    try {
      const tokenUsage = this.writerAgent.getTokenUsage();
      const clientName = this.writerAgent.getLLMClientName();

      res.status(200).json({
        success: true,
        data: {
          clientName,
          tokenUsage,
        },
      });
    } catch (error) {
      logger.error('Error getting token usage', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get token usage',
      });
    }
  }

  /**
   * Format experience data for the cover letter
   *
   * @param experience - Array of experience items from resume
   * @returns Formatted experience string
   */
  private formatExperience(experience?: any[]): string {
    if (!experience || !Array.isArray(experience) || experience.length === 0) {
      return '';
    }

    return experience
      .map((exp) => {
        const company = exp.company || 'Unknown Company';
        const position = exp.position || 'Unknown Position';
        const duration =
          exp.startDate && exp.endDate
            ? `${exp.startDate} - ${exp.endDate}`
            : 'Unknown Duration';

        return `${position} at ${company} (${duration})`;
      })
      .join('; ');
  }

  /**
   * Format education data for the cover letter
   *
   * @param education - Array of education items from resume
   * @returns Formatted education string
   */
  private formatEducation(education?: any[]): string {
    if (!education || !Array.isArray(education) || education.length === 0) {
      return '';
    }

    return education
      .map((edu) => {
        const institution = edu.institution || 'Unknown Institution';
        const degree = edu.degree || 'Unknown Degree';
        const year = edu.year || '';

        return `${degree} from ${institution}${year ? ` (${year})` : ''}`;
      })
      .join('; ');
  }
}
