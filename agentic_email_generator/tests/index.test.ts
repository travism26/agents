import { generateEmails, EmailOptions } from '../src';
import {
  User,
  Contact,
  Company,
  GeneratedEmailRecord,
} from '../src/models/models';
import { v4 as uuidv4 } from 'uuid';

// Helper function to validate email record structure
function validateEmailRecord(record: GeneratedEmailRecord): void {
  expect(record).toHaveProperty('_id');
  expect(record).toHaveProperty('userId');
  expect(record).toHaveProperty('contact');
  expect(record).toHaveProperty('createdAt');
  expect(record).toHaveProperty('status');
  expect(record).toHaveProperty('generatedEmails');
  expect(Array.isArray(record.generatedEmails)).toBe(true);

  if (record.status === 'approved') {
    expect(record.generatedEmails.length).toBeGreaterThan(0);
    record.generatedEmails.forEach((email) => {
      expect(email).toHaveProperty('_id');
      expect(email).toHaveProperty('angle');
      expect(email).toHaveProperty('newsArticles');
      expect(email).toHaveProperty('generatedEmailBody');
      expect(Array.isArray(email.newsArticles)).toBe(true);
    });
  }
}

describe('generateEmails', () => {
  const mockUser: User = {
    _id: uuidv4(),
    name: 'John Doe',
    title: 'Sales Manager',
    company: 'Example Corp',
  };

  const mockContact: Contact = {
    _id: uuidv4(),
    name: 'Jane Smith',
    title: 'CEO',
    company: 'Target Corp',
  };

  const mockCompany: Company = {
    _id: uuidv4(),
    name: 'Target Corp',
    details: {
      industry: 'Technology',
      size: 'Enterprise',
      region: 'North America',
    },
  };

  const mockOptions: EmailOptions = {
    goal: 'explore partnership opportunities',
    style: 'professional',
    tone: 'friendly',
    maxLength: 300,
    includeSalutation: true,
    includeSignature: true,
  };

  it('should generate a successful email with complete metadata when valid inputs are provided', async () => {
    const result = await generateEmails(
      mockUser,
      mockContact,
      mockCompany,
      mockOptions
    );

    validateEmailRecord(result.record);
    expect(result.record.status).toBe('approved');
    expect(result.record.generatedEmails).toHaveLength(1);

    const email = result.record.generatedEmails[0];
    expect(email.generatedEmailBody).toContain(mockContact.name);
    expect(email.generatedEmailBody.length).toBeLessThanOrEqual(
      mockOptions.maxLength || 300
    );
    expect(email.newsArticles.length).toBeGreaterThan(0);
  });

  it('should handle case when no news articles are found and include proper error metadata', async () => {
    // Mock the company to one that likely won't have news
    const noNewsCompany: Company = {
      ...mockCompany,
      name: 'Non Existent Corp',
    };

    const result = await generateEmails(
      mockUser,
      mockContact,
      noNewsCompany,
      mockOptions
    );

    validateEmailRecord(result.record);
    expect(result.record.status).toBe('failed');
    expect(result.record.failedReason).toBe('No relevant news articles found');
    expect(result.record.generatedEmails).toHaveLength(0);
    expect(result.record.createdAt).toBeDefined();
  });

  it('should handle invalid input errors gracefully with proper error metadata', async () => {
    // Force an error by passing invalid input
    const result = await generateEmails(
      { ...mockUser, _id: 'invalid-id' },
      mockContact,
      mockCompany,
      mockOptions
    );

    validateEmailRecord(result.record);
    expect(result.record.status).toBe('failed');
    expect(result.record.failedReason).toBeDefined();
    expect(result.record.generatedEmails).toHaveLength(0);
    expect(result.record.createdAt).toBeDefined();
  });

  it('should respect email options constraints', async () => {
    const customOptions: EmailOptions = {
      ...mockOptions,
      maxLength: 200,
      style: 'formal',
      tone: 'direct',
    };

    const result = await generateEmails(
      mockUser,
      mockContact,
      mockCompany,
      customOptions
    );

    validateEmailRecord(result.record);
    expect(result.record.status).toBe('approved');

    const email = result.record.generatedEmails[0];
    expect(email.generatedEmailBody.length).toBeLessThanOrEqual(200);
    // Formal tone typically includes proper salutation
    expect(email.generatedEmailBody).toMatch(/^(Dear|Hello|Hi) .+,/);
  });

  it('should handle multiple revision rounds if needed', async () => {
    // This test might take longer as it could go through multiple revision rounds
    jest.setTimeout(10000);

    const result = await generateEmails(mockUser, mockContact, mockCompany, {
      ...mockOptions,
      style: 'casual', // This might trigger revisions
    });

    validateEmailRecord(result.record);
    // Even with revisions, we should either get an approved email or a clear failure reason
    expect(['approved', 'failed']).toContain(result.record.status);

    if (result.record.status === 'failed') {
      expect(result.record.failedReason).toContain('revisions');
    }
  });
});
