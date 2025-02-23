import { User, Contact, NewsArticle } from '../src/models/models';
import { generateEmailDraft, EmailOptions } from '../src/agents/writer';

describe('Writer Agent', () => {
  const mockUser: User = {
    _id: 'user1',
    name: 'John Doe',
    title: 'Business Development Manager',
    company: 'Tech Corp',
  };

  const mockContact: Contact = {
    _id: 'contact1',
    name: 'Jane Smith',
    title: 'VP of Operations',
    company: 'Target Corp',
  };

  const mockNewsArticles: NewsArticle[] = [
    {
      id: 'article1',
      title: 'Target Corp Announces New Partnership',
      url: 'https://example.com/1',
      publishedAt: new Date().toISOString(),
      summary: 'Major partnership announcement',
      source: 'Business News',
      companyName: 'Target Corp',
      tags: ['partnerships_investments'],
    },
    {
      id: 'article2',
      title: 'Target Corp Launches Innovation Lab',
      url: 'https://example.com/2',
      publishedAt: new Date().toISOString(),
      summary: 'New innovation center launch',
      source: 'Tech News',
      companyName: 'Target Corp',
      tags: ['developments_innovations'],
    },
  ];

  const mockEmailOptions: EmailOptions = {
    goal: 'discussing potential partnership opportunities',
    style: 'professional',
    tone: 'friendly',
    includeSalutation: true,
    includeSignature: true,
  };

  describe('generateEmailDraft', () => {
    it('should generate an email draft with all required components', async () => {
      const draft = await generateEmailDraft(
        mockUser,
        mockContact,
        mockEmailOptions,
        mockNewsArticles
      );

      // Verify basic structure
      expect(draft.content).toBeDefined();
      expect(draft.subject).toBeDefined();
      expect(draft.metadata).toBeDefined();

      // Verify metadata
      expect(draft.metadata.tone).toBe(mockEmailOptions.tone);
      expect(draft.metadata.wordCount).toBeGreaterThan(0);
      expect(draft.metadata.targetGoals).toContain(mockEmailOptions.goal);
      expect(draft.metadata.includedArticles.length).toBeGreaterThan(0);
    });

    it('should include personalized details from user and contact', async () => {
      const draft = await generateEmailDraft(
        mockUser,
        mockContact,
        mockEmailOptions,
        mockNewsArticles
      );

      // Check for contact details
      expect(draft.content).toContain(mockContact.name);
      expect(draft.content).toContain(mockContact.title);
      expect(draft.content).toContain(mockContact.company);

      // Check for user signature details when included
      expect(draft.content).toContain(mockUser.name);
      expect(draft.content).toContain(mockUser.title);
      expect(draft.content).toContain(mockUser.company);
    });

    it('should integrate news articles into the content', async () => {
      const draft = await generateEmailDraft(
        mockUser,
        mockContact,
        mockEmailOptions,
        mockNewsArticles
      );

      // Verify news article integration
      expect(draft.content).toContain(mockNewsArticles[0].title);
      expect(draft.metadata.includedArticles).toContain(mockNewsArticles[0].id);
    });

    it('should respect maxLength constraint', async () => {
      const optionsWithMaxLength = {
        ...mockEmailOptions,
        maxLength: 20,
      };

      const draft = await generateEmailDraft(
        mockUser,
        mockContact,
        optionsWithMaxLength,
        mockNewsArticles
      );

      const wordCount = draft.content.split(/\s+/).length;
      expect(wordCount).toBeLessThanOrEqual(optionsWithMaxLength.maxLength);
    });

    it('should handle empty news articles array', async () => {
      const draft = await generateEmailDraft(
        mockUser,
        mockContact,
        mockEmailOptions,
        []
      );

      expect(draft.content).toBeDefined();
      expect(draft.metadata.includedArticles).toHaveLength(0);
    });

    it('should omit salutation and signature when specified', async () => {
      const optionsWithoutSalutationAndSignature = {
        ...mockEmailOptions,
        includeSalutation: false,
        includeSignature: false,
      };

      const draft = await generateEmailDraft(
        mockUser,
        mockContact,
        optionsWithoutSalutationAndSignature,
        mockNewsArticles
      );

      expect(draft.content).not.toContain(`Dear ${mockContact.name}`);
      expect(draft.content).not.toContain(`Best regards`);
    });
  });
});
