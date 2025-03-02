import { ApiClient } from '../interfaces/ApiClient';
import { BingSearchClient } from './BingSearchClient';
import { PerplexityClient } from './PerplexityClient';
import logger from '../../../utils/logger';

/**
 * Factory class for creating and managing API clients
 * Provides a centralized way to access different API clients
 */
export class ApiClientFactory {
  private static instance: ApiClientFactory;
  private clients: Map<string, ApiClient> = new Map();

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Initialize with environment variables if available
    this.initializeFromEnvironment();
  }

  /**
   * Gets the singleton instance of the ApiClientFactory
   * @returns The ApiClientFactory instance
   */
  public static getInstance(): ApiClientFactory {
    if (!ApiClientFactory.instance) {
      ApiClientFactory.instance = new ApiClientFactory();
    }
    return ApiClientFactory.instance;
  }

  /**
   * Initializes API clients from environment variables
   */
  private initializeFromEnvironment(): void {
    // Initialize Bing Search client if API key is available
    const bingApiKey = process.env.BING_API_KEY;
    if (bingApiKey) {
      this.registerClient('bing', new BingSearchClient(bingApiKey));
      logger.info('Bing Search API client initialized from environment');
    }

    // Initialize Perplexity client if API key is available
    const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
    if (perplexityApiKey) {
      this.registerClient('perplexity', new PerplexityClient(perplexityApiKey));
      logger.info('Perplexity API client initialized from environment');
    }
  }

  /**
   * Registers a new API client with the factory
   * @param name The name to register the client under
   * @param client The API client instance
   */
  public registerClient(name: string, client: ApiClient): void {
    this.clients.set(name.toLowerCase(), client);
    logger.debug(`Registered API client: ${name}`);
  }

  /**
   * Gets an API client by name
   * @param name The name of the client to get
   * @returns The API client instance or undefined if not found
   */
  public getClient(name: string): ApiClient | undefined {
    return this.clients.get(name.toLowerCase());
  }

  /**
   * Gets all registered API clients
   * @returns Array of all registered API clients
   */
  public getAllClients(): ApiClient[] {
    return Array.from(this.clients.values());
  }

  /**
   * Gets all configured API clients (those with valid API keys)
   * @returns Array of all configured API clients
   */
  public getConfiguredClients(): ApiClient[] {
    return this.getAllClients().filter((client) => client.isConfigured());
  }

  /**
   * Checks if a client with the given name exists and is configured
   * @param name The name of the client to check
   * @returns True if the client exists and is configured, false otherwise
   */
  public hasConfiguredClient(name: string): boolean {
    const client = this.getClient(name);
    return !!client && client.isConfigured();
  }

  /**
   * Gets the best available API client based on priority
   * @param preferredClients Optional array of client names in order of preference
   * @returns The best available API client or undefined if none are configured
   */
  public getBestAvailableClient(
    preferredClients: string[] = ['perplexity', 'bing']
  ): ApiClient | undefined {
    // Try to get clients in order of preference
    for (const clientName of preferredClients) {
      const client = this.getClient(clientName);
      if (client && client.isConfigured()) {
        return client;
      }
    }

    // If no preferred clients are available, return any configured client
    const configuredClients = this.getConfiguredClients();
    return configuredClients.length > 0 ? configuredClients[0] : undefined;
  }
}
