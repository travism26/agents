/**
 * InputSanitizer
 *
 * Utility class for sanitizing user inputs to ensure they are safe and properly formatted
 * before being processed by the system.
 */
export class InputSanitizer {
  /**
   * Sanitizes a text input by removing HTML tags, excessive whitespace,
   * and truncating if it exceeds the maximum length.
   *
   * @param input - The text input to sanitize
   * @param maxLength - Maximum allowed length (default: 5000)
   * @returns Sanitized text
   */
  sanitizeText(input: string, maxLength: number = 5000): string {
    if (!input) {
      return '';
    }

    // Remove HTML tags
    let sanitized = input.replace(/<[^>]*>?/gm, '');

    // Remove excessive whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Truncate if too long
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  /**
   * Sanitizes a company name by removing special characters that might
   * interfere with API calls or database operations.
   *
   * @param name - The company name to sanitize
   * @returns Sanitized company name
   */
  sanitizeCompanyName(name: string): string {
    if (!name) {
      return '';
    }

    // Remove special characters that might interfere with API calls
    return this.sanitizeText(name, 100)
      .replace(/[^\w\s]/gi, '')
      .trim();
  }

  /**
   * Sanitizes a job title by removing potentially harmful characters
   * and truncating if necessary.
   *
   * @param title - The job title to sanitize
   * @returns Sanitized job title
   */
  sanitizeJobTitle(title: string): string {
    return this.sanitizeText(title, 200);
  }

  /**
   * Sanitizes a job description by removing potentially harmful content
   * and truncating to a reasonable length.
   *
   * @param description - The job description to sanitize
   * @returns Sanitized job description
   */
  sanitizeJobDescription(description: string): string {
    return this.sanitizeText(description, 2000);
  }

  /**
   * Sanitizes tone preference by ensuring it's one of the allowed values.
   *
   * @param tone - The tone preference to sanitize
   * @returns Sanitized tone preference or default if invalid
   */
  sanitizeTonePreference(
    tone: string
  ): 'formal' | 'conversational' | 'enthusiastic' | 'balanced' {
    const allowedTones = [
      'formal',
      'conversational',
      'enthusiastic',
      'balanced',
    ];

    if (!tone || !allowedTones.includes(tone.toLowerCase())) {
      return 'balanced'; // Default tone
    }

    return tone.toLowerCase() as
      | 'formal'
      | 'conversational'
      | 'enthusiastic'
      | 'balanced';
  }
}
