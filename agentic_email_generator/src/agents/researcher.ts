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
  try {
    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
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
        max_tokens: 1000,
        temperature: 0.2,
        top_p: 0.9,
      },
      {
        headers: {
          Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Get the raw response content
    const rawContent = response.data.choices[0].message.content;

    // Extract JSON from the response text
    const jsonMatch = rawContent.match(/\[.*\]/s);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    // Parse the JSON array
    const articles = JSON.parse(jsonMatch[0]);

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
    console.error(`Perplexity API error: ${error}`);
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
    const prompt = `As a research expert, analyze this company and contact to create an optimal news search query.
    
Company: ${company.name}
Industry: ${company.details.industry || 'Not specified'}
Description: ${company.details.description || 'Not specified'}
Contact: ${contact.name}
Title: ${contact.title || 'Not specified'}

Consider:
1. Recent company developments
2. Industry trends
3. Contact's role and interests
4. Company's market position

Generate a focused search query that will find relevant news.`;

    const response = await llm.invoke([
      { role: 'system', content: 'You are an expert research strategist.' },
      { role: 'user', content: prompt },
    ]);

    const query = response.content.toString().trim();

    // Record decision in shared context
    this.recordDecision(
      'search_query_generation',
      'Generated optimized search query based on company and contact analysis',
      0.85,
      { query }
    );

    return query;
  }

  /**
   * Categorizes an article using autonomous analysis
   */
  private async categorizeArticle(
    article: NewsArticle
  ): Promise<ArticleCategory> {
    const context = this.getSharedContext();
    const prompt = `Analyze this business news article and determine its primary category.

Title: ${article.title}
Summary: ${article.summary}

Context:
- Company: ${context.company.name}
- Industry: ${context.company.details.industry}
- Previous findings: ${this.summarizeArticleHistory()}

Categorize as one of:
- partnerships_investments: Deals, mergers, funding
- developments_innovations: New products, R&D, tech advances
- leadership_strategy: Management changes, strategic decisions
- achievements_milestones: Awards, growth markers, significant accomplishments
- other: General news

Explain your categorization reasoning and return the category.`;

    const response = await llm.invoke([
      { role: 'system', content: 'You are an expert news analyst.' },
      { role: 'user', content: prompt },
    ]);

    // Extract category from response
    const content = response.content.toString().toLowerCase();
    let category: ArticleCategory;

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
      const articles = await this.handleError(
        async () => this.fetchNewsArticles(contact, company),
        async () => this.getFallbackStrategy()
      );

      // Record performance metrics
      this.recordPerformance({
        researchTime: Date.now() - startTime,
      });

      // Update shared context with findings
      this.contextManager.setResearchFindings(
        articles,
        {
          id: 'auto-generated',
          title: `${company.name} Recent Developments`,
          body: `Research findings about ${company.name}'s recent activities and developments.`,
        },
        articles.reduce((acc, article, index) => {
          acc[article.id] = 1 - index / articles.length; // Higher relevance for earlier articles
          return acc;
        }, {} as Record<string, number>)
      );

      // Handoff to writer agent
      this.handoffToAgent('writer', 'Research completed successfully', {
        articleCount: articles.length,
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
        tags: [],
      }));

    this.updatePhase('research', 'categorizing', 0.8);

    // Categorize articles using autonomous analysis
    const categorizedArticles = await Promise.all(
      articles.map(async (article) => ({
        ...article,
        tags: [await this.categorizeArticle(article)],
      }))
    );

    // Update agent's article history
    this.searchContext.articleHistory = categorizedArticles;

    this.updatePhase('research', 'prioritizing', 0.9);

    // Sort articles by category and relevance
    const prioritizedArticles = this.prioritizeArticles(categorizedArticles);

    this.updatePhase('research', 'complete', 1);

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
