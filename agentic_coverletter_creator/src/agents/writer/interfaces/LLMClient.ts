/**
 * Interface for LLM clients used by the Writer Agent
 * Defines common methods and types for different LLM integrations
 */
export interface LLMClient {
  /**
   * Generates text using the LLM
   * @param prompt The prompt to send to the LLM
   * @param options Optional parameters for the generation
   * @returns Promise resolving to the generated text
   */
  generate(
    prompt: string,
    options?: LLMGenerationOptions
  ): Promise<LLMGenerationResult>;

  /**
   * Checks if the LLM client is properly configured
   * @returns True if the client is configured, false otherwise
   */
  isConfigured(): boolean;

  /**
   * Gets the name of the LLM client for logging and identification
   * @returns The name of the LLM client
   */
  getName(): string;

  /**
   * Gets the token usage statistics for the client
   * @returns The token usage statistics
   */
  getTokenUsage(): TokenUsage;
}

/**
 * Base class for LLM clients with common functionality
 */
export abstract class BaseLLMClient implements LLMClient {
  protected apiKey: string;
  protected baseUrl: string;
  protected name: string;
  protected tokenUsage: TokenUsage;

  /**
   * Creates a new BaseLLMClient instance
   * @param apiKey The API key for authentication
   * @param baseUrl The base URL for API requests
   * @param name The name of the LLM client
   */
  constructor(apiKey: string, baseUrl: string, name: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.name = name;
    this.tokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      totalRequests: 0,
      failedRequests: 0,
    };
  }

  /**
   * Checks if the LLM client is properly configured with an API key
   * @returns True if the API key is set, false otherwise
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }

  /**
   * Gets the name of the LLM client
   * @returns The name of the LLM client
   */
  getName(): string {
    return this.name;
  }

  /**
   * Gets the token usage statistics for the client
   * @returns The token usage statistics
   */
  getTokenUsage(): TokenUsage {
    return { ...this.tokenUsage };
  }

  /**
   * Updates the token usage statistics
   * @param usage The token usage to add
   */
  protected updateTokenUsage(usage: Partial<TokenUsage>): void {
    this.tokenUsage.promptTokens += usage.promptTokens || 0;
    this.tokenUsage.completionTokens += usage.completionTokens || 0;
    this.tokenUsage.totalTokens += usage.totalTokens || 0;
    this.tokenUsage.totalRequests += usage.totalRequests || 0;
    this.tokenUsage.failedRequests += usage.failedRequests || 0;
  }

  /**
   * Abstract method to be implemented by specific LLM clients
   */
  abstract generate(
    prompt: string,
    options?: LLMGenerationOptions
  ): Promise<LLMGenerationResult>;
}

/**
 * Options for LLM text generation
 */
export interface LLMGenerationOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  systemPrompt?: string;
  [key: string]: any;
}

/**
 * Result of LLM text generation
 */
export interface LLMGenerationResult {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason?: string;
}

/**
 * Token usage statistics for LLM clients
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalRequests: number;
  failedRequests: number;
}

/**
 * Interface for LLM response error handling
 */
export interface LLMError extends Error {
  statusCode?: number;
  isRetryable: boolean;
  model?: string;
  usage?: Partial<TokenUsage>;
}
