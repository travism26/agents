import {
  BaseLLMClient,
  LLMGenerationOptions,
} from '../agents/writer/interfaces/LLMClient';
import logger from '../utils/logger';
import { Resume, ResumeSchema } from '../utils/resumeParser';
import { z } from 'zod';

/**
 * Safely parses JSON from a string, handling markdown code blocks
 * @param text The text to parse
 * @returns The parsed JSON object
 * @throws Error if the text cannot be parsed as JSON
 */
function safeJsonParse(text: string): any {
  // Log the raw text for debugging
  logger.debug('Attempting to parse JSON', {
    textLength: text.length,
    textPreview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
  });

  try {
    // First try direct parsing
    logger.debug('Attempting direct JSON parsing');
    const directResult = JSON.parse(text);
    logger.debug('Direct JSON parsing successful');
    return directResult;
  } catch (error) {
    logger.debug('Direct JSON parsing failed', { error: String(error) });

    // If direct parsing fails, try to extract JSON from markdown code blocks
    logger.debug('Checking for markdown code blocks');
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        logger.debug('Found markdown code block, attempting to parse content');
        const markdownResult = JSON.parse(jsonMatch[1]);
        logger.debug('Markdown JSON parsing successful');
        return markdownResult;
      } catch (innerError) {
        logger.debug('Markdown JSON parsing failed', {
          error: String(innerError),
        });
        throw new Error(`Failed to parse JSON from markdown: ${innerError}`);
      }
    } else {
      logger.debug('No markdown code blocks found');
    }

    // If no code blocks, try to find anything that looks like JSON
    logger.debug('Searching for JSON-like patterns');
    const possibleJson = text.match(/\{[\s\S]*\}/);
    if (possibleJson) {
      try {
        logger.debug('Found JSON-like pattern, attempting to parse');
        const patternResult = JSON.parse(possibleJson[0]);
        logger.debug('Pattern JSON parsing successful');
        return patternResult;
      } catch (innerError) {
        logger.debug('Pattern JSON parsing failed', {
          error: String(innerError),
        });
        throw new Error(`Failed to parse JSON object: ${innerError}`);
      }
    } else {
      logger.debug('No JSON-like patterns found');
    }

    // Log the full text on complete failure for debugging
    logger.error('All JSON parsing attempts failed', {
      fullText: text,
      error: String(error),
    });

    throw new Error(`Invalid JSON format: ${error}`);
  }
}

/**
 * Result of parsing a resume with AI
 */
export interface ParsingResult {
  data: Resume | null;
  confidence: {
    overall: number;
    sections: Record<string, number>;
  };
  errors: Array<{
    section: string;
    error: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  warnings: Array<{
    section: string;
    message: string;
    suggestion: string;
  }>;
}

/**
 * Metrics for resume parsing
 */
export interface ParserMetrics {
  method: 'ai' | 'legacy';
  duration: number;
  success: boolean;
  fallbackTriggered: boolean;
  confidenceScore?: number;
}

/**
 * Service for parsing resumes using AI
 */
export class AIParsingService {
  private llmClient: BaseLLMClient;

  /**
   * Creates a new AIParsingService
   * @param llmClient LLM client to use for parsing
   */
  constructor(llmClient: BaseLLMClient) {
    this.llmClient = llmClient;
  }

  /**
   * Parse a resume using AI
   * @param text Resume text to parse
   * @returns Parsed resume data and metadata
   */
  async parseResume(text: string): Promise<ParsingResult> {
    const startTime = Date.now();
    let success = false;
    let fallbackTriggered = false;
    let confidenceScore = 0;

    try {
      logger.info('Parsing resume with AI', { textLength: text.length });

      const prompt = this.createStructuredPrompt(text);
      const options: LLMGenerationOptions = {
        temperature: 0.2, // Lower temperature for more deterministic output
        systemPrompt:
          'You are an expert resume parser that extracts structured information from resumes.',
        maxTokens: 2500, // Ensure enough tokens for complete resume parsing
        responseFormat: { type: 'json_object' }, // Request JSON format
      };

      const response = await this.llmClient.generate(prompt, options);

      // Parse JSON from response
      const parsedData = safeJsonParse(response.text);
      const validationResult = this.validateResponse(parsedData);

      success = true;
      confidenceScore = validationResult.confidence.overall;

      return validationResult;
    } catch (error) {
      logger.error('Error parsing resume with AI', { error });

      fallbackTriggered = true;

      return {
        data: null,
        confidence: {
          overall: 0,
          sections: {},
        },
        errors: [
          {
            section: 'overall',
            error: error instanceof Error ? error.message : 'Unknown error',
            severity: 'high',
          },
        ],
        warnings: [],
      };
    } finally {
      // Track metrics
      this.trackParsingMetrics({
        method: 'ai',
        duration: Date.now() - startTime,
        success,
        fallbackTriggered,
        confidenceScore,
      });
    }
  }

  /**
   * Create a structured prompt for resume parsing
   * @param text Resume text to parse
   * @returns Structured prompt
   */
  private createStructuredPrompt(text: string): string {
    return `
<ResumeParsingRequest>
  <Purpose>Extract structured information from resume text into a standardized JSON format</Purpose>
  
  <InputText>${text}</InputText>
  
  <ParsingInstructions>
    - Extract all relevant information from the resume
    - Categorize skills by domain and expertise level
    - Convert dates to ISO format
    - Identify current positions
    - Extract quantifiable achievements
    - Maintain consistent formatting
  </ParsingInstructions>

  <ReturnStructure>
    CRITICAL: You must return ONLY raw JSON without ANY markdown formatting, code blocks, or backticks.
    DO NOT wrap the response in \`\`\`json or any other markdown.
    The response must be valid JSON that can be directly parsed by JSON.parse().

    Example of CORRECT format:
    {"personalInfo":{"name":"John Doe"},"experience":[]}

    Example of INCORRECT format:
    \`\`\`json
    {"personalInfo":{"name":"John Doe"},"experience":[]}
    \`\`\`

    Your response must follow this structure:
    {
      "personalInfo": {
        "name": string,
        "email": string,
        "phone": string?,
        "location": {
          "city": string?,
          "state": string?,
          "country": string?
        },
        "linkedIn": string?,
        "portfolio": string?
      },
      "summary": string?,
      "experience": [{
        "title": string,
        "company": string,
        "location": string?,
        "startDate": string,  // ISO format
        "endDate": string?,   // ISO format
        "current": boolean,
        "highlights": string[],
        "technologies": string[],
        "achievements": string[]
      }],
      "education": [{
        "degree": string,
        "institution": string,
        "location": string?,
        "startDate": string?,
        "endDate": string?,
        "gpa": string?,
        "honors": string[],
        "relevantCourses": string[]
      }],
      "skills": [{
        "name": string,
        "category": string,
        "level": string?,
        "yearsOfExperience": number?
      }],
      "certifications": [{
        "name": string,
        "issuer": string,
        "date": string?,
        "expiryDate": string?,
        "id": string?
      }],
      "projects": [{
        "name": string,
        "description": string,
        "technologies": string[],
        "url": string?,
        "highlights": string[]
      }],
      "languages": [{
        "name": string,
        "proficiency": string
      }]
    }
  </ReturnStructure>

  <ValidationRules>
    - All dates must be in ISO format (YYYY-MM-DD)
    - Email must be valid format
    - URLs must include http/https
    - Skills must have valid categories
    - Required fields cannot be empty
  </ValidationRules>
</ResumeParsingRequest>`;
  }

  /**
   * Validate and process the LLM response
   * @param response Parsed JSON response from LLM
   * @returns Validated parsing result
   */
  private validateResponse(response: any): ParsingResult {
    const errors: ParsingResult['errors'] = [];
    const warnings: ParsingResult['warnings'] = [];
    const confidenceSections: Record<string, number> = {};

    // Define enhanced schema for validation
    const EnhancedResumeSchema = z.object({
      personalInfo: z.object({
        name: z.string(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        location: z
          .object({
            city: z.string().optional(),
            state: z.string().optional(),
            country: z.string().optional(),
          })
          .optional(),
        linkedIn: z.string().url().optional(),
        portfolio: z.string().url().optional(),
      }),
      summary: z.string().optional(),
      experience: z.array(
        z.object({
          title: z.string(),
          company: z.string(),
          location: z.string().optional(),
          startDate: z.string(),
          endDate: z.string().optional(),
          current: z.boolean().optional(),
          highlights: z.array(z.string()),
          technologies: z.array(z.string()).optional(),
          achievements: z.array(z.string()).optional(),
        })
      ),
      education: z.array(
        z.object({
          degree: z.string(),
          institution: z.string(),
          location: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          gpa: z.string().optional(),
          honors: z.array(z.string()).optional(),
          relevantCourses: z.array(z.string()).optional(),
        })
      ),
      skills: z.array(
        z.object({
          name: z.string(),
          category: z.string(),
          level: z.string().optional(),
          yearsOfExperience: z.number().optional(),
        })
      ),
      certifications: z
        .array(
          z.object({
            name: z.string(),
            issuer: z.string(),
            date: z.string().optional(),
            expiryDate: z.string().optional(),
            id: z.string().optional(),
          })
        )
        .optional(),
      projects: z
        .array(
          z.object({
            name: z.string(),
            description: z.string(),
            technologies: z.array(z.string()),
            url: z.string().url().optional(),
            highlights: z.array(z.string()).optional(),
          })
        )
        .optional(),
      languages: z
        .array(
          z.object({
            name: z.string(),
            proficiency: z.string(),
          })
        )
        .optional(),
    });

    // Validate against enhanced schema
    const validationResult = EnhancedResumeSchema.safeParse(response);

    if (!validationResult.success) {
      // Process validation errors
      validationResult.error.errors.forEach((err) => {
        const section = err.path[0] as string;
        errors.push({
          section,
          error: `${err.path.join('.')}: ${err.message}`,
          severity: 'medium',
        });

        // Set low confidence for sections with errors
        confidenceSections[section] = 0.3;
      });
    }

    // Convert to standard Resume format
    let standardizedData: Resume | null = null;

    try {
      // Map enhanced schema to standard Resume schema
      const standardData: Resume = {
        personalInfo: {
          name: response.personalInfo.name,
          email: response.personalInfo.email,
          phone: response.personalInfo.phone,
          location:
            response.personalInfo.location?.city ||
            [
              response.personalInfo.location?.city,
              response.personalInfo.location?.state,
              response.personalInfo.location?.country,
            ]
              .filter(Boolean)
              .join(', '),
        },
        experience: response.experience.map((exp: any) => ({
          title: exp.title,
          company: exp.company,
          duration:
            exp.startDate && exp.endDate
              ? `${exp.startDate} - ${exp.endDate}`
              : exp.startDate || '',
          description: exp.highlights?.join('\n') || '',
        })),
        education: response.education.map((edu: any) => ({
          degree: edu.degree,
          institution: edu.institution,
          year: edu.endDate || edu.startDate || '',
        })),
        skills: response.skills.map((skill: any) => skill.name),
      };

      // Validate against standard schema
      standardizedData = ResumeSchema.parse(standardData);

      // Set confidence for sections
      Object.keys(standardizedData).forEach((key) => {
        if (!(key in confidenceSections)) {
          confidenceSections[key] = 0.9;
        }
      });
    } catch (error) {
      errors.push({
        section: 'overall',
        error: 'Failed to convert to standard Resume format',
        severity: 'high',
      });
      logger.error('Error converting to standard Resume format', { error });
    }

    // Calculate overall confidence
    const overallConfidence =
      Object.values(confidenceSections).reduce((sum, value) => sum + value, 0) /
      Math.max(1, Object.values(confidenceSections).length);

    return {
      data: standardizedData,
      confidence: {
        overall: overallConfidence,
        sections: confidenceSections,
      },
      errors,
      warnings,
    };
  }

  /**
   * Track parsing metrics
   * @param metrics Metrics to track
   */
  private trackParsingMetrics(metrics: ParserMetrics): void {
    // In a production environment, this would send metrics to a monitoring system
    logger.info('Resume parsing metrics', { metrics });
  }
}
