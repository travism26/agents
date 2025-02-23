import { Contact, NewsArticle, Angle } from '../src/models/models';
import { ReviewerAgent, EmailContext } from '../src/agents/reviewer';
import { ChatOpenAI } from '@langchain/openai';

// Mock ChatOpenAI
jest.mock('@langchain/openai');
const MockedChatOpenAI = ChatOpenAI as jest.MockedClass<typeof ChatOpenAI>;

describe('Reviewer Agent', () => {
  let reviewer: ReviewerAgent;

  const mockContact: Contact = {
    _id: 'contact1',
    name: 'Jane Smith',
    title: 'VP of Operations',
    company: 'Target Corp',
  };

  const mockArticles: NewsArticle[] = [
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
  ];

  const mockAngle: Angle = {
    id: 'angle1',
    title: 'Partnership Opportunity Discussion',
    body: 'Discuss potential partnership based on recent announcement',
  };

  const mockContext: EmailContext = {
    contact: mockContact,
    articles: mockArticles,
    angle: mockAngle,
    revisionCount: 0,
  };

  const mockEmailDraft = `Dear Jane Smith,

I hope this email finds you well. I recently came across Target Corp's partnership announcement and wanted to reach out regarding potential collaboration opportunities.

Given your role as VP of Operations at Target Corp, I believe there could be significant value in exploring how our organizations might work together.

Would you be interested in scheduling a brief discussion to explore this further?

Best regards,
John Doe
Business Development Manager
Tech Corp`;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock ChatOpenAI invoke method
    MockedChatOpenAI.prototype.invoke = jest
      .fn()
      .mockImplementation(async (messages) => {
        const userMessage = messages[1].content as string;

        if (userMessage.includes('analyze this email draft')) {
          return {
            content: JSON.stringify({
              score: 85,
              approved: true,
              suggestions: ['Consider adding more specific value propositions'],
              analysis: {
                toneScore: 90,
                personalizationScore: 85,
                contentRelevance: 95,
                structureQuality: 80,
                improvementAreas: ['value_proposition_detail'],
              },
            }),
          };
        }

        if (userMessage.includes('Improve this email draft')) {
          return {
            content: mockEmailDraft.replace(
              'potential collaboration opportunities',
              'specific collaboration opportunities in supply chain optimization'
            ),
          };
        }

        return { content: 'default response' };
      });

    reviewer = new ReviewerAgent();
  });

  describe('review', () => {
    it('should perform autonomous analysis of email drafts', async () => {
      const result = await reviewer.review(mockEmailDraft, mockContext);

      expect(result.approved).toBe(true);
      expect(result.score).toBeGreaterThan(80);
      expect(result.analysis).toBeDefined();
      expect(result.analysis?.toneScore).toBeDefined();
      expect(result.analysis?.personalizationScore).toBeDefined();
      expect(result.analysis?.contentRelevance).toBeDefined();
      expect(result.analysis?.structureQuality).toBeDefined();
      expect(result.analysis?.improvementAreas).toBeDefined();
    });

    it('should maintain context across multiple reviews', async () => {
      // First review
      await reviewer.review(mockEmailDraft, mockContext);

      // Second review with slightly modified context
      const secondContext = {
        ...mockContext,
        revisionCount: 1,
      };

      const result = await reviewer.review(mockEmailDraft, secondContext);

      // Verify LLM was called with previous context
      const lastLLMCall = (
        MockedChatOpenAI.prototype.invoke as jest.Mock
      ).mock.calls.slice(-2)[0];

      const userMessage = lastLLMCall[0][1].content;
      expect(userMessage).toContain('Previous Reviews');
    });

    it('should generate improved content for low-scoring drafts', async () => {
      // Mock a low score response
      MockedChatOpenAI.prototype.invoke = jest
        .fn()
        .mockImplementationOnce(async () => ({
          content: JSON.stringify({
            score: 70,
            approved: false,
            suggestions: ['Add more specific value propositions'],
            analysis: {
              toneScore: 60,
              personalizationScore: 85,
              contentRelevance: 75,
              structureQuality: 80,
              improvementAreas: ['value_proposition_detail', 'tone_alignment'],
            },
          }),
        }))
        .mockImplementationOnce(async () => ({
          content: 'Improved email content here...',
        }));

      const result = await reviewer.review(mockEmailDraft, mockContext);

      expect(result.approved).toBe(false);
      expect(result.score).toBeLessThan(80);
      expect(result.improvedContent).toBeDefined();
    });

    it('should respect revision limits', async () => {
      const contextWithMaxRevisions = {
        ...mockContext,
        revisionCount: 3,
      };

      const result = await reviewer.review(
        mockEmailDraft,
        contextWithMaxRevisions
      );

      expect(result.approved).toBe(false);
      expect(result.score).toBe(0);
      expect(result.suggestions).toContain(
        'Maximum revision limit reached. Manual review required.'
      );
    });

    it('should track common issues across reviews', async () => {
      // First review with an issue
      MockedChatOpenAI.prototype.invoke = jest
        .fn()
        .mockImplementationOnce(async () => ({
          content: JSON.stringify({
            score: 75,
            approved: false,
            suggestions: ['Improve tone'],
            analysis: {
              toneScore: 60,
              personalizationScore: 85,
              contentRelevance: 80,
              structureQuality: 80,
              improvementAreas: ['tone_improvement'],
            },
          }),
        }));

      await reviewer.review(mockEmailDraft, mockContext);

      // Second review with the same issue
      const result = await reviewer.review(mockEmailDraft, {
        ...mockContext,
        revisionCount: 1,
      });

      // Verify the issue was tracked
      const lastLLMCall = (
        MockedChatOpenAI.prototype.invoke as jest.Mock
      ).mock.calls.slice(-1)[0];

      const userMessage = lastLLMCall[0][1].content;
      expect(userMessage).toContain('tone_improvement');
    });

    it('should identify and track success patterns', async () => {
      // Mock a highly successful review
      MockedChatOpenAI.prototype.invoke = jest
        .fn()
        .mockImplementationOnce(async () => ({
          content: JSON.stringify({
            score: 95,
            approved: true,
            suggestions: [],
            analysis: {
              toneScore: 95,
              personalizationScore: 90,
              contentRelevance: 95,
              structureQuality: 95,
              improvementAreas: [],
            },
          }),
        }));

      const result = await reviewer.review(mockEmailDraft, mockContext);

      expect(result.approved).toBe(true);
      expect(result.score).toBeGreaterThan(90);
      expect(result.analysis?.toneScore).toBeGreaterThanOrEqual(90);
      expect(result.analysis?.contentRelevance).toBeGreaterThanOrEqual(90);
    });
  });
});
