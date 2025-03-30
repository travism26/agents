import axios, { AxiosError, AxiosInstance } from 'axios';
import {
  BaseLLMClient,
  LLMGenerationOptions,
  LLMGenerationResult,
  LLMError,
  TokenUsage,
} from '../interfaces/LLMClient';
import logger from '../../../utils/logger';

/**
 * Client for interacting with the OpenAI API
 */
export class OpenAIClient extends BaseLLMClient {
  private axiosInstance!: AxiosInstance; // Using definite assignment assertion
  private defaultModel: string;

  /**
   * Creates a new OpenAIClient instance
   * @param apiKey The OpenAI API key
   * @param defaultModel The default model to use (defaults to gpt-4o)
   */
  constructor(apiKey: string, defaultModel: string = 'gpt-4o') {
    const baseUrl = 'https://api.openai.com/v1';
    super(apiKey, baseUrl, 'OpenAI');

    this.defaultModel = defaultModel;

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
      timeout: 60000, // 60 seconds timeout for longer generations
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
   * Generates text using the OpenAI API
   * @param prompt The prompt to send to the model
   * @param options Optional parameters for the generation
   * @returns Promise resolving to the generated text and metadata
   */
  async generate(
    prompt: string,
    options: LLMGenerationOptions = {}
  ): Promise<LLMGenerationResult> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI client is not configured with a valid API key');
    }

    const model = options.model || this.defaultModel;
    logger.info(`Generating text with OpenAI model: ${model}`);

    try {
      // Update request count
      this.updateTokenUsage({ totalRequests: 1 });

      // Prepare request body
      const requestBody = this.prepareRequestBody(prompt, options);

      // Make the API request
      const response = await this.axiosInstance.post(
        '/chat/completions',
        requestBody
      );

      // Process the response
      return this.processResponse(response.data);
    } catch (error: unknown) {
      // Update failed request count
      this.updateTokenUsage({ failedRequests: 1 });

      const apiError =
        error instanceof Error
          ? (error as LLMError)
          : (new Error('Unknown error occurred') as LLMError);

      if (apiError.isRetryable) {
        logger.warn(
          `Retryable error occurred during OpenAI generation: ${apiError.message}`
        );
        // Implement retry logic here if needed
      }
      throw apiError;
    }
  }

  /**
   * Prepares the request body for the OpenAI API
   * @param prompt The prompt to send to the model
   * @param options Optional parameters for the generation
   * @returns The request body
   */
  private prepareRequestBody(
    prompt: string,
    options: LLMGenerationOptions
  ): any {
    const model = options.model || this.defaultModel;
    const messages = [];

    // Add system message if provided
    if (options.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt,
      });
    }

    // Add user message (the prompt)
    messages.push({
      role: 'user',
      content: prompt,
    });

    const requestBody: any = {
      model,
      messages,
      temperature:
        options.temperature !== undefined ? options.temperature : 0.7,
      max_tokens: options.maxTokens || 1500,
      top_p: options.topP !== undefined ? options.topP : 1,
      frequency_penalty: options.frequencyPenalty || 0,
      presence_penalty: options.presencePenalty || 0,
      stop: options.stop || null,
    };

    // Add response_format if specified
    if (options.responseFormat) {
      requestBody.response_format = options.responseFormat;
    }

    return requestBody;
  }

  /**
   * Processes the OpenAI API response
   * @param data The API response data
   * @returns The processed generation result
   */
  private processResponse(data: any): LLMGenerationResult {
    if (!data || !data.choices || data.choices.length === 0) {
      throw new Error('Invalid response from OpenAI API');
    }

    const choice = data.choices[0];
    const usage = data.usage || {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    };

    // Update token usage
    this.updateTokenUsage({
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
    });

    return {
      text: choice.message?.content || '',
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
      model: data.model,
      finishReason: choice.finish_reason,
    };
  }

  /**
   * Handles API errors and determines if they are retryable
   * @param error The axios error
   * @returns A standardized LLM error
   */
  private handleApiError(error: AxiosError): LLMError {
    const errorMessage =
      error.response?.data &&
      typeof error.response.data === 'object' &&
      'error' in error.response.data
        ? (error.response.data.error as any).message || 'OpenAI API error'
        : error.message;

    const apiError = new Error(errorMessage) as LLMError;

    apiError.name = 'OpenAIApiError';
    apiError.statusCode = error.response?.status;
    apiError.isRetryable = this.isRetryableError(error);
    apiError.model = this.defaultModel;

    // Log the error
    logger.error(`OpenAI API error: ${apiError.message}`, {
      statusCode: apiError.statusCode,
      isRetryable: apiError.isRetryable,
      model: apiError.model,
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
