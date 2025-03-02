import { LLMClient } from '../interfaces/LLMClient';
import { OpenAIClient } from './OpenAIClient';
import logger from '../../../utils/logger';

/**
 * Factory class for creating and managing LLM clients
 * Provides a centralized way to access different LLM clients
 */
export class LLMClientFactory {
  private static instance: LLMClientFactory;
  private clients: Map<string, LLMClient> = new Map();

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Initialize with environment variables if available
    this.initializeFromEnvironment();
  }

  /**
   * Gets the singleton instance of the LLMClientFactory
   * @returns The LLMClientFactory instance
   */
  public static getInstance(): LLMClientFactory {
    if (!LLMClientFactory.instance) {
      LLMClientFactory.instance = new LLMClientFactory();
    }
    return LLMClientFactory.instance;
  }

  /**
   * Initializes LLM clients from environment variables
   */
  private initializeFromEnvironment(): void {
    // Initialize OpenAI client if API key is available
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (openaiApiKey) {
      this.registerClient('openai', new OpenAIClient(openaiApiKey));
      logger.info('OpenAI client initialized from environment');
    }

    // Additional LLM clients can be initialized here in the future
  }

  /**
   * Registers a new LLM client with the factory
   * @param name The name to register the client under
   * @param client The LLM client instance
   */
  public registerClient(name: string, client: LLMClient): void {
    this.clients.set(name.toLowerCase(), client);
    logger.debug(`Registered LLM client: ${name}`);
  }

  /**
   * Gets an LLM client by name
   * @param name The name of the client to get
   * @returns The LLM client instance or undefined if not found
   */
  public getClient(name: string): LLMClient | undefined {
    return this.clients.get(name.toLowerCase());
  }

  /**
   * Gets all registered LLM clients
   * @returns Array of all registered LLM clients
   */
  public getAllClients(): LLMClient[] {
    return Array.from(this.clients.values());
  }

  /**
   * Gets all configured LLM clients (those with valid API keys)
   * @returns Array of all configured LLM clients
   */
  public getConfiguredClients(): LLMClient[] {
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
   * Gets the best available LLM client based on priority
   * @param preferredClients Optional array of client names in order of preference
   * @returns The best available LLM client or undefined if none are configured
   */
  public getBestAvailableClient(
    preferredClients: string[] = ['openai']
  ): LLMClient | undefined {
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

  /**
   * Gets the total token usage across all LLM clients
   * @returns The total token usage
   */
  public getTotalTokenUsage(): {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    totalRequests: number;
    failedRequests: number;
  } {
    const usage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      totalRequests: 0,
      failedRequests: 0,
    };

    this.getAllClients().forEach((client) => {
      const clientUsage = client.getTokenUsage();
      usage.promptTokens += clientUsage.promptTokens;
      usage.completionTokens += clientUsage.completionTokens;
      usage.totalTokens += clientUsage.totalTokens;
      usage.totalRequests += clientUsage.totalRequests;
      usage.failedRequests += clientUsage.failedRequests;
    });

    return usage;
  }
}
