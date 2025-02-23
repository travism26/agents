/**
 * Researcher Agent
 * Responsible for gathering and analyzing news articles about companies
 * to inform personalized email generation.
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { Contact, Company, NewsArticle } from '../models/models';
import { ChatOpenAI } from '@langchain/openai';

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

    // Parse the response to extract articles
    const articles = JSON.parse(response.data.choices[0].message.content);

    // Validate and transform the response
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
export class ResearcherAgent {
  private context: {
    company?: Company;
    contact?: Contact;
    searchStrategy?: string;
    lastQueryTime?: Date;
    articleHistory?: NewsArticle[];
  };

  constructor() {
    this.context = {};
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

    // Extract content from response
    const content = response.content.toString();

    // Update agent's context with search strategy
    this.context.searchStrategy = content;

    return content.trim();
  }

  /**
   * Categorizes an article using autonomous analysis
   */
  private async categorizeArticle(
    article: NewsArticle
  ): Promise<ArticleCategory> {
    const prompt = `Analyze this business news article and determine its primary category.

Title: ${article.title}
Summary: ${article.summary}

Context:
- Company: ${this.context.company?.name}
- Industry: ${this.context.company?.details.industry}
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
    const category = response.content.toString().toLowerCase();

    if (category.includes('partnerships_investments')) {
      return ArticleCategory.PARTNERSHIPS_INVESTMENTS;
    } else if (category.includes('developments_innovations')) {
      return ArticleCategory.DEVELOPMENTS_INNOVATIONS;
    } else if (category.includes('leadership_strategy')) {
      return ArticleCategory.LEADERSHIP_STRATEGY;
    } else if (category.includes('achievements_milestones')) {
      return ArticleCategory.ACHIEVEMENTS_MILESTONES;
    } else {
      return ArticleCategory.OTHER;
    }
  }

  /**
   * Summarizes the agent's article history for context
   */
  private summarizeArticleHistory(): string {
    if (!this.context.articleHistory?.length) {
      return 'No previous articles analyzed';
    }

    const categoryCounts = this.context.articleHistory.reduce(
      (acc, article) => {
        const category = article.tags[0];
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return `Previously analyzed ${
      this.context.articleHistory.length
    } articles: ${Object.entries(categoryCounts)
      .map(([category, count]) => `${category}: ${count}`)
      .join(', ')}`;
  }

  /**
   * Performs research by fetching and analyzing news articles
   */
  async research(contact: Contact, company: Company): Promise<NewsArticle[]> {
    // Update agent's context
    this.context.company = company;
    this.context.contact = contact;
    this.context.lastQueryTime = new Date();

    return this.fetchNewsArticles(contact, company);
  }

  /**
   * Internal method to fetch and process news articles
   */
  private async fetchNewsArticles(
    contact: Contact,
    company: Company
  ): Promise<NewsArticle[]> {
    // Build optimized search query using autonomous decision making
    const query = await this.buildSearchQuery(contact, company);

    // Fetch articles from Perplexity API
    const response = await searchPerplexityNews(query);

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

    // Categorize articles using autonomous analysis
    const categorizedArticles = await Promise.all(
      articles.map(async (article) => ({
        ...article,
        tags: [await this.categorizeArticle(article)],
      }))
    );

    // Update agent's article history
    this.context.articleHistory = categorizedArticles;

    // Sort articles by category and relevance
    return this.prioritizeArticles(categorizedArticles);
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
