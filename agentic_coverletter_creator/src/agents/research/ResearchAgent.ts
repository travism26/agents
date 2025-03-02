import { ApiClient, SearchResult } from './interfaces/ApiClient';
import { ApiClientFactory } from './clients/ApiClientFactory';
import logger from '../../utils/logger';

/**
 * Interface for company research results
 */
export interface CompanyResearchResult {
  companyName: string;
  companyInfo: {
    description?: string;
    industry?: string;
    founded?: string;
    headquarters?: string;
    size?: string;
    revenue?: string;
  };
  companyValues: string[];
  recentNews: {
    title: string;
    url: string;
    snippet: string;
    publishedDate?: string;
  }[];
  blogPosts: {
    title: string;
    url: string;
    snippet: string;
    publishedDate?: string;
  }[];
  jobAnalysis: {
    keySkills: string[];
    responsibilities: string[];
    qualifications: string[];
    companyFit: string;
  };
  sources: {
    url: string;
    title: string;
  }[];
}

/**
 * Options for company research
 */
export interface ResearchOptions {
  preferredClients?: string[];
  cacheResults?: boolean;
  maxResults?: number;
}

/**
 * ResearchAgent class for performing company research
 * Uses API clients to gather information about companies and job descriptions
 */
export class ResearchAgent {
  private apiClientFactory: ApiClientFactory;
  private cache: Map<string, { timestamp: number; data: any }> = new Map();
  private cacheTTL: number = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Creates a new ResearchAgent instance
   * @param apiClientFactory Optional ApiClientFactory instance (for testing)
   */
  constructor(apiClientFactory?: ApiClientFactory) {
    this.apiClientFactory = apiClientFactory || ApiClientFactory.getInstance();
    logger.info('ResearchAgent initialized');
  }

  /**
   * Performs research on a company based on company name and job description
   * @param companyName The name of the company to research
   * @param jobDescription The job description to analyze
   * @param options Optional research options
   * @returns Promise resolving to company research results
   */
  async researchCompany(
    companyName: string,
    jobDescription: string,
    options: ResearchOptions = {}
  ): Promise<CompanyResearchResult> {
    logger.info(`Starting research for company: ${companyName}`);

    // Check cache if enabled
    const cacheKey = this.getCacheKey(companyName, jobDescription);
    if (options.cacheResults !== false) {
      const cachedResult = this.getFromCache<CompanyResearchResult>(cacheKey);
      if (cachedResult) {
        logger.info(`Using cached research results for ${companyName}`);
        return cachedResult;
      }
    }

    // Get the best available API client
    const apiClient = this.apiClientFactory.getBestAvailableClient(
      options.preferredClients
    );

    if (!apiClient) {
      throw new Error('No configured API clients available for research');
    }

    logger.info(`Using ${apiClient.getName()} for company research`);

    // Perform research tasks in parallel for efficiency
    const [companyInfo, companyValues, recentNews, blogPosts, jobAnalysis] =
      await Promise.all([
        this.getCompanyInformation(apiClient, companyName),
        this.extractCompanyValues(apiClient, companyName),
        this.getRecentNews(apiClient, companyName),
        this.getBlogPosts(apiClient, companyName),
        this.analyzeJobDescription(apiClient, companyName, jobDescription),
      ]);

    // Compile all sources from the research
    const sources = this.compileSources([
      ...companyInfo.sources,
      ...companyValues.sources,
      ...recentNews,
      ...blogPosts,
    ]);

    // Create the final research result
    const result: CompanyResearchResult = {
      companyName,
      companyInfo: companyInfo.info,
      companyValues: companyValues.values,
      recentNews: recentNews.map((news) => ({
        title: news.title,
        url: news.url,
        snippet: news.snippet,
        publishedDate: news.publishedDate,
      })),
      blogPosts: blogPosts.map((post) => ({
        title: post.title,
        url: post.url,
        snippet: post.snippet,
        publishedDate: post.publishedDate,
      })),
      jobAnalysis,
      sources,
    };

    // Cache the result if caching is enabled
    if (options.cacheResults !== false) {
      this.addToCache(cacheKey, result);
    }

    logger.info(`Completed research for company: ${companyName}`);
    return result;
  }

  /**
   * Gets general information about a company
   * @param apiClient The API client to use for the search
   * @param companyName The name of the company
   * @returns Promise resolving to company information and sources
   */
  private async getCompanyInformation(
    apiClient: ApiClient,
    companyName: string
  ): Promise<{
    info: CompanyResearchResult['companyInfo'];
    sources: SearchResult[];
  }> {
    logger.debug(`Getting company information for: ${companyName}`);

    const query = `
<SearchQuery>
  <Purpose>Find general information about the company</Purpose>
  <Company>${companyName}</Company>
  <Keywords>
    <Item>company</Item>
    <Item>information</Item>
    <Item>profile</Item>
    <Item>about</Item>
  </Keywords>
</SearchQuery>`;
    const searchResults = await apiClient.search(query, { count: 5 });

    // Extract company information from search results
    // This is a simplified implementation - in a real-world scenario,
    // we would use more sophisticated NLP techniques to extract structured information
    const info: CompanyResearchResult['companyInfo'] = {};

    // For now, we'll just use the first search result's snippet as the description
    if (searchResults.length > 0) {
      info.description = searchResults[0].snippet;
    }

    return { info, sources: searchResults };
  }

  /**
   * Extracts company values from company information
   * @param apiClient The API client to use for the search
   * @param companyName The name of the company
   * @returns Promise resolving to company values and sources
   */
  private async extractCompanyValues(
    apiClient: ApiClient,
    companyName: string
  ): Promise<{ values: string[]; sources: SearchResult[] }> {
    logger.debug(`Extracting company values for: ${companyName}`);

    const query = `
<SearchQuery>
  <Purpose>Extract company values and culture information</Purpose>
  <Company>${companyName}</Company>
  <Keywords>
    <Item>company values</Item>
    <Item>mission</Item>
    <Item>vision</Item>
    <Item>culture</Item>
  </Keywords>
</SearchQuery>`;
    const searchResults = await apiClient.search(query, { count: 3 });

    // Extract company values from search results
    // This is a simplified implementation - in a real-world scenario,
    // we would use more sophisticated NLP techniques to extract values
    const values: string[] = [];

    // For now, we'll just extract some keywords from the search results
    const valueKeywords = [
      'innovation',
      'integrity',
      'quality',
      'customer',
      'excellence',
      'sustainability',
      'diversity',
      'inclusion',
      'teamwork',
      'respect',
    ];

    searchResults.forEach((result: SearchResult) => {
      const snippet = result.snippet.toLowerCase();
      valueKeywords.forEach((keyword) => {
        if (snippet.includes(keyword) && !values.includes(keyword)) {
          values.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
        }
      });
    });

    return { values, sources: searchResults };
  }

  /**
   * Gets recent news about a company
   * @param apiClient The API client to use for the search
   * @param companyName The name of the company
   * @returns Promise resolving to recent news search results
   */
  private async getRecentNews(
    apiClient: ApiClient,
    companyName: string
  ): Promise<SearchResult[]> {
    logger.debug(`Getting recent news for: ${companyName}`);

    const query = `
<SearchQuery>
  <Purpose>Find recent news about the company</Purpose>
  <Company>${companyName}</Company>
  <Keywords>
    <Item>company</Item>
    <Item>news</Item>
    <Item>recent</Item>
  </Keywords>
  <TimeRange>Recent articles</TimeRange>
</SearchQuery>`;
    return await apiClient.search(query, { count: 3 });
  }

  /**
   * Gets blog posts from a company
   * @param apiClient The API client to use for the search
   * @param companyName The name of the company
   * @returns Promise resolving to blog post search results
   */
  private async getBlogPosts(
    apiClient: ApiClient,
    companyName: string
  ): Promise<SearchResult[]> {
    logger.debug(`Getting blog posts for: ${companyName}`);

    const query = `
<SearchQuery>
  <Purpose>Find blog posts from the company</Purpose>
  <Company>${companyName}</Company>
  <Keywords>
    <Item>company</Item>
    <Item>blog</Item>
    <Item>posts</Item>
  </Keywords>
</SearchQuery>`;
    return await apiClient.search(query, { count: 3 });
  }

  /**
   * Analyzes a job description to extract key information
   * @param apiClient The API client to use for the analysis
   * @param companyName The name of the company
   * @param jobDescription The job description to analyze
   * @returns Promise resolving to job analysis results
   */
  private async analyzeJobDescription(
    apiClient: ApiClient,
    companyName: string,
    jobDescription: string
  ): Promise<CompanyResearchResult['jobAnalysis']> {
    logger.debug(`Analyzing job description for: ${companyName}`);

    // This is a simplified implementation - in a real-world scenario,
    // we would use more sophisticated NLP techniques to analyze the job description

    // Extract key skills from the job description
    const keySkills = this.extractKeywords(jobDescription, [
      'experience',
      'proficient',
      'skilled',
      'knowledge',
      'familiar',
      'expertise',
    ]);

    // Extract responsibilities from the job description
    const responsibilities = this.extractKeywords(jobDescription, [
      'responsible',
      'duties',
      'will',
      'manage',
      'develop',
      'create',
      'implement',
      'maintain',
    ]);

    // Extract qualifications from the job description
    const qualifications = this.extractKeywords(jobDescription, [
      'degree',
      'bachelor',
      'master',
      'phd',
      'certification',
      'qualified',
      'years',
      'education',
    ]);

    // For company fit, we'll use a more targeted search
    const query = `
<SearchQuery>
  <Purpose>Understand company culture and employee fit</Purpose>
  <Company>${companyName}</Company>
  <Keywords>
    <Item>company culture</Item>
    <Item>employee</Item>
    <Item>fit</Item>
    <Item>work environment</Item>
  </Keywords>
</SearchQuery>`;
    const searchResults = await apiClient.search(query, { count: 1 });
    const companyFit = searchResults.length > 0 ? searchResults[0].snippet : '';

    return {
      keySkills,
      responsibilities,
      qualifications,
      companyFit,
    };
  }

  /**
   * Extracts keywords from text based on trigger words
   * @param text The text to extract keywords from
   * @param triggerWords Words that indicate a keyword may follow
   * @returns Array of extracted keywords
   */
  private extractKeywords(text: string, triggerWords: string[]): string[] {
    const keywords: string[] = [];
    const sentences = text.split(/[.!?]+/);

    sentences.forEach((sentence) => {
      const lowerSentence = sentence.toLowerCase();
      triggerWords.forEach((trigger) => {
        if (lowerSentence.includes(trigger)) {
          // Extract a phrase after the trigger word
          // This is a very simplified approach
          const words = sentence.split(/\s+/);
          const triggerIndex = words.findIndex((word) =>
            word.toLowerCase().includes(trigger)
          );

          if (triggerIndex >= 0 && triggerIndex < words.length - 1) {
            // Take up to 5 words after the trigger word
            const phrase = words
              .slice(triggerIndex + 1, triggerIndex + 6)
              .join(' ')
              .replace(/[,;:].*$/, ''); // Remove anything after a comma, semicolon, or colon

            if (phrase && !keywords.includes(phrase)) {
              keywords.push(phrase);
            }
          }
        }
      });
    });

    return keywords;
  }

  /**
   * Compiles unique sources from search results
   * @param searchResults Array of search results
   * @returns Array of unique sources
   */
  private compileSources(
    searchResults: SearchResult[]
  ): CompanyResearchResult['sources'] {
    const uniqueUrls = new Set<string>();
    const sources: CompanyResearchResult['sources'] = [];

    searchResults.forEach((result: SearchResult) => {
      if (result.url && !uniqueUrls.has(result.url)) {
        uniqueUrls.add(result.url);
        sources.push({
          url: result.url,
          title: result.title,
        });
      }
    });

    return sources;
  }

  /**
   * Generates a cache key from company name and job description
   * @param companyName The company name
   * @param jobDescription The job description
   * @returns Cache key string
   */
  private getCacheKey(companyName: string, jobDescription: string): string {
    // Create a simple hash of the job description to use as part of the cache key
    const jobHash = Buffer.from(jobDescription)
      .toString('base64')
      .substring(0, 10);
    return `${companyName.toLowerCase()}_${jobHash}`;
  }

  /**
   * Retrieves data from the cache if it exists and is not expired
   * @param key The cache key
   * @returns Cached data or undefined if not found or expired
   */
  private getFromCache<T = CompanyResearchResult>(key: string): T | undefined {
    const cached = this.cache.get(key);
    if (!cached) {
      return undefined;
    }

    // Check if the cached data has expired
    const now = Date.now();
    if (now - cached.timestamp > this.cacheTTL) {
      logger.debug(`Cache expired for key: ${key}`);
      this.cache.delete(key);
      return undefined;
    }

    return cached.data as T;
  }

  /**
   * Adds data to the cache
   * @param key The cache key
   * @param data The data to cache
   */
  private addToCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      timestamp: Date.now(),
      data,
    });
    logger.debug(`Added to cache: ${key}`);
  }

  /**
   * Clears the cache
   */
  public clearCache(): void {
    this.cache.clear();
    logger.info('Research cache cleared');
  }

  /**
   * Sets the cache time-to-live (TTL)
   * @param ttlMs TTL in milliseconds
   */
  public setCacheTTL(ttlMs: number): void {
    this.cacheTTL = ttlMs;
    logger.info(`Research cache TTL set to ${ttlMs}ms`);
  }
}
