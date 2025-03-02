import { Request, Response } from 'express';
import { ResearchController } from '../../src/controllers/researchController';
import { ResearchAgent } from '../../src/agents/research/ResearchAgent';
import { InputSanitizer } from '../../src/utils/inputSanitizer';

// Mock dependencies
jest.mock('../../src/agents/research/ResearchAgent');
jest.mock('../../src/utils/inputSanitizer');
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('ResearchController', () => {
  let researchController: ResearchController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockResearchAgent: jest.Mocked<ResearchAgent>;
  let mockInputSanitizer: jest.Mocked<InputSanitizer>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock instances
    mockResearchAgent = new ResearchAgent() as jest.Mocked<ResearchAgent>;
    mockInputSanitizer = new InputSanitizer() as jest.Mocked<InputSanitizer>;

    // Setup mock response
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Setup mock request
    mockRequest = {
      body: {},
    };

    // Setup mock methods
    mockInputSanitizer.sanitizeCompanyName = jest.fn((name) => name);
    mockInputSanitizer.sanitizeJobDescription = jest.fn((desc) => desc);
    mockResearchAgent.researchCompany = jest.fn().mockResolvedValue({
      companyName: 'Test Company',
      companyInfo: { description: 'A test company' },
      companyValues: ['Innovation', 'Quality'],
      recentNews: [],
      blogPosts: [],
      jobAnalysis: {
        keySkills: [],
        responsibilities: [],
        qualifications: [],
        companyFit: '',
      },
      sources: [],
    });
    mockResearchAgent.clearCache = jest.fn();

    // Create controller with mocked dependencies
    researchController = new ResearchController();
    // @ts-ignore - Replace private properties with mocks
    researchController.researchAgent = mockResearchAgent;
    // @ts-ignore - Replace private properties with mocks
    researchController.inputSanitizer = mockInputSanitizer;
  });

  describe('researchCompany', () => {
    it('should return 400 if company name is missing', async () => {
      // Arrange
      mockRequest.body = {};

      // Act
      await researchController.researchCompany(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Bad Request',
          message: 'Invalid request parameters',
        })
      );
      expect(mockResearchAgent.researchCompany).not.toHaveBeenCalled();
    });

    it('should return 200 with research results for valid request', async () => {
      // Arrange
      mockRequest.body = {
        companyName: 'Test Company',
        jobDescription: 'Software Engineer job description',
      };

      // Act
      await researchController.researchCompany(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockInputSanitizer.sanitizeCompanyName).toHaveBeenCalledWith(
        'Test Company'
      );
      expect(mockInputSanitizer.sanitizeJobDescription).toHaveBeenCalledWith(
        'Software Engineer job description'
      );
      expect(mockResearchAgent.researchCompany).toHaveBeenCalledWith(
        'Test Company',
        'Software Engineer job description',
        undefined
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          companyName: 'Test Company',
        }),
      });
    });

    it('should handle options when provided', async () => {
      // Arrange
      mockRequest.body = {
        companyName: 'Test Company',
        jobDescription: 'Software Engineer job description',
        options: {
          preferredClients: ['bing'],
          cacheResults: true,
          maxResults: 5,
        },
      };

      // Act
      await researchController.researchCompany(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockResearchAgent.researchCompany).toHaveBeenCalledWith(
        'Test Company',
        'Software Engineer job description',
        {
          preferredClients: ['bing'],
          cacheResults: true,
          maxResults: 5,
        }
      );
    });

    it('should return 500 if research agent throws an error', async () => {
      // Arrange
      mockRequest.body = {
        companyName: 'Test Company',
      };
      mockResearchAgent.researchCompany = jest
        .fn()
        .mockRejectedValue(new Error('API error'));

      // Act
      await researchController.researchCompany(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal Server Error',
          message: 'Failed to research company',
        })
      );
    });
  });

  describe('clearCache', () => {
    it('should clear the research cache and return success', () => {
      // Act
      researchController.clearCache(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockResearchAgent.clearCache).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Research cache cleared successfully',
      });
    });

    it('should return 500 if clearing cache throws an error', () => {
      // Arrange
      mockResearchAgent.clearCache = jest.fn().mockImplementation(() => {
        throw new Error('Cache error');
      });

      // Act
      researchController.clearCache(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal Server Error',
          message: 'Failed to clear research cache',
        })
      );
    });
  });
});
