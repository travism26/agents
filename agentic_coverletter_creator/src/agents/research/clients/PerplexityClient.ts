import axios, { AxiosError, AxiosInstance } from 'axios';
import { BaseApiClient, SearchResult, ApiError } from '../interfaces/ApiClient';
import logger from '../../../utils/logger';

/**
 * Client for interacting with the Perplexity API
 */
export class PerplexityClient extends BaseApiClient {
  private axiosInstance!: AxiosInstance; // Using definite assignment assertion

  /**
   * Creates a new PerplexityClient instance
   * @param apiKey The Perplexity API key
   */
  constructor(apiKey: string) {
    const baseUrl = 'https://api.perplexity.ai';
    super(apiKey, baseUrl, 'Perplexity');

    // Initialize axios instance
    this.initializeAxiosInstance();
  }

  /**
   * Initializes the axios instance with default configuration and interceptors
   * Separated for better testability
   */
  private initializeAxiosInstance(): void {
    // Create axios instance with default configuration
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 30000, // 30 seconds timeout for longer queries
    });

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  /**
   * Performs a search query using the Perplexity API
   * @param query The search query string
   * @param options Optional parameters for the search
   * @returns Promise resolving to standardized search results
   */
  async search(
    query: string,
    options: Record<string, any> = {}
  ): Promise<SearchResult[]> {
    if (!this.isConfigured()) {
      throw new Error(
        'Perplexity API client is not configured with a valid API key'
      );
    }

    logger.info(`Performing Perplexity search for query: ${query}`);

    try {
      // Prepare request body
      const requestBody = {
        model: options.model || 'pplx-7b-online',
        query: query,
        max_tokens: options.maxTokens || 1024,
        temperature: options.temperature || 0.7,
        search_focus: options.searchFocus || 'internet',
      };

      // Make the API request
      const response = await this.axiosInstance.post('/query', requestBody);

      // Process and standardize the results
      return this.processSearchResults(response.data, query);
    } catch (error: unknown) {
      const apiError =
        error instanceof Error
          ? (error as ApiError)
          : (new Error('Unknown error occurred') as ApiError);

      if (apiError.isRetryable) {
        logger.warn(
          `Retryable error occurred during Perplexity search: ${apiError.message}`
        );
        // Implement retry logic here if needed
      }
      throw apiError;
    }
  }

  /**
   * Processes the raw API response into standardized search results
   * @param data The raw API response data
   * @param query The original query for context
   * @returns Standardized search results
   */
  private processSearchResults(data: any, query: string): SearchResult[] {
    if (!data || !data.answer) {
      return [];
    }

    // Extract sources from the response if available
    const sources = data.sources || [];
    const results: SearchResult[] = [];

    // Add sources as search results
    sources.forEach((source: any) => {
      if (source.url) {
        results.push({
          title: source.title || 'Perplexity Source',
          url: source.url,
          snippet: source.snippet || '',
          source: 'Perplexity',
          publishedDate: source.published_date || undefined,
        });
      }
    });

    // If no sources were found but we have an answer, create a single result
    if (results.length === 0 && data.answer) {
      results.push({
        title: `Perplexity Answer: ${query.substring(0, 50)}${
          query.length > 50 ? '...' : ''
        }`,
        url: '', // No URL for direct answers
        snippet: data.answer,
        source: 'Perplexity',
      });
    }

    return results;
  }

  /**
   * Handles API errors and determines if they are retryable
   * @param error The axios error
   * @returns A standardized API error
   */
  private handleApiError(error: AxiosError): ApiError {
    const errorMessage =
      error.response?.data &&
      typeof error.response.data === 'object' &&
      'error' in error.response.data
        ? (error.response.data.error as string)
        : error.message;

    const apiError = new Error(errorMessage) as ApiError;

    apiError.name = 'PerplexityApiError';
    apiError.statusCode = error.response?.status;

    // Determine if the error is retryable
    apiError.isRetryable = this.isRetryableError(error);

    // Log the error
    logger.error(`Perplexity API error: ${apiError.message}`, {
      statusCode: apiError.statusCode,
      isRetryable: apiError.isRetryable,
    });

    return apiError;
  }

  /**
   * Determines if an error is retryable based on status code and error type
   * @param error The axios error
   * @returns True if the error is retryable, false otherwise
   */
  private isRetryableError(error: AxiosError): boolean {
    // Network errors are retryable
    if (
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT' ||
      !error.response
    ) {
      return true;
    }

    // Rate limiting (429) and server errors (5xx) are retryable
    const statusCode = error.response?.status;
    return !!(
      statusCode === 429 ||
      (statusCode && statusCode >= 500 && statusCode < 600)
    );
  }
}
