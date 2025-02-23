import {
  User,
  Contact,
  Company,
  NewsArticle,
  Angle,
} from '../src/models/models';
import {
  ReviewerAgent,
  EmailContext,
  ReviewResult,
} from '../src/agents/reviewer';
import { ContextManager } from '../src/models/context';
import { ChatOpenAI } from '@langchain/openai';

// Test helper class to access protected members
class TestableReviewerAgent extends ReviewerAgent {
  getContext() {
    return this.getSharedContext();
  }

  setPhase(phase: 'review' | 'revision') {
    this.updatePhase(phase);
  }
}

// Mock ChatOpenAI
jest.mock('@langchain/openai');
const MockedChatOpenAI = ChatOpenAI as jest.MockedClass<typeof ChatOpenAI>;

describe('Reviewer Agent', () => {
  let reviewer: TestableReviewerAgent;
  let contextManager: ContextManager;

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

  const mockCompany: Company = {
    _id: 'company1',
    name: 'Target Corp',
    details: {
      industry: 'Retail',
      description: 'Major retail corporation',
    },
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

    // Create context manager with test data
    contextManager = new ContextManager(
      'test-session',
      mockUser,
      mockContact,
      mockCompany
    );

    // Create reviewer agent with context manager
    reviewer = new TestableReviewerAgent(contextManager);
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
              styleMatch: 'professional',
              toneMatch: 'direct',
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

  describe('Review Phases', () => {
    it('should track review phases', async () => {
      const phases: string[] = [];

      // Mock to capture phase transitions
      MockedChatOpenAI.prototype.invoke = jest
        .fn()
        .mockImplementation(async () => {
          phases.push(reviewer.getContext().state.phase);
          return {
            content: JSON.stringify({
              score: 85,
              approved: true,
              analysis: {
                toneScore: 85,
                contentRelevance: 85,
                improvementAreas: [],
              },
            }),
          };
        });

      await reviewer.review(mockEmailDraft, mockContext);

      expect(phases).toContain('initial_analysis');
      expect(phases).toContain('detailed_review');
      expect(phases).toContain('final_validation');
    });

    it('should perform improvement generation for low scores', async () => {
      const phases: string[] = [];

      // Mock low score and improvements
      MockedChatOpenAI.prototype.invoke = jest
        .fn()
        .mockImplementationOnce(async () => ({
          content: JSON.stringify({
            score: 70,
            approved: false,
            analysis: {
              toneScore: 70,
              contentRelevance: 70,
              improvementAreas: ['tone'],
            },
          }),
        }))
        .mockImplementationOnce(async () => ({
          content: JSON.stringify({
            score: 70,
            approved: false,
            analysis: {
              toneScore: 70,
              contentRelevance: 70,
              improvementAreas: ['tone'],
              improvements: [
                {
                  suggestion: 'Improve tone',
                  impact: 80,
                  reasoning: 'Current tone is too formal',
                },
              ],
            },
          }),
        }))
        .mockImplementationOnce(async () => ({
          content: JSON.stringify({
            improvedContent: 'Improved content',
            improvements: [
              {
                suggestion: 'Improve tone',
                impact: 80,
                reasoning: 'Made tone more conversational',
              },
            ],
          }),
        }));

      reviewer.setPhase('review');
      const result = await reviewer.review(mockEmailDraft, mockContext);

      expect(result.analysis?.improvements).toBeDefined();
      expect(result.improvedContent).toBeDefined();
    });
  });

  describe('Memory and Learning', () => {
    it('should maintain contact-specific insights', async () => {
      // First review - successful
      MockedChatOpenAI.prototype.invoke = jest
        .fn()
        .mockImplementationOnce(async () => ({
          content: JSON.stringify({
            score: 95,
            approved: true,
            analysis: {
              toneScore: 95,
              personalizationScore: 90,
              contentRelevance: 95,
              structureQuality: 95,
              improvementAreas: [],
              styleMatch: 'professional',
              toneMatch: 'direct',
            },
          }),
        }));

      await reviewer.review(mockEmailDraft, mockContext);

      const context = reviewer.getContext();
      expect(context.memory.draftHistory).toHaveLength(1);
      expect(context.memory.draftHistory[0].feedback?.score).toBe(95);
    });

    it('should track quality patterns over time', async () => {
      // Multiple reviews to establish patterns
      for (let i = 0; i < 3; i++) {
        await reviewer.review(mockEmailDraft, {
          ...mockContext,
          revisionCount: i,
        });
      }

      const context = reviewer.getContext();
      expect(context.memory.draftHistory).toHaveLength(3);
      expect(context.memory.draftHistory[0].feedback).toBeDefined();
    });

    it('should adapt review criteria based on learning', async () => {
      // First review with specific style
      MockedChatOpenAI.prototype.invoke = jest
        .fn()
        .mockImplementationOnce(async () => ({
          content: JSON.stringify({
            score: 95,
            approved: true,
            analysis: {
              toneScore: 95,
              personalizationScore: 90,
              styleMatch: 'professional',
              toneMatch: 'direct',
            },
          }),
        }));

      await reviewer.review(mockEmailDraft, mockContext);

      // Second review should consider learned preferences
      const result = await reviewer.review(mockEmailDraft, mockContext);

      const context = reviewer.getContext();
      expect(context.state.progress).toBeGreaterThan(0.8);
    });
  });

  describe('State Management', () => {
    it('should maintain review state throughout process', async () => {
      const states: any[] = [];

      MockedChatOpenAI.prototype.invoke = jest
        .fn()
        .mockImplementation(async () => {
          const context = reviewer.getContext();
          states.push({
            phase: context.state.phase,
            progress: context.state.progress,
          });
          return {
            content: JSON.stringify({
              score: 85,
              approved: true,
              analysis: {
                toneScore: 85,
                contentRelevance: 85,
                improvementAreas: [],
              },
            }),
          };
        });

      await reviewer.review(mockEmailDraft, mockContext);

      expect(states[0].phase).toBe('review');
      expect(states[states.length - 1].phase).toBe('review');
      expect(states[states.length - 1].progress).toBeDefined();
    });

    it('should track active constraints during review', async () => {
      const result = await reviewer.review(mockEmailDraft, mockContext, {
        minLength: 200,
        maxLength: 400,
      });

      const context = reviewer.getContext();
      expect(context.state.phase).toBe('review');
    });
  });
});
