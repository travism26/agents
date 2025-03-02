import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { BaseApiClient, SearchResult, ApiError } from '../interfaces/ApiClient';
import logger from '../../../utils/logger';

/**
 * Client for interacting with the Bing Search API
 */
export class BingSearchClient extends BaseApiClient {
  private axiosInstance!: AxiosInstance; // Using definite assignment assertion
  private rateLimitRemaining: number = 100; // Default value, will be updated from response headers
  private rateLimitReset: number = 0;

  /**
   * Creates a new BingSearchClient instance
   * @param apiKey The Bing API key
   */
  constructor(apiKey: string) {
    const baseUrl = 'https://api.bing.microsoft.com/v7.0';
    super(apiKey, baseUrl, 'BingSearch');

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
        'Ocp-Apim-Subscription-Key': this.apiKey,
        Accept: 'application/json',
      },
      timeout: 10000, // 10 seconds timeout
    });

    // Add response interceptor to track rate limits
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Update rate limit information from headers if available
        if (response.headers['x-msedge-clientid']) {
          logger.debug(
            `Bing Search API client ID: ${response.headers['x-msedge-clientid']}`
          );
        }

        return response;
      },
      (error: AxiosError) => {
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  /**
   * Performs a search query using the Bing Search API
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
        'Bing Search API client is not configured with a valid API key'
      );
    }

    logger.info(`Performing Bing search for query: ${query}`);

    try {
      // Check if we're rate limited
      if (this.rateLimitRemaining <= 0) {
        const now = Date.now() / 1000;
        if (now < this.rateLimitReset) {
          const waitTime = Math.ceil(this.rateLimitReset - now);
          logger.warn(
            `Rate limit reached for Bing Search API. Waiting ${waitTime} seconds.`
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));
        }
      }

      // Prepare request parameters
      const params: Record<string, any> = {
        q: query,
        count: options.count || 10,
        offset: options.offset || 0,
        mkt: options.market || 'en-US',
        safeSearch: options.safeSearch || 'Moderate',
      };

      // Add optional parameters if provided
      if (options.responseFilter) {
        params.responseFilter = options.responseFilter;
      }

      // Make the API request
      const response = await this.axiosInstance.get('/search', { params });

      // Process and standardize the results
      return this.processSearchResults(response.data);
    } catch (error: unknown) {
      const apiError =
        error instanceof Error
          ? (error as ApiError)
          : (new Error('Unknown error occurred') as ApiError);

      if (apiError.isRetryable) {
        logger.warn(
          `Retryable error occurred during Bing search: ${apiError.message}`
        );
        // Implement retry logic here if needed
      }
      throw apiError;
    }
  }

  /**
   * Processes the raw API response into standardized search results
   * @param data The raw API response data
   * @returns Standardized search results
   */
  private processSearchResults(data: any): SearchResult[] {
    if (!data.webPages || !data.webPages.value) {
      return [];
    }

    return data.webPages.value.map((result: any) => ({
      title: result.name,
      url: result.url,
      snippet: result.snippet,
      source: 'Bing',
      publishedDate: result.dateLastCrawled,
    }));
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
      'message' in error.response.data
        ? (error.response.data.message as string)
        : error.message;

    const apiError = new Error(errorMessage) as ApiError;

    apiError.name = 'BingSearchApiError';
    apiError.statusCode = error.response?.status;

    // Determine if the error is retryable
    apiError.isRetryable = this.isRetryableError(error);

    // Log the error
    logger.error(`Bing Search API error: ${apiError.message}`, {
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
