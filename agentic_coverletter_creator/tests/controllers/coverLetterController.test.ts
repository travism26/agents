import { CoverLetterController } from '../../src/controllers/coverLetterController';
import { ResumeParser } from '../../src/utils/resumeParser';
import { InputSanitizer } from '../../src/utils/inputSanitizer';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';

// Mock the dependencies
jest.mock('../../src/utils/resumeParser');
jest.mock('../../src/utils/inputSanitizer');
jest.mock('../../src/utils/logger', () => {
  return {
    default: {
      info: jest.fn(),
      error: jest.fn(),
    },
  };
});

describe('CoverLetterController', () => {
  let controller: CoverLetterController;
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock the ResumeParser methods
    const mockResumeParser = ResumeParser as jest.MockedClass<
      typeof ResumeParser
    >;
    mockResumeParser.prototype.parseFromPDF.mockResolvedValue({
      personalInfo: { name: 'John Doe', email: 'john@example.com' },
      experience: [{ title: 'Developer', company: 'Tech Co' }],
      education: [{ degree: 'CS', institution: 'University' }],
    });
    mockResumeParser.prototype.parseFromDOCX.mockResolvedValue({
      personalInfo: { name: 'John Doe', email: 'john@example.com' },
      experience: [{ title: 'Developer', company: 'Tech Co' }],
      education: [{ degree: 'CS', institution: 'University' }],
    });
    mockResumeParser.prototype.parseFromJSON.mockReturnValue({
      personalInfo: { name: 'John Doe', email: 'john@example.com' },
      experience: [{ title: 'Developer', company: 'Tech Co' }],
      education: [{ degree: 'CS', institution: 'University' }],
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
    it('should return 400 if company name is missing', async () => {
      mockRequest.body.companyName = '';

      await controller.generateCoverLetter(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Bad Request',
        })
      );
    });

    it('should return 400 if job title is missing', async () => {
      mockRequest.body.jobTitle = '';

      await controller.generateCoverLetter(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Bad Request',
        })
      );
    });

    it('should return 400 if resume is missing', async () => {
      await controller.generateCoverLetter(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Bad Request',
          message: 'Resume is required',
        })
      );
    });

    it('should process PDF resume file correctly', async () => {
      mockRequest.file = {
        buffer: Buffer.from('mock pdf content'),
        mimetype: 'application/pdf',
      };

      await controller.generateCoverLetter(mockRequest, mockResponse);

      expect(ResumeParser.prototype.parseFromPDF).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should process DOCX resume file correctly', async () => {
      mockRequest.file = {
        buffer: Buffer.from('mock docx content'),
        mimetype:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };

      await controller.generateCoverLetter(mockRequest, mockResponse);

      expect(ResumeParser.prototype.parseFromDOCX).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should process JSON resume file correctly', async () => {
      mockRequest.file = {
        buffer: Buffer.from('{"personalInfo":{"name":"John"}}'),
        mimetype: 'application/json',
      };

      await controller.generateCoverLetter(mockRequest, mockResponse);

      expect(ResumeParser.prototype.parseFromJSON).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should process JSON resume from request body correctly', async () => {
      mockRequest.body.resume = {
        personalInfo: { name: 'John Doe' },
        experience: [],
        education: [],
      };

      await controller.generateCoverLetter(mockRequest, mockResponse);

      expect(ResumeParser.prototype.parseFromJSON).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for unsupported file format', async () => {
      mockRequest.file = {
        buffer: Buffer.from('mock content'),
        mimetype: 'text/plain',
      };

      await controller.generateCoverLetter(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Bad Request',
          message: 'Unsupported file format',
        })
      );
    });

    it('should handle errors during resume parsing from body', async () => {
      mockRequest.body.resume = 'invalid json';

      const mockParseFromJSON = ResumeParser.prototype
        .parseFromJSON as jest.Mock;
      mockParseFromJSON.mockImplementationOnce(() => {
        throw new Error('Invalid JSON');
      });

      await controller.generateCoverLetter(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Bad Request',
          message: 'Invalid resume format',
        })
      );
    });

    it('should handle unexpected errors', async () => {
      mockRequest.body.resume = { personalInfo: { name: 'John' } };

      const mockError = new Error('Unexpected error');
      const mockParseFromJSON = ResumeParser.prototype
        .parseFromJSON as jest.Mock;
      mockParseFromJSON.mockImplementationOnce(() => {
        throw mockError;
      });

      await controller.generateCoverLetter(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal Server Error',
        })
      );
    });
  });
});
