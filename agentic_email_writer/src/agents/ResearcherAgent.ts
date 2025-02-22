import axios from 'axios';
import {
  BaseAgent,
  BaseAgentConfig,
  BaseAgentResult,
  AgentStatus,
} from './BaseAgent';
import { IGeneratedEmail, INewsArticle } from '../models/GeneratedEmail';
import {
  ResearcherPrompts,
  PromptVariables,
} from './prompts/ResearcherPrompts';

/**
 * Configuration interface for ResearcherAgent
 */
export interface ResearcherAgentConfig extends BaseAgentConfig {
  perplexityApiKey: string;
  maxArticles?: number;
  minRelevanceScore?: number;
  timeframeMonths?: number;
}

/**
 * Input data interface for the researcher agent
 */
export interface ResearcherInput {
  emailDoc: IGeneratedEmail;
  companyName: string;
  contactName: string;
  contactTitle: string;
  industry?: string;
  focusAreas?: string[];
}

/**
 * Result interface for the researcher agent
 */
interface PerplexityArticle {
  title: string;
  url: string;
  publishedDate: string;
  summary: string;
  relevanceScore?: number;
}

interface PerplexityResponse {
  articles: PerplexityArticle[];
  metadata?: {
    query?: string;
    timestamp?: string;
  };
}

export interface ResearcherResult extends BaseAgentResult {
  articles?: INewsArticle[];
}

export class ResearcherAgent extends BaseAgent {
  private api: any;
  private readonly maxArticles: number;
  private readonly minRelevanceScore: number;
  private readonly timeframeMonths: number;

  constructor(config: ResearcherAgentConfig) {
    super(config);

    if (!config.perplexityApiKey) {
      throw new Error('Perplexity API key is required');
    }

    this.api = axios.create({
      baseURL: 'https://api.perplexity.ai',
      headers: {
        Authorization: `Bearer ${config.perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    this.maxArticles = config.maxArticles || 5;
    this.minRelevanceScore = config.minRelevanceScore || 0.6;
    this.timeframeMonths = config.timeframeMonths || 6;
  }

  /**
   * Generate a research prompt based on the company and contact information
   */
  private generateResearchPrompt(
    companyName: string,
    contactName: string,
    contactTitle: string,
    industry?: string,
    focusAreas?: string[]
  ): string {
    const vars: PromptVariables = {
      companyName,
      contactName,
      contactTitle,
      timeframeMonths: this.timeframeMonths,
      industry,
      focusAreas,
    };

    // Combine base research template with industry trends for a comprehensive search
    return ResearcherPrompts.combine(vars, [
      ResearcherPrompts.baseResearch,
      ResearcherPrompts.industryTrends,
    ]);
  }

  /**
   * Filter and score articles based on relevance and recency
   */
  private filterArticles(articles: INewsArticle[]): INewsArticle[] {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - this.timeframeMonths);

    return articles
      .filter((article) => {
        // Filter by date
        const articleDate = new Date(article.publishedDate);
        return articleDate >= cutoffDate;
      })
      .filter((article) => {
        // Filter by relevance score if available
        return (
          !article.relevanceScore ||
          article.relevanceScore >= this.minRelevanceScore
        );
      })
      .sort((a, b) => {
        // Sort by relevance score (if available) and date
        const scoreA = a.relevanceScore || 0;
        const scoreB = b.relevanceScore || 0;
        if (scoreA !== scoreB) return scoreB - scoreA;

        return (
          new Date(b.publishedDate).getTime() -
          new Date(a.publishedDate).getTime()
        );
      })
      .slice(0, this.maxArticles);
  }

  /**
   * Process the research request
   */
  public async process(input: ResearcherInput): Promise<ResearcherResult> {
    try {
      this.status = AgentStatus.PROCESSING;

      // Update email status
      await this.updateGeneratedEmail(input.emailDoc, {
        status: 'researching',
      } as Partial<IGeneratedEmail>);

      // Generate and send prompt to Perplexity API
      const prompt = this.generateResearchPrompt(
        input.companyName,
        input.contactName,
        input.contactTitle,
        input.industry,
        input.focusAreas
      );

      const response = await this.executeWithTimeout<{
        data: PerplexityResponse;
      }>(
        this.api.post('/research', {
          prompt,
          max_articles: this.maxArticles * 2, // Request more articles than needed to allow for filtering
        })
      );

      // Process and filter articles
      const articles = this.filterArticles(
        (response as { data: PerplexityResponse }).data.articles.map(
          (article: PerplexityArticle) => ({
            ...article,
            publishedDate: new Date(article.publishedDate),
          })
        )
      );

      // Update email document with found articles
      await this.updateGeneratedEmail(input.emailDoc, {
        articles,
        status: 'writing', // Move to next stage
      } as Partial<IGeneratedEmail>);

      this.status = AgentStatus.SUCCESS;
      return {
        success: true,
        status: this.status,
        articles,
        metadata: {
          totalArticlesFound: (response as { data: PerplexityResponse }).data
            .articles.length,
          filteredArticlesCount: articles.length,
        },
      };
    } catch (error) {
      await this.handleError(error as Error);

      // Update email document with failure
      await this.updateGeneratedEmail(input.emailDoc, {
        status: 'failed',
        failedReason: `Research failed: ${(error as Error).message}`,
      } as Partial<IGeneratedEmail>);

      return {
        success: false,
        status: this.status,
        error: error as Error,
      };
    }
  }
}
