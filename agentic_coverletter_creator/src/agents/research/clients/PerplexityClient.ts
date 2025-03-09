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
      // Prepare request body using the updated API format
      const requestBody = {
        model: options.model || 'sonar',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful research assistant. Provide detailed and accurate information.',
          },
          {
            role: 'user',
            content: query,
          },
        ],
        max_tokens: options.maxTokens || 1024,
        temperature: options.temperature || 0.7,
        top_p: 0.9,
        stream: false,
      };

      // Make the API request to the updated endpoint
      const response = await this.axiosInstance.post(
        '/chat/completions',
        requestBody
      );

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
    // Check if we have a valid response with choices
    if (!data || !data.choices || data.choices.length === 0) {
      return [];
    }

    // Extract the answer from the response
    const answer = data.choices[0]?.message?.content;
    if (!answer) {
      return [];
    }

    // Create a result from the answer
    const results: SearchResult[] = [
      {
        title: `Perplexity Answer: ${query.substring(0, 50)}${
          query.length > 50 ? '...' : ''
        }`,
        url: '', // No URL for direct answers
        snippet: answer,
        source: 'Perplexity',
      },
    ];

    // Try to extract any links or citations from the answer
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = answer.match(urlRegex);

    if (urls) {
      urls.forEach((url: string) => {
        results.push({
          title: 'Referenced Source',
          url: url,
          snippet: `Source URL extracted from Perplexity response`,
          source: 'Perplexity',
        });
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
