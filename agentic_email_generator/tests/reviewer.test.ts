import {
  ReviewerAgent,
  EmailContext,
  QualityCriteria,
} from '../src/agents/reviewer';

describe('ReviewerAgent', () => {
  let reviewer: ReviewerAgent;
  let mockContext: EmailContext;

  beforeEach(() => {
    reviewer = new ReviewerAgent();
    mockContext = {
      contact: {
        _id: '123',
        name: 'John Smith',
        title: 'CEO',
        company: 'Tech Corp',
      },
      articles: [
        {
          id: '1',
          title: 'Tech Innovation Breakthrough',
          url: 'https://example.com',
          publishedAt: '2025-02-23',
          summary: 'A breakthrough in tech',
          source: 'TechNews',
          companyName: 'Tech Corp',
          tags: ['technology', 'innovation'],
        },
      ],
      angle: {
        id: '1',
        title: 'Innovation Leadership',
        body: 'Focus on leadership in innovation',
      },
      revisionCount: 0,
    };
  });

  describe('review', () => {
    it('should approve a well-formatted email', async () => {
      const goodDraft = `
        Hello John Smith,

        I hope this email finds you well. I recently read about the Tech Innovation Breakthrough 
        and thought you might be interested in exploring this opportunity. Our solution would 
        provide significant value to Tech Corp.

        Would you be available for a brief call to discuss how we could help?

        Looking forward to your response.
        Best regards
      `;

      const result = await reviewer.review(goodDraft, mockContext);
      expect(result.approved).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.suggestions).toEqual([
        'Email draft meets all quality criteria.',
      ]);
    });

    it('should reject an email that is too short', async () => {
      const shortDraft = 'Hi John, Want to meet?';

      const result = await reviewer.review(shortDraft, mockContext);
      expect(result.approved).toBe(false);
      expect(result.score).toBeLessThan(80);
      expect(result.suggestions).toContain(expect.stringMatching(/too short/));
    });

    it('should reject an email missing required elements', async () => {
      const draftWithoutCTA = `
        Hello John Smith,

        I recently read about the Tech Innovation Breakthrough and thought 
        you might find it interesting. It provides great value.
      `;

      const result = await reviewer.review(draftWithoutCTA, mockContext);
      expect(result.approved).toBe(false);
      expect(result.suggestions).toContain(
        expect.stringMatching(/call to action/)
      );
    });

    it('should reject an email with forbidden elements', async () => {
      const spammyDraft = `
        Hello John Smith,

        SPAM SPAM SPAM! This is an aggressive sales pitch that you can't refuse!
        The Tech Innovation Breakthrough is amazing!

        Let's discuss soon.
      `;

      const result = await reviewer.review(spammyDraft, mockContext);
      expect(result.approved).toBe(false);
      expect(result.suggestions).toContain(
        expect.stringMatching(/forbidden element/)
      );
    });

    it('should enforce revision limit', async () => {
      const draft =
        "Hello John Smith, Let's meet to discuss the Tech Innovation Breakthrough.";
      mockContext.revisionCount = 3;

      const result = await reviewer.review(draft, mockContext);
      expect(result.approved).toBe(false);
      expect(result.suggestions).toContain(
        'Maximum revision limit reached. Manual review required.'
      );
    });

    it('should check for article references', async () => {
      const draftWithoutArticle = `
        Hello John Smith,

        I hope this email finds you well. I have an interesting opportunity
        that could provide value to your company.

        Would you be available for a call?
      `;

      const result = await reviewer.review(draftWithoutArticle, mockContext);
      expect(result.approved).toBe(false);
      expect(result.suggestions).toContain(
        expect.stringMatching(/reference.*news article/)
      );
    });

    it('should allow custom criteria', async () => {
      const customCriteria: Partial<QualityCriteria> = {
        minLength: 50,
        maxLength: 200,
        requiredElements: ['greeting', 'call to action'],
      };

      const shortButValidDraft = `
        Hello John Smith,

        The Tech Innovation Breakthrough looks promising.
        
        Can we discuss this next week?
      `;

      const result = await reviewer.review(
        shortButValidDraft,
        mockContext,
        customCriteria
      );
      expect(result.approved).toBe(true);
    });
  });
});
