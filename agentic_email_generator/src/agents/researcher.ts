/**
 * Researcher Agent
 * Responsible for gathering and analyzing news articles about companies
 * to inform personalized email generation.
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { Contact, Company, NewsArticle } from '../models/models';
import { ChatOpenAI } from '@langchain/openai';
import { BaseAgent } from './base';
import { ContextManager, SharedContext } from '../models/context';

// Load environment variables
dotenv.config();

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
if (!PERPLEXITY_API_KEY) {
  throw new Error('PERPLEXITY_API_KEY is required in environment variables');
}

// Initialize the OpenAI chat model
const llm = new ChatOpenAI({
  modelName: process.env.MODEL_NAME || 'gpt-4-turbo',
  temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
  maxTokens: parseInt(process.env.MAX_TOKENS || '4000'),
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// Categories for article prioritization
export enum ArticleCategory {
  PARTNERSHIPS_INVESTMENTS = 'partnerships_investments',
  DEVELOPMENTS_INNOVATIONS = 'developments_innovations',
  LEADERSHIP_STRATEGY = 'leadership_strategy',
  ACHIEVEMENTS_MILESTONES = 'achievements_milestones',
  OTHER = 'other',
}

/**
 * Simulated Perplexity API response
 */
interface PerplexityResponse {
  articles: {
    id: string;
    title: string;
    url: string;
    publishedAt: string;
    summary: string;
    source: string;
  }[];
}

/**
 * Makes a call to the Perplexity API to search for news articles
 */
async function searchPerplexityNews(
  query: string
): Promise<PerplexityResponse> {
  console.log(`[Perplexity API] Searching for: ${query}`);

  // Define payload outside try block so it's accessible in retry logic
  const payload = {
    model: 'sonar',
    messages: [
      {
        role: 'system',
        content:
          'You are a news research assistant. Return only factual, recent news articles about companies. Format your response as a JSON array of articles with title, url, publishedAt, summary, and source properties.',
      },
      {
        role: 'user',
        content: `Find recent news articles about: ${query}`,
      },
    ],
    max_tokens: 4000,
    temperature: 0.2,
    top_p: 0.9,
  };

  try {
    console.log(
      '[Perplexity API] Request payload:',
      JSON.stringify(payload, null, 2)
    );

    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      payload,
      {
        headers: {
          Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(
      '[Perplexity API] Raw response:',
      JSON.stringify(response.data, null, 2)
    );

    // Get the raw response content
    const rawContent = response.data.choices[0].message.content;

    // Extract and parse JSON more robustly
    let articles;
    try {
      // First try to parse the entire response as JSON
      articles = JSON.parse(rawContent);
    } catch {
      // If that fails, try to extract JSON array from markdown code block
      const codeBlockMatch = rawContent.match(/```json\s*(\[[\s\S]*?\])\s*```/);
      if (codeBlockMatch) {
        try {
          articles = JSON.parse(codeBlockMatch[1]);
        } catch (parseError) {
          console.error(
            '[Perplexity API] Failed to parse JSON from code block',
            parseError
          );
          throw new Error('Invalid JSON format in code block');
        }
      } else {
        // If no code block, try to extract any JSON array
        const jsonMatch = rawContent.match(/\[[\s\S]*?\]/);
        if (!jsonMatch) {
          console.error(
            '[Perplexity API] Failed to extract JSON from response'
          );
          throw new Error('No JSON array found in response');
        }
        try {
          articles = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error(
            '[Perplexity API] Failed to parse extracted JSON',
            parseError
          );
          throw new Error('Invalid JSON format in response');
        }
      }
    }

    // Validate the response
    if (!Array.isArray(articles)) {
      throw new Error('Invalid API response format');
    }

    return {
      articles: articles.map((article: any, index: number) => ({
        id: article.id || String(index + 1),
        title: article.title,
        url: article.url,
        publishedAt: article.publishedAt || new Date().toISOString(),
        summary: article.summary,
        source: article.source,
      })),
    };
  } catch (error) {
    console.error('[Perplexity API] Error:', error);

    // Implement retries
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        console.log(
          `[Perplexity API] Retry attempt ${retryCount + 1} of ${maxRetries}`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (retryCount + 1))
        ); // Exponential backoff

        const retryResponse = await axios.post(
          'https://api.perplexity.ai/chat/completions',
          payload,
          {
            headers: {
              Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const retryContent = retryResponse.data.choices[0].message.content;
        let retryArticles;
        try {
          // First try to parse the entire response as JSON
          retryArticles = JSON.parse(retryContent);
        } catch {
          // If that fails, try to extract JSON array from markdown code block
          const codeBlockMatch = retryContent.match(
            /```json\s*(\[[\s\S]*?\])\s*```/
          );
          if (codeBlockMatch) {
            try {
              retryArticles = JSON.parse(codeBlockMatch[1]);
            } catch (parseError) {
              console.error(
                '[Perplexity API] Failed to parse JSON from code block',
                parseError
              );
              throw new Error('Invalid JSON format in code block');
            }
          } else {
            // If no code block, try to extract any JSON array
            const jsonMatch = retryContent.match(/\[[\s\S]*?\]/);
            if (!jsonMatch) {
              console.error(
                '[Perplexity API] Failed to extract JSON from response'
              );
              throw new Error('No JSON array found in response');
            }
            try {
              retryArticles = JSON.parse(jsonMatch[0]);
            } catch (parseError) {
              console.error(
                '[Perplexity API] Failed to parse extracted JSON',
                parseError
              );
              throw new Error('Invalid JSON format in response');
            }
          }
        }

        // Validate the response
        if (!Array.isArray(retryArticles)) {
          throw new Error('Invalid API response format');
        }

        return {
          articles: retryArticles.map((article: any, index: number) => ({
            id: article.id || String(index + 1),
            title: article.title,
            url: article.url,
            publishedAt: article.publishedAt || new Date().toISOString(),
            summary: article.summary,
            source: article.source,
          })),
        };
      } catch (retryError) {
        console.error(
          `[Perplexity API] Retry ${retryCount + 1} failed:`,
          retryError
        );
        retryCount++;

        if (retryCount === maxRetries) {
          throw new Error(
            `Failed to fetch news articles after ${maxRetries} attempts`
          );
        }
      }
    }

    throw new Error('Failed to fetch news articles from Perplexity API');
  }
}

/**
 * ResearcherAgent class responsible for gathering news articles
 */
export class ResearcherAgent extends BaseAgent {
  private searchContext: {
    searchStrategy?: string;
    lastQueryTime?: Date;
    articleHistory?: NewsArticle[];
  };

  constructor(contextManager: ContextManager) {
    super(contextManager, 'researcher');
    this.searchContext = {};
  }

  /**
   * Gets valid phases for this agent
   */
  protected getValidPhases(): SharedContext['state']['phase'][] {
    return ['research'];
  }

  /**
   * Implements fallback strategy for research failures
   */
  protected async getFallbackStrategy(): Promise<NewsArticle[]> {
    const context = this.getSharedContext();
    const company = context.company;

    // Try a more general search query
    const generalQuery = `${company.name} company news`;
    const response = await searchPerplexityNews(generalQuery);

    // Process and filter articles
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const articles: NewsArticle[] = response.articles
      .filter((article) => new Date(article.publishedAt) >= sixMonthsAgo)
      .map((article) => ({
        id: article.id,
        title: article.title,
        url: article.url,
        publishedAt: article.publishedAt,
        summary: article.summary,
        source: article.source,
        companyName: company.name,
        tags: [ArticleCategory.OTHER],
      }));

    return this.prioritizeArticles(articles);
  }

  /**
   * Builds an optimized search query using autonomous decision making
   */
  private async buildSearchQuery(
    contact: Contact,
    company: Company
  ): Promise<string> {
    this.log('DEBUG', 'Building search query', {
      company: company.name,
      contact: contact.name,
      industry: company.details.industry,
    });

    const searchInstructions = `
<SearchInstructions>
    <Purpose>Find news articles about the Company OR the Person</Purpose>
    <SearchTopics>
      <TimeRange>Search for articles from the past 3 months, Current date is ${new Date().toISOString()}</TimeRange>
      <Company>${company.name}</Company>
      <Person>${contact.name}</Person>
      <Industry>The industry or market sector that ${
        company.name
      } operates in: ${company.details.industry || 'Not specified'}</Industry>
      <BusinessActivities>
        <Item>Major partnerships and investments</Item>
        <Item>Company developments and innovations</Item>
        <Item>Leadership changes and strategic initiatives</Item>
        <Item>Notable achievements and milestones</Item>
      </BusinessActivities>
    </SearchTopics>
    <Parameters>
      <TimeRange>Search for articles from the past 2 years</TimeRange>
      <Coverage>Include both major news stories and industry-specific coverage</Coverage>
    </Parameters>
</SearchInstructions>`;

    const response = await llm.invoke([
      {
        role: 'system',
        content:
          'You are an expert research strategist. Analyze the provided XML search instructions and generate a focused search query that will yield relevant news articles. Return ONLY the optimized search query text, no explanations.',
      },
      { role: 'user', content: searchInstructions },
    ]);

    const query = response.content.toString().trim();

    this.log('INFO', 'Generated search query', { query });

    // Record decision in shared context
    this.recordDecision(
      'search_query_generation',
      'Generated optimized search query based on structured search instructions',
      0.9,
      { query, searchInstructions }
    );

    return query;
  }

  /**
   * Categorizes an article using autonomous analysis
   */
  private async categorizeArticle(
    article: NewsArticle
  ): Promise<ArticleCategory> {
    this.log('DEBUG', 'Categorizing article', {
      articleTitle: article.title,
      articleId: article.id,
    });
    const context = this.getSharedContext();

    const improvedPrompt = `
    <Purpose>
    Categorize this article into a single predefined category.
    </Purpose>

    <Article>
      <Title>${article.title}</Title>
      <Summary>${article.summary}</Summary>
      <Company>${context.company.name}</Company>
      <Industry>${context.company.details.industry}</Industry>
    </Article>

    <Categories>
      <Category>partnerships_investments</Category>
      <Category>developments_innovations</Category>
      <Category>leadership_strategy</Category>
      <Category>achievements_milestones</Category>
      <Category>other</Category>
    </Categories>

    <ResponseFormat>
    Return ONLY the category name from the list above.
    No explanations or additional text.
    Response must be lowercase and match exactly one of the category names.

    Example valid responses:
    "partnerships_investments"
    "developments_innovations"
    "leadership_strategy"
    "achievements_milestones"
    "other"

    Invalid response examples:
    "PARTNERSHIPS_INVESTMENTS" (wrong case)
    "partnerships" (incomplete)
    "This article is about partnerships_investments" (extra text)
    "partnerships_investments, developments_innovations" (multiple categories)
    </ResponseFormat>`;

    const response = await llm.invoke([
      { role: 'system', content: 'You are an expert news analyst.' },
      { role: 'user', content: improvedPrompt },
    ]);

    // Extract category from response
    const content = response.content.toString().toLowerCase();
    let category: ArticleCategory;

    this.log('DEBUG', 'LLM categorization response', { content });

    if (content.includes('partnerships_investments')) {
      category = ArticleCategory.PARTNERSHIPS_INVESTMENTS;
    } else if (content.includes('developments_innovations')) {
      category = ArticleCategory.DEVELOPMENTS_INNOVATIONS;
    } else if (content.includes('leadership_strategy')) {
      category = ArticleCategory.LEADERSHIP_STRATEGY;
    } else if (content.includes('achievements_milestones')) {
      category = ArticleCategory.ACHIEVEMENTS_MILESTONES;
    } else {
      category = ArticleCategory.OTHER;
    }

    // Record decision in shared context
    this.recordDecision(
      'article_categorization',
      `Categorized article "${article.title}" as ${category}`,
      0.8,
      { articleId: article.id, category }
    );

    return category;
  }

  /**
   * Summarizes the agent's article history for context
   */
  private summarizeArticleHistory(): string {
    if (!this.searchContext.articleHistory?.length) {
      return 'No previous articles analyzed';
    }

    const categoryCounts = this.searchContext.articleHistory.reduce(
      (acc, article) => {
        const category = article.tags[0];
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return `Previously analyzed ${
      this.searchContext.articleHistory.length
    } articles: ${Object.entries(categoryCounts)
      .map(([category, count]) => `${category}: ${count}`)
      .join(', ')}`;
  }

  /**
   * Performs research by fetching and analyzing news articles
   */
  async research(contact: Contact, company: Company): Promise<NewsArticle[]> {
    this.log('INFO', 'Starting research process', {
      company: company.name,
      contact: contact.name,
    });

    // Update phase in shared context
    this.updatePhase('research', 'initializing', 0);

    // Verify we can proceed
    if (!this.canProceed()) {
      throw new Error(
        'Cannot proceed with research - invalid state or blocking suggestions'
      );
    }

    const startTime = Date.now();

    try {
      this.log('DEBUG', 'Attempting to fetch news articles');
      const articles = await this.handleError(
        async () => this.fetchNewsArticles(contact, company),
        async () => this.getFallbackStrategy()
      );

      this.log('INFO', 'Successfully fetched articles', {
        count: articles.length,
        categories: articles.map((a) => a.tags[0]).join(', '),
      });

      const researchTime = Date.now() - startTime;

      // Ensure articles are properly categorized
      const categorizedArticles = await Promise.all(
        articles.map(async (article) => {
          const category = await this.categorizeArticle(article);
          return { ...article, tags: [category] };
        })
      );

      this.log('DEBUG', 'Final categorized articles', {
        articles: categorizedArticles.map((a) => ({
          title: a.title,
          category: a.tags[0],
        })),
      });

      // Create angle from research findings with unique ID
      const primaryCategory =
        categorizedArticles[0]?.tags[0] || ArticleCategory.OTHER;
      const angle = {
        id: `angle-${Date.now()}`,
        title: `${company.name} Recent Developments`,
        body:
          categorizedArticles.length > 0
            ? `Based on recent news, ${
                company.name
              } is showing significant developments in ${primaryCategory.replace(
                /_/g,
                ' '
              )}.`
            : `Research findings about ${company.name}'s recent activities and developments.`,
      };

      // Update shared context with findings
      await this.contextManager.setResearchFindings(
        categorizedArticles,
        angle,
        categorizedArticles.reduce((acc, article, index) => {
          acc[article.id] = 1 - index / articles.length; // Higher relevance for earlier articles
          return acc;
        }, {} as Record<string, number>)
      );

      // Log research findings for debugging
      this.log('DEBUG', 'Research findings set', {
        articleCount: categorizedArticles.length,
        angle,
        researchFindings: this.getSharedContext().memory.researchFindings,
      });

      // Verify research findings were set
      const context = this.getSharedContext();
      if (!context.memory.researchFindings) {
        throw new Error('Failed to set research findings in context');
      }

      // Verify data completeness
      if (!categorizedArticles || categorizedArticles.length === 0) {
        this.log('ERROR', 'Invalid handoff data - missing articles', {
          articles: categorizedArticles,
        });
        throw new Error('Cannot handoff - no articles available');
      }

      if (!angle || !angle.title || !angle.body) {
        this.log('ERROR', 'Invalid handoff data - invalid angle', {
          angle,
        });
        throw new Error('Cannot handoff - invalid angle data');
      }

      // Prepare handoff data with complete article information
      const handoffData = {
        articles: categorizedArticles.map((article) => ({
          id: article.id,
          title: article.title,
          category: article.tags[0],
          url: article.url,
          publishedAt: article.publishedAt,
          summary: article.summary,
          source: article.source,
          companyName: article.companyName,
          tags: article.tags,
        })),
        angle: {
          id: angle.id,
          title: angle.title,
          body: angle.body,
        },
      };

      // Log handoff data for debugging
      this.log('DEBUG', 'Preparing handoff data', {
        articleCount: handoffData.articles.length,
        angle: handoffData.angle,
        dataStructure: {
          hasArticles: !!handoffData.articles,
          hasAngle: !!handoffData.angle,
          articleFields: Object.keys(handoffData.articles[0] || {}),
          angleFields: Object.keys(handoffData.angle),
        },
      });

      // Handoff to writer agent with validated data
      await this.handoffToAgent(
        'writer',
        'Research completed successfully',
        handoffData
      );

      // Record performance metrics
      this.recordPerformance({
        researchTime,
      });

      return articles;
    } catch (error) {
      // Record error in shared context
      this.contextManager.recordError(
        'researcher',
        error instanceof Error ? error.message : 'Unknown error during research'
      );
      throw error;
    }
  }

  /**
   * Internal method to fetch and process news articles
   */
  private async fetchNewsArticles(
    contact: Contact,
    company: Company
  ): Promise<NewsArticle[]> {
    this.log('DEBUG', 'Starting article fetch process');
    this.updatePhase('research', 'querying', 0.2);

    // Build optimized search query using autonomous decision making
    const query = await this.buildSearchQuery(contact, company);

    this.updatePhase('research', 'fetching', 0.4);

    // Fetch articles from Perplexity API
    const response = await searchPerplexityNews(query);

    this.updatePhase('research', 'processing', 0.6);

    // Process and filter articles
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    this.log('DEBUG', 'Filtering articles by date', {
      cutoffDate: sixMonthsAgo.toISOString(),
      totalArticles: response.articles.length,
    });

    const articles: NewsArticle[] = response.articles
      .filter((article) => {
        const isRecent = new Date(article.publishedAt) >= sixMonthsAgo;
        if (!isRecent) {
          this.log('DEBUG', 'Filtered out old article', {
            title: article.title,
            publishedAt: article.publishedAt,
          });
        }
        return isRecent;
      })
      .map((article) => ({
        id: article.id,
        title: article.title,
        url: article.url,
        publishedAt: article.publishedAt,
        summary: article.summary,
        source: article.source,
        companyName: company.name,
        tags: [],
      }));

    this.updatePhase('research', 'categorizing', 0.8);

    // Categorize articles using autonomous analysis
    const categorizedArticles = await Promise.all(
      articles.map(async (article) => {
        const category = await this.categorizeArticle(article);
        this.log('DEBUG', 'Article categorized', {
          articleTitle: article.title,
          category,
        });
        return {
          ...article,
          tags: [category],
        };
      })
    );

    // Ensure all articles have valid tags
    const validArticles = categorizedArticles.filter((article) => {
      const hasValidTag =
        article.tags.length > 0 && article.tags[0] in ArticleCategory;
      if (!hasValidTag) {
        this.log('WARN', 'Article missing valid tag', {
          articleTitle: article.title,
          tags: article.tags,
        });
      }
      return hasValidTag;
    });

    if (validArticles.length === 0) {
      this.log('ERROR', 'No articles with valid tags');
      throw new Error('Failed to categorize articles');
    }

    this.log('INFO', 'Articles categorized', {
      totalArticles: validArticles.length,
      categoryCounts: validArticles.reduce((acc, article) => {
        const category = article.tags[0];
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      originalCount: articles.length,
      filteredCount: categorizedArticles.length - validArticles.length,
    });

    // Update agent's article history
    this.searchContext.articleHistory = validArticles;

    this.updatePhase('research', 'prioritizing', 0.9);

    this.log('DEBUG', 'Prioritizing articles');
    // Sort articles by category and relevance
    const prioritizedArticles = this.prioritizeArticles(validArticles);

    this.log('INFO', 'Articles prioritized', {
      topArticle: prioritizedArticles[0]?.title,
      categories: prioritizedArticles.map((a) => a.tags[0]).join(', '),
    });

    return prioritizedArticles;
  }

  /**
   * Prioritizes articles based on category and relevance
   */
  private prioritizeArticles(articles: NewsArticle[]): NewsArticle[] {
    const categoryOrder = [
      ArticleCategory.PARTNERSHIPS_INVESTMENTS,
      ArticleCategory.DEVELOPMENTS_INNOVATIONS,
      ArticleCategory.LEADERSHIP_STRATEGY,
      ArticleCategory.ACHIEVEMENTS_MILESTONES,
      ArticleCategory.OTHER,
    ];

    return articles.sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a.tags[0] as ArticleCategory);
      const bIndex = categoryOrder.indexOf(b.tags[0] as ArticleCategory);

      // If categories are different, sort by category priority
      if (aIndex !== bIndex) {
        return aIndex - bIndex;
      }

      // If categories are the same, sort by date (newer first)
      return (
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    });
  }
}
