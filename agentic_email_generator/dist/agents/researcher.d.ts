/**
 * Researcher Agent
 * Responsible for gathering and analyzing news articles about companies
 * to inform personalized email generation.
 */
import { Contact, Company, NewsArticle } from '../models/models';
import { BaseAgent } from './base';
import { ContextManager, SharedContext } from '../models/context';
export declare enum ArticleCategory {
    PARTNERSHIPS_INVESTMENTS = "partnerships_investments",
    DEVELOPMENTS_INNOVATIONS = "developments_innovations",
    LEADERSHIP_STRATEGY = "leadership_strategy",
    ACHIEVEMENTS_MILESTONES = "achievements_milestones",
    OTHER = "other"
}
/**
 * ResearcherAgent class responsible for gathering news articles
 */
export declare class ResearcherAgent extends BaseAgent {
    private searchContext;
    constructor(contextManager: ContextManager);
    /**
     * Gets valid phases for this agent
     */
    protected getValidPhases(): SharedContext['state']['phase'][];
    /**
     * Implements fallback strategy for research failures
     */
    protected getFallbackStrategy(): Promise<NewsArticle[]>;
    /**
     * Builds an optimized search query using autonomous decision making
     */
    private buildSearchQuery;
    /**
     * Categorizes an article using autonomous analysis
     */
    private categorizeArticle;
    /**
     * Summarizes the agent's article history for context
     */
    private summarizeArticleHistory;
    /**
     * Performs research by fetching and analyzing news articles
     */
    research(contact: Contact, company: Company): Promise<NewsArticle[]>;
    /**
     * Internal method to fetch and process news articles
     */
    private fetchNewsArticles;
    /**
     * Prioritizes articles based on category and relevance
     */
    private prioritizeArticles;
}
