/**
 * Researcher Agent
 * Responsible for gathering and analyzing news articles about companies
 * to inform personalized email generation.
 */

import { Contact, Company, NewsArticle } from '../models/models';

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
 * Builds a search query based on contact and company information
 */
function buildSearchQuery(contact: Contact, company: Company): string {
  const companyName = company.name;
  const industry = company.details.industry || '';

  return `${companyName} company news ${industry} partnerships investments developments`.trim();
}

/**
 * Categorizes an article based on its content
 */
function categorizeArticle(article: NewsArticle): ArticleCategory {
  const content = `${article.title} ${article.summary}`.toLowerCase();

  if (content.match(/partnership|invest|funding|acquisition|merger/)) {
    return ArticleCategory.PARTNERSHIPS_INVESTMENTS;
  }
  if (content.match(/develop|innovat|launch|technology|product|solution/)) {
    return ArticleCategory.DEVELOPMENTS_INNOVATIONS;
  }
  if (content.match(/ceo|executive|leader|appoint|strategy|initiative/)) {
    return ArticleCategory.LEADERSHIP_STRATEGY;
  }
  if (content.match(/award|milestone|achievement|recognition|success/)) {
    return ArticleCategory.ACHIEVEMENTS_MILESTONES;
  }

  return ArticleCategory.OTHER;
}

/**
 * Simulates a call to the Perplexity API
 * In production, this would make an actual API call
 */
async function mockPerplexityApiCall(
  query: string
): Promise<PerplexityResponse> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  return {
    articles: [
      {
        id: '1',
        title: 'Company X Announces Major Partnership',
        url: 'https://example.com/1',
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
        summary: 'Company X partners with Industry leader Y',
        source: 'TechNews',
      },
      {
        id: '2',
        title: 'Company X Launches New Product',
        url: 'https://example.com/2',
        publishedAt: new Date(Date.now() - 7200000).toISOString(),
        summary: 'Revolutionary new product development',
        source: 'BusinessDaily',
      },
    ],
  };
}

/**
 * Fetches and processes news articles for a given contact and company
 *
 * @param contact - Contact information
 * @param company - Company information
 * @returns Promise<NewsArticle[]> - Array of processed and categorized news articles
 */
export async function fetchNewsArticles(
  contact: Contact,
  company: Company
): Promise<NewsArticle[]> {
  // Build search query
  const query = buildSearchQuery(contact, company);

  // Fetch articles from Perplexity API (mocked)
  const response = await mockPerplexityApiCall(query);

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
      tags: [], // Tags can be added based on categorization
    }));

  // Categorize and sort articles
  return articles
    .map((article) => ({
      ...article,
      tags: [categorizeArticle(article)],
    }))
    .sort((a, b) => {
      const categoryOrder = [
        ArticleCategory.PARTNERSHIPS_INVESTMENTS,
        ArticleCategory.DEVELOPMENTS_INNOVATIONS,
        ArticleCategory.LEADERSHIP_STRATEGY,
        ArticleCategory.ACHIEVEMENTS_MILESTONES,
        ArticleCategory.OTHER,
      ];

      const aIndex = categoryOrder.indexOf(a.tags[0] as ArticleCategory);
      const bIndex = categoryOrder.indexOf(b.tags[0] as ArticleCategory);

      return aIndex - bIndex;
    });
}
