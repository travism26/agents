/**
 * Interface for API clients used by the Research Agent
 * Defines common methods and types for different API integrations
 */
export interface ApiClient {
  /**
   * Performs a search query using the API
   * @param query The search query string
   * @param options Optional parameters for the search
   * @returns Promise resolving to the search results
   */
  search(query: string, options?: Record<string, any>): Promise<any>;

  /**
   * Checks if the API client is properly configured
   * @returns True if the client is configured, false otherwise
   */
  isConfigured(): boolean;

  /**
   * Gets the name of the API client for logging and identification
   * @returns The name of the API client
   */
  getName(): string;
}

/**
 * Base class for API clients with common functionality
 */
export abstract class BaseApiClient implements ApiClient {
  protected apiKey: string;
  protected baseUrl: string;
  protected name: string;

  /**
   * Creates a new BaseApiClient instance
   * @param apiKey The API key for authentication
   * @param baseUrl The base URL for API requests
   * @param name The name of the API client
   */
  constructor(apiKey: string, baseUrl: string, name: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.name = name;
  }

  /**
   * Checks if the API client is properly configured with an API key
   * @returns True if the API key is set, false otherwise
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }

  /**
   * Gets the name of the API client
   * @returns The name of the API client
   */
  getName(): string {
    return this.name;
  }

  /**
   * Abstract method to be implemented by specific API clients
   */
  abstract search(query: string, options?: Record<string, any>): Promise<any>;
}

/**
 * Interface for search results to standardize output across different APIs
 */
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedDate?: string;
}

/**
 * Interface for API response error handling
 */
export interface ApiError extends Error {
  statusCode?: number;
  isRetryable: boolean;
}
