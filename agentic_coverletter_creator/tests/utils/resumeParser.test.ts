import { ResumeParser, ResumeSchema } from '../../src/utils/resumeParser';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';

// Mock the dependencies
jest.mock('pdf-parse', () => {
  return jest.fn().mockImplementation(() => {
    return Promise.resolve({
      text: 'Mock PDF Content',
    });
  });
});

jest.mock('mammoth', () => {
  return {
    extractRawText: jest.fn().mockImplementation(() => {
      return Promise.resolve({
        value: 'Mock DOCX Content',
      });
    }),
  };
});

jest.mock('../../src/utils/logger', () => {
  return {
    default: {
      info: jest.fn(),
      error: jest.fn(),
    },
  };
});

describe('ResumeParser', () => {
  let parser: ResumeParser;

  beforeEach(() => {
    parser = new ResumeParser();
    jest.clearAllMocks();
  });

  describe('parseFromPDF', () => {
    it('should parse PDF content and return resume data', async () => {
      const buffer = Buffer.from('mock pdf content');
      const result = await parser.parseFromPDF(buffer);

      expect(result).toBeDefined();
      expect(result.personalInfo).toBeDefined();
      expect(result.experience).toBeDefined();
      expect(result.education).toBeDefined();
    });

    it('should handle errors when parsing PDF', async () => {
      // Override the mock to throw an error
      const pdfParse = require('pdf-parse');
      pdfParse.mockImplementationOnce(() => {
        throw new Error('PDF parsing error');
      });

      const buffer = Buffer.from('mock pdf content');
      await expect(parser.parseFromPDF(buffer)).rejects.toThrow(
        'Failed to parse PDF resume'
      );
    });
  });

  describe('parseFromDOCX', () => {
    it('should parse DOCX content and return resume data', async () => {
      const buffer = Buffer.from('mock docx content');
      const result = await parser.parseFromDOCX(buffer);

      expect(result).toBeDefined();
      expect(result.personalInfo).toBeDefined();
      expect(result.experience).toBeDefined();
      expect(result.education).toBeDefined();
    });

    it('should handle errors when parsing DOCX', async () => {
      // Override the mock to throw an error
      const mammoth = require('mammoth');
      mammoth.extractRawText.mockImplementationOnce(() => {
        throw new Error('DOCX parsing error');
      });

      const buffer = Buffer.from('mock docx content');
      await expect(parser.parseFromDOCX(buffer)).rejects.toThrow(
        'Failed to parse DOCX resume'
      );
    });
  });

  describe('parseFromJSON', () => {
    it('should parse valid JSON and return resume data', () => {
      const validJson = JSON.stringify({
        personalInfo: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        experience: [
          {
            title: 'Software Engineer',
            company: 'Tech Corp',
          },
        ],
        education: [
          {
            degree: 'Computer Science',
            institution: 'University',
          },
        ],
        skills: ['JavaScript', 'TypeScript'],
      });

      const result = parser.parseFromJSON(validJson);

      expect(result).toBeDefined();
      expect(result.personalInfo.name).toBe('John Doe');
      expect(result.experience[0].title).toBe('Software Engineer');
      expect(result.education[0].degree).toBe('Computer Science');
      expect(result.skills).toContain('JavaScript');
    });

    it('should throw an error for invalid JSON', () => {
      const invalidJson = '{ invalid json }';
      expect(() => parser.parseFromJSON(invalidJson)).toThrow(
        'Failed to parse JSON resume'
      );
    });

    it('should throw an error for JSON that does not match schema', () => {
      const invalidSchema = JSON.stringify({
        personalInfo: {
          // Missing required 'name' field
          email: 'john@example.com',
        },
        experience: [],
        education: [],
      });

      expect(() => parser.parseFromJSON(invalidSchema)).toThrow(
        'Failed to parse JSON resume'
      );
    });
  });

  describe('ResumeSchema', () => {
    it('should validate a valid resume object', () => {
      const validResume = {
        personalInfo: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        experience: [
          {
            title: 'Software Engineer',
            company: 'Tech Corp',
          },
        ],
        education: [
          {
            degree: 'Computer Science',
            institution: 'University',
          },
        ],
      };

      const result = ResumeSchema.parse(validResume);
      expect(result).toEqual(validResume);
    });

    it('should reject an invalid resume object', () => {
      const invalidResume = {
        personalInfo: {
          // Missing required 'name' field
          email: 'john@example.com',
        },
        experience: [
          {
            title: 'Software Engineer',
            company: 'Tech Corp',
          },
        ],
        education: [
          {
            degree: 'Computer Science',
            institution: 'University',
          },
        ],
      };

      expect(() => ResumeSchema.parse(invalidResume)).toThrow();
    });
  });
});
