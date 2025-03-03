import { CoverLetterController } from '../../src/controllers/coverLetterController';
import { ResumeParser } from '../../src/utils/resumeParser';
import { InputSanitizer } from '../../src/utils/inputSanitizer';
import {
  WriterAgent,
  CoverLetterTone,
} from '../../src/agents/writer/WriterAgent';
import { ResearchAgent } from '../../src/agents/research/ResearchAgent';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';

// Mock the dependencies
jest.mock('../../src/utils/resumeParser');
jest.mock('../../src/utils/inputSanitizer');
jest.mock('../../src/agents/writer/WriterAgent');
jest.mock('../../src/agents/research/ResearchAgent');
jest.mock('../../src/utils/logger', () => {
  return {
    default: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    },
  };
});

describe('CoverLetterController', () => {
  let controller: CoverLetterController;
  let mockRequest: any;
  let mockResponse: any;
  let mockResearchResult: any;
  let mockCoverLetterResult: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock the ResumeParser methods
    const mockResumeParser = ResumeParser as jest.MockedClass<
      typeof ResumeParser
    >;
    mockResumeParser.prototype.parseFromPDF.mockResolvedValue({
      personalInfo: { name: 'John Doe', email: 'john@example.com' },
      experience: [
        {
          title: 'Developer',
          company: 'Tech Co',
          duration: '2020-01 - 2022-01',
        },
      ],
      education: [
        {
          degree: 'BS Computer Science',
          institution: 'University',
          year: '2019',
        },
      ],
      skills: ['JavaScript', 'TypeScript', 'React'],
    });
    mockResumeParser.prototype.parseFromDOCX.mockResolvedValue({
      personalInfo: { name: 'John Doe', email: 'john@example.com' },
      experience: [
        {
          title: 'Developer',
          company: 'Tech Co',
          duration: '2020-01 - 2022-01',
        },
      ],
      education: [
        {
          degree: 'BS Computer Science',
          institution: 'University',
          year: '2019',
        },
      ],
      skills: ['JavaScript', 'TypeScript', 'React'],
    });
    mockResumeParser.prototype.parseFromJSON.mockReturnValue({
      personalInfo: { name: 'John Doe', email: 'john@example.com' },
      experience: [
        {
          title: 'Developer',
          company: 'Tech Co',
          duration: '2020-01 - 2022-01',
        },
      ],
      education: [
        {
          degree: 'BS Computer Science',
          institution: 'University',
          year: '2019',
        },
      ],
      skills: ['JavaScript', 'TypeScript', 'React'],
    });

    // Mock the InputSanitizer methods
    const mockInputSanitizer = InputSanitizer as jest.MockedClass<
      typeof InputSanitizer
    >;
    mockInputSanitizer.prototype.sanitizeCompanyName.mockImplementation(
      (name) => `sanitized-${name}`
    );
    mockInputSanitizer.prototype.sanitizeJobTitle.mockImplementation(
      (title) => `sanitized-${title}`
    );
    mockInputSanitizer.prototype.sanitizeJobDescription.mockImplementation(
      (desc) => `sanitized-${desc}`
    );
    mockInputSanitizer.prototype.sanitizeTonePreference.mockReturnValue(
      'formal'
    );

    // Mock the ResearchAgent methods
    mockResearchResult = {
      companyName: 'Test Company',
      companyInfo: {
        description: 'A leading tech company',
      },
      companyValues: ['Innovation', 'Integrity', 'Excellence'],
      recentNews: [
        {
          title: 'Test Company Launches New Product',
          url: 'https://example.com/news/1',
          snippet: 'Test Company has launched a new product...',
        },
      ],
      blogPosts: [],
      jobAnalysis: {
        keySkills: ['JavaScript', 'TypeScript', 'React'],
        responsibilities: ['Develop web applications', 'Write clean code'],
        qualifications: ['Bachelor degree', '3+ years experience'],
        companyFit:
          'Looking for team players who are passionate about technology',
      },
      sources: [
        {
          url: 'https://example.com',
          title: 'Test Company Website',
        },
      ],
    };

    const mockResearchAgent = ResearchAgent as jest.MockedClass<
      typeof ResearchAgent
    >;
    mockResearchAgent.prototype.researchCompany.mockResolvedValue(
      mockResearchResult
    );
    mockResearchAgent.prototype.clearCache.mockImplementation(() => {});

    // Mock the WriterAgent methods
    mockCoverLetterResult = {
      coverLetter: 'This is a generated cover letter for Test Company...',
      metadata: {
        model: 'gpt-4o',
        tokenUsage: {
          promptTokens: 500,
          completionTokens: 300,
          totalTokens: 800,
        },
        generationTime: 2500,
      },
    };

    const mockWriterAgent = WriterAgent as jest.MockedClass<typeof WriterAgent>;
    mockWriterAgent.prototype.generateCoverLetter.mockResolvedValue(
      mockCoverLetterResult
    );
    mockWriterAgent.prototype.getTokenUsage.mockReturnValue({
      promptTokens: 1500,
      completionTokens: 800,
      totalTokens: 2300,
      totalRequests: 5,
      failedRequests: 0,
    });
    mockWriterAgent.prototype.getLLMClientName.mockReturnValue('OpenAI');

    // Create controller instance
    controller = new CoverLetterController();

    // Mock Express request and response
    mockRequest = {
      body: {
        companyName: 'Test Company',
        jobTitle: 'Software Engineer',
        jobDescription: 'Job description here',
        tonePreference: 'formal',
      },
      file: null,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('generateCoverLetter', () => {
    it('should return 400 if validation fails', async () => {
      mockRequest.body.companyName = '';

      await controller.generateCoverLetter(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Bad Request',
          message: 'Invalid request parameters',
        })
      );
    });
    it('should successfully generate a cover letter', async () => {
      mockRequest.body.resume = {
        personalInfo: { name: 'John Doe' },
        experience: [{ title: 'Developer', company: 'Tech Co' }],
        education: [{ degree: 'BS', institution: 'University' }],
        skills: ['JavaScript', 'TypeScript'],
      };

      await controller.generateCoverLetter(mockRequest, mockResponse);

      expect(ResearchAgent.prototype.researchCompany).toHaveBeenCalled();
      expect(WriterAgent.prototype.generateCoverLetter).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            coverLetter: mockCoverLetterResult.coverLetter,
            metadata: mockCoverLetterResult.metadata,
          }),
        })
      );
    });

    it('should skip research when skipResearch option is true', async () => {
      mockRequest.body.resume = {
        personalInfo: { name: 'John Doe' },
        experience: [{ title: 'Developer', company: 'Tech Co' }],
        education: [{ degree: 'BS', institution: 'University' }],
        skills: ['JavaScript', 'TypeScript'],
      };
      mockRequest.body.options = { skipResearch: true };

      await controller.generateCoverLetter(mockRequest, mockResponse);

      expect(ResearchAgent.prototype.researchCompany).not.toHaveBeenCalled();
      expect(WriterAgent.prototype.generateCoverLetter).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle research errors gracefully', async () => {
      mockRequest.body.resume = {
        personalInfo: { name: 'John Doe' },
        experience: [{ title: 'Developer', company: 'Tech Co' }],
        education: [{ degree: 'BS', institution: 'University' }],
        skills: ['JavaScript', 'TypeScript'],
      };

      const mockResearchError = new Error('Research API error');
      (
        ResearchAgent.prototype.researchCompany as jest.Mock
      ).mockRejectedValueOnce(mockResearchError as never);

      await controller.generateCoverLetter(mockRequest, mockResponse);

      // Should still generate cover letter even if research fails
      expect(WriterAgent.prototype.generateCoverLetter).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getTokenUsage', () => {
    it('should return token usage statistics', () => {
      controller.getTokenUsage(mockRequest, mockResponse);

      expect(WriterAgent.prototype.getTokenUsage).toHaveBeenCalled();
      expect(WriterAgent.prototype.getLLMClientName).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            clientName: 'OpenAI',
            tokenUsage: expect.objectContaining({
              promptTokens: 1500,
              completionTokens: 800,
              totalTokens: 2300,
            }),
          }),
        })
      );
    });

    it('should handle errors when getting token usage', () => {
      const mockError = new Error('Token usage error');
      (WriterAgent.prototype.getTokenUsage as jest.Mock).mockImplementationOnce(
        () => {
          throw mockError;
        }
      );

      controller.getTokenUsage(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal Server Error',
          message: 'Failed to get token usage',
        })
      );
    });
  });

  describe('Helper methods', () => {
    it('should format experience data correctly', () => {
      const experience = [
        {
          title: 'Developer',
          company: 'Tech Co',
          duration: '2020-01 - 2022-01',
        },
        { title: 'Senior Developer', company: 'Another Co' },
      ];

      // Use private method testing technique
      const result = (controller as any).formatExperience(experience);

      expect(result).toContain('Developer at Tech Co (2020-01 - 2022-01)');
      expect(result).toContain(
        'Senior Developer at Another Co (Unknown Duration)'
      );
    });

    it('should format education data correctly', () => {
      const education = [
        {
          degree: 'BS Computer Science',
          institution: 'University',
          year: '2019',
        },
        { degree: 'MS Computer Science', institution: 'Graduate School' },
      ];

      // Use private method testing technique
      const result = (controller as any).formatEducation(education);

      expect(result).toContain('BS Computer Science from University (2019)');
      expect(result).toContain('MS Computer Science from Graduate School');
    });

    it('should handle empty or invalid data in formatters', () => {
      expect((controller as any).formatExperience(null)).toBe('');
      expect((controller as any).formatExperience([])).toBe('');
      expect((controller as any).formatExperience('not an array')).toBe('');

      expect((controller as any).formatEducation(null)).toBe('');
      expect((controller as any).formatEducation([])).toBe('');
      expect((controller as any).formatEducation('not an array')).toBe('');
    });
  });
});
