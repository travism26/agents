import { Contact, Company, NewsArticle } from '../src/models/models';
import { ResearcherAgent, ArticleCategory } from '../src/agents/researcher';
import { ContextManager } from '../src/models/context';
import axios from 'axios';
import { ChatOpenAI } from '@langchain/openai';

// Mock axios and ChatOpenAI
jest.mock('axios');
jest.mock('@langchain/openai');
const mockedAxios = axios as jest.Mocked<typeof axios>;
const MockedChatOpenAI = ChatOpenAI as jest.MockedClass<typeof ChatOpenAI>;

describe('ResearcherAgent', () => {
  let researcher: ResearcherAgent;
  let contextManager: ContextManager;

  const mockContact: Contact = {
    _id: '1',
    name: 'John Doe',
    title: 'CEO',
    company: 'Test Corp',
  };

  const mockCompany: Company = {
    _id: '1',
    name: 'Test Corp',
    details: {
      industry: 'Technology',
    },
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create context manager with test data
    contextManager = new ContextManager(
      'test-session',
      mockContact,
      mockContact,
      mockCompany
    );

    // Mock ChatOpenAI invoke method
    MockedChatOpenAI.prototype.invoke = jest
      .fn()
      .mockImplementation(async (messages) => {
        const userMessage = messages[1].content as string;

        if (userMessage.includes('<SearchInstructions>')) {
          return {
            content:
              'Test Corp AND (partnerships OR innovations OR "leadership changes" OR achievements) AND industry:Technology',
          };
        }

        if (userMessage.includes('Analyze this business news article')) {
          if (userMessage.includes('Partnership')) {
            return {
              content:
                'partnerships_investments - This article discusses a strategic partnership.',
            };
          }
          if (userMessage.includes('Innovation')) {
            return {
              content:
                'developments_innovations - This article covers new product development.',
            };
          }
          return { content: 'other - General company news.' };
        }

        return { content: 'default response' };
      });

    // Create researcher agent with context manager
    researcher = new ResearcherAgent(contextManager);

    // Mock successful Perplexity API response
    mockedAxios.post.mockResolvedValue({
      data: {
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  title: 'Test Corp Announces New Partnership',
                  url: 'https://example.com/1',
                  publishedAt: new Date().toISOString(),
                  summary: 'Test Corp partners with Industry leader',
                  source: 'TechNews',
                },
                {
                  title: 'Test Corp Launches Innovation',
                  url: 'https://example.com/2',
                  publishedAt: new Date().toISOString(),
                  summary: 'Revolutionary new product development',
                  source: 'BusinessDaily',
                },
              ]),
            },
          },
        ],
      },
    });
  });

  describe('research', () => {
    it('should update agent context with company and contact information', async () => {
      const articles = await researcher.research(mockContact, mockCompany);

      // Verify articles were returned
      expect(articles).toBeDefined();
      expect(articles.length).toBeGreaterThan(0);

      // Context updates are private, but we can verify the effects through article processing
      const firstArticle = articles[0];
      expect(firstArticle.companyName).toBe(mockCompany.name);
    });

    it('should make correct API call to Perplexity', async () => {
      await researcher.research(mockContact, mockCompany);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.perplexity.ai/chat/completions',
        expect.objectContaining({
          model: 'sonar',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
            }),
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Test Corp'),
            }),
          ]),
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('API Error'));

      await expect(
        researcher.research(mockContact, mockCompany)
      ).rejects.toThrow('Failed to fetch news articles from Perplexity API');
    });

    it('should handle invalid API response format', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: 'invalid json',
              },
            },
          ],
        },
      });

      await expect(
        researcher.research(mockContact, mockCompany)
      ).rejects.toThrow();
    });

    it('should filter out articles older than 6 months', async () => {
      const articles = await researcher.research(mockContact, mockCompany);
      const now = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(now.getMonth() - 6);

      articles.forEach((article) => {
        const articleDate = new Date(article.publishedAt).getTime();
        expect(articleDate).toBeGreaterThanOrEqual(sixMonthsAgo.getTime());
      });
    });

    it('should categorize articles correctly', async () => {
      const articles = await researcher.research(mockContact, mockCompany);

      // Verify each article has exactly one category tag
      articles.forEach((article) => {
        expect(article.tags).toHaveLength(1);
        expect(Object.values(ArticleCategory)).toContain(article.tags[0]);
      });

      // Verify specific categorizations
      const partnershipArticle = articles.find((a) =>
        a.title.includes('Partnership')
      );
      const innovationArticle = articles.find((a) =>
        a.title.includes('Innovation')
      );

      expect(partnershipArticle?.tags[0]).toBe(
        ArticleCategory.PARTNERSHIPS_INVESTMENTS
      );
      expect(innovationArticle?.tags[0]).toBe(
        ArticleCategory.DEVELOPMENTS_INNOVATIONS
      );
    });

    it('should prioritize articles in the correct order', async () => {
      const articles = await researcher.research(mockContact, mockCompany);

      const categoryOrder = [
        ArticleCategory.PARTNERSHIPS_INVESTMENTS,
        ArticleCategory.DEVELOPMENTS_INNOVATIONS,
        ArticleCategory.LEADERSHIP_STRATEGY,
        ArticleCategory.ACHIEVEMENTS_MILESTONES,
        ArticleCategory.OTHER,
      ];

      // Check if articles are sorted by category priority
      for (let i = 1; i < articles.length; i++) {
        const prevCategoryIndex = categoryOrder.indexOf(
          articles[i - 1].tags[0] as ArticleCategory
        );
        const currentCategoryIndex = categoryOrder.indexOf(
          articles[i].tags[0] as ArticleCategory
        );
        expect(prevCategoryIndex).toBeLessThanOrEqual(currentCategoryIndex);
      }
    });

    it('should include required article fields', async () => {
      const articles = await researcher.research(mockContact, mockCompany);

      articles.forEach((article) => {
        expect(article).toHaveProperty('id');
        expect(article).toHaveProperty('title');
        expect(article).toHaveProperty('url');
        expect(article).toHaveProperty('publishedAt');
        expect(article).toHaveProperty('summary');
        expect(article).toHaveProperty('source');
        expect(article).toHaveProperty('companyName');
        expect(article).toHaveProperty('tags');
      });
    });

    it('should use autonomous decision making with structured search instructions', async () => {
      await researcher.research(mockContact, mockCompany);

      // Verify LLM was called with appropriate messages
      expect(MockedChatOpenAI.prototype.invoke).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('expert research strategist'),
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringMatching(
              /<SearchInstructions>[\s\S]*<\/SearchInstructions>/
            ),
          }),
        ])
      );

      // Verify search instructions contain required elements
      const userMessage = (MockedChatOpenAI.prototype.invoke as jest.Mock).mock
        .calls[0][0][1].content;
      expect(userMessage).toContain('<Company>Test Corp</Company>');
      expect(userMessage).toContain('<Person>John Doe</Person>');
      expect(userMessage).toContain('<Industry>');
      expect(userMessage).toContain('Technology');
      expect(userMessage).toContain('<BusinessActivities>');
    });

    it('should use autonomous analysis for article categorization', async () => {
      const articles = await researcher.research(mockContact, mockCompany);

      // Verify LLM was called for each article
      expect(MockedChatOpenAI.prototype.invoke).toHaveBeenCalledTimes(3); // Once for query + twice for articles

      // Verify categorization results
      const partnershipArticle = articles.find((a) =>
        a.title.includes('Partnership')
      );
      const innovationArticle = articles.find((a) =>
        a.title.includes('Innovation')
      );

      expect(partnershipArticle?.tags[0]).toBe(
        ArticleCategory.PARTNERSHIPS_INVESTMENTS
      );
      expect(innovationArticle?.tags[0]).toBe(
        ArticleCategory.DEVELOPMENTS_INNOVATIONS
      );
    });

    it('should maintain context across multiple research calls', async () => {
      // First research call
      await researcher.research(mockContact, mockCompany);

      // Mock different articles for second call
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify([
                  {
                    title: 'Test Corp Leadership Change',
                    url: 'https://example.com/3',
                    publishedAt: new Date().toISOString(),
                    summary: 'New CEO appointed',
                    source: 'BusinessNews',
                  },
                ]),
              },
            },
          ],
        },
      });

      // Second research call
      const articles = await researcher.research(mockContact, mockCompany);

      // Verify LLM calls include previous context
      const lastLLMCall = (
        MockedChatOpenAI.prototype.invoke as jest.Mock
      ).mock.calls.slice(-1)[0];

      const userMessage = lastLLMCall[0][1].content;
      expect(userMessage).toContain('Previous findings');
    });
  });
});
