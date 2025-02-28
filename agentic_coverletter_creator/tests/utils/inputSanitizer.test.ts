import { InputSanitizer } from '../../src/utils/inputSanitizer';
// Explicitly import Jest functions to fix TypeScript errors
import { describe, expect, it, beforeEach } from '@jest/globals';

describe('InputSanitizer', () => {
  let sanitizer: InputSanitizer;

  beforeEach(() => {
    sanitizer = new InputSanitizer();
  });

  describe('sanitizeText', () => {
    it('should remove HTML tags from text', () => {
      const input =
        '<p>This is a <strong>test</strong> with <script>alert("xss")</script> tags</p>';
      const expected = 'This is a test with tags';
      expect(sanitizer.sanitizeText(input)).toBe(expected);
    });

    it('should remove excessive whitespace', () => {
      const input = '  This   has    too    much \n\n whitespace   ';
      const expected = 'This has too much whitespace';
      expect(sanitizer.sanitizeText(input)).toBe(expected);
    });

    it('should truncate text that exceeds the maximum length', () => {
      const longText = 'a'.repeat(1000);
      const maxLength = 500;
      const result = sanitizer.sanitizeText(longText, maxLength);
      expect(result.length).toBe(maxLength);
      expect(result).toBe('a'.repeat(maxLength));
    });

    it('should return empty string for null or undefined input', () => {
      expect(sanitizer.sanitizeText(null as unknown as string)).toBe('');
      expect(sanitizer.sanitizeText(undefined as unknown as string)).toBe('');
    });
  });

  describe('sanitizeCompanyName', () => {
    it('should remove special characters from company name', () => {
      const input = 'Acme, Inc. (Global) & Partners!';
      const expected = 'Acme Inc Global  Partners';
      expect(sanitizer.sanitizeCompanyName(input)).toBe(expected);
    });

    it('should truncate company names longer than 100 characters', () => {
      const longName = 'Very Long Company Name '.repeat(10);
      const result = sanitizer.sanitizeCompanyName(longName);
      expect(result.length).toBeLessThanOrEqual(100);
    });

    it('should return empty string for null or undefined input', () => {
      expect(sanitizer.sanitizeCompanyName(null as unknown as string)).toBe('');
      expect(
        sanitizer.sanitizeCompanyName(undefined as unknown as string)
      ).toBe('');
    });
  });

  describe('sanitizeJobTitle', () => {
    it('should sanitize job title', () => {
      const input = '<script>alert("xss")</script>Senior Developer';
      const expected = 'Senior Developer';
      expect(sanitizer.sanitizeJobTitle(input)).toBe(expected);
    });

    it('should truncate job titles longer than 200 characters', () => {
      const longTitle = 'Senior Software Engineer '.repeat(20);
      const result = sanitizer.sanitizeJobTitle(longTitle);
      expect(result.length).toBeLessThanOrEqual(200);
    });
  });

  describe('sanitizeJobDescription', () => {
    it('should sanitize job description', () => {
      const input = '<p>We are looking for a <strong>developer</strong></p>';
      const expected = 'We are looking for a developer';
      expect(sanitizer.sanitizeJobDescription(input)).toBe(expected);
    });

    it('should truncate job descriptions longer than 2000 characters', () => {
      const longDescription = 'Job Description Details '.repeat(200);
      const result = sanitizer.sanitizeJobDescription(longDescription);
      expect(result.length).toBeLessThanOrEqual(2000);
    });
  });

  describe('sanitizeTonePreference', () => {
    it('should return valid tone preferences unchanged', () => {
      expect(sanitizer.sanitizeTonePreference('formal')).toBe('formal');
      expect(sanitizer.sanitizeTonePreference('conversational')).toBe(
        'conversational'
      );
      expect(sanitizer.sanitizeTonePreference('enthusiastic')).toBe(
        'enthusiastic'
      );
      expect(sanitizer.sanitizeTonePreference('balanced')).toBe('balanced');
    });

    it('should normalize tone preference case', () => {
      expect(sanitizer.sanitizeTonePreference('FORMAL')).toBe('formal');
      expect(sanitizer.sanitizeTonePreference('Conversational')).toBe(
        'conversational'
      );
    });

    it('should return default tone for invalid preferences', () => {
      expect(sanitizer.sanitizeTonePreference('casual')).toBe('balanced');
      expect(sanitizer.sanitizeTonePreference('professional')).toBe('balanced');
      expect(sanitizer.sanitizeTonePreference('')).toBe('balanced');
      expect(sanitizer.sanitizeTonePreference(null as unknown as string)).toBe(
        'balanced'
      );
    });
  });
});
