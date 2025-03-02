import axios from 'axios';
import { OpenAIClient } from '../../../../src/agents/writer/clients/OpenAIClient';
import {
  mockOpenAIChatCompletionResponse,
  mockOpenAIErrorResponse,
  mockRateLimitErrorResponse,
  mockServerErrorResponse,
} from '../../../../src/agents/writer/clients/__mocks__/mockResponses';
import { LLMError } from '../../../../src/agents/writer/interfaces/LLMClient';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OpenAIClient', () => {
  let client: OpenAIClient;
  const apiKey = 'test-api-key';
  const defaultModel = 'gpt-4o';

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create a new client for each test
    client = new OpenAIClient(apiKey, defaultModel);

    // Mock axios.create to return the mocked axios instance
    mockedAxios.create.mockReturnValue(mockedAxios);
  });

  describe('constructor', () => {
    it('should initialize with the provided API key and default model', () => {
      expect(client.isConfigured()).toBe(true);
      expect(client.getName()).toBe('OpenAI');
    });

    it('should use the default model if none is provided', () => {
      const clientWithoutModel = new OpenAIClient(apiKey);
      expect(clientWithoutModel.isConfigured()).toBe(true);
    });

    it('should not be configured with an empty API key', () => {
      const clientWithEmptyKey = new OpenAIClient('');
      expect(clientWithEmptyKey.isConfigured()).toBe(false);
    });
  });

  describe('generate', () => {
    it('should generate text successfully', async () => {
      // Mock successful response
      mockedAxios.post.mockResolvedValueOnce({
        data: mockOpenAIChatCompletionResponse,
      });

      // Call the generate method
      const result = await client.generate('Test prompt');

      // Verify the result
      expect(result.text).toBe(
        'This is a mock response from the OpenAI API for testing purposes.'
      );
      expect(result.model).toBe('gpt-4o');
      expect(result.usage.promptTokens).toBe(56);
      expect(result.usage.completionTokens).toBe(31);
      expect(result.usage.totalTokens).toBe(87);
      expect(result.finishReason).toBe('stop');

      // Verify the request
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/chat/completions',
        expect.objectContaining({
          model: defaultModel,
          messages: [{ role: 'user', content: 'Test prompt' }],
        })
      );

      // Verify token usage was updated
      const usage = client.getTokenUsage();
      expect(usage.promptTokens).toBe(56);
      expect(usage.completionTokens).toBe(31);
      expect(usage.totalTokens).toBe(87);
      expect(usage.totalRequests).toBe(1);
      expect(usage.failedRequests).toBe(0);
    });

    it('should include system prompt if provided', async () => {
      // Mock successful response
      mockedAxios.post.mockResolvedValueOnce({
        data: mockOpenAIChatCompletionResponse,
      });

      // Call the generate method with system prompt
      await client.generate('Test prompt', {
        systemPrompt: 'You are a helpful assistant',
      });

      // Verify the request includes the system prompt
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/chat/completions',
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'You are a helpful assistant' },
            { role: 'user', content: 'Test prompt' },
          ],
        })
      );
    });

    it('should use custom model if provided', async () => {
      // Mock successful response
      mockedAxios.post.mockResolvedValueOnce({
        data: mockOpenAIChatCompletionResponse,
      });

      // Call the generate method with custom model
      await client.generate('Test prompt', {
        model: 'gpt-3.5-turbo',
      });

      // Verify the request uses the custom model
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/chat/completions',
        expect.objectContaining({
          model: 'gpt-3.5-turbo',
        })
      );
    });

    it('should throw an error if not configured', async () => {
      // Create a client with empty API key
      const unconfiguredClient = new OpenAIClient('');

      // Call the generate method and expect it to throw
      await expect(unconfiguredClient.generate('Test prompt')).rejects.toThrow(
        'OpenAI client is not configured with a valid API key'
      );

      // Verify no request was made
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      // Mock error response
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 401,
          data: mockOpenAIErrorResponse,
        },
      });

      // Call the generate method and expect it to throw
      await expect(client.generate('Test prompt')).rejects.toThrow(
        'The API key provided is invalid or has expired.'
      );

      // Verify token usage was updated
      const usage = client.getTokenUsage();
      expect(usage.totalRequests).toBe(1);
      expect(usage.failedRequests).toBe(1);
    });

    it('should identify retryable errors', async () => {
      // Mock rate limit error
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 429,
          data: mockRateLimitErrorResponse,
        },
      });

      // Call the generate method and catch the error
      try {
        await client.generate('Test prompt');
        fail('Expected an error to be thrown');
      } catch (error) {
        // Verify the error is marked as retryable
        expect((error as LLMError).isRetryable).toBe(true);
        expect((error as LLMError).statusCode).toBe(429);
      }
    });

    it('should identify server errors as retryable', async () => {
      // Mock server error
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 500,
          data: mockServerErrorResponse,
        },
      });

      // Call the generate method and catch the error
      try {
        await client.generate('Test prompt');
        fail('Expected an error to be thrown');
      } catch (error) {
        // Verify the error is marked as retryable
        expect((error as LLMError).isRetryable).toBe(true);
        expect((error as LLMError).statusCode).toBe(500);
      }
    });

    it('should identify network errors as retryable', async () => {
      // Mock network error
      mockedAxios.post.mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'Connection aborted',
      });

      // Call the generate method and catch the error
      try {
        await client.generate('Test prompt');
        fail('Expected an error to be thrown');
      } catch (error) {
        // Verify the error is marked as retryable
        expect((error as LLMError).isRetryable).toBe(true);
      }
    });
  });

  describe('token usage tracking', () => {
    it('should track token usage across multiple requests', async () => {
      // Mock two successful responses
      mockedAxios.post.mockResolvedValueOnce({
        data: mockOpenAIChatCompletionResponse,
      });
      mockedAxios.post.mockResolvedValueOnce({
        data: mockOpenAIChatCompletionResponse,
      });

      // Make two requests
      await client.generate('First prompt');
      await client.generate('Second prompt');

      // Verify token usage was updated correctly
      const usage = client.getTokenUsage();
      expect(usage.promptTokens).toBe(112); // 56 * 2
      expect(usage.completionTokens).toBe(62); // 31 * 2
      expect(usage.totalTokens).toBe(174); // 87 * 2
      expect(usage.totalRequests).toBe(2);
      expect(usage.failedRequests).toBe(0);
    });

    it('should track failed requests', async () => {
      // Mock one successful and one failed response
      mockedAxios.post.mockResolvedValueOnce({
        data: mockOpenAIChatCompletionResponse,
      });
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 401,
          data: mockOpenAIErrorResponse,
        },
      });

      // Make one successful request
      await client.generate('Successful prompt');

      // Make one failed request
      try {
        await client.generate('Failed prompt');
      } catch (error) {
        // Expected error
      }

      // Verify token usage was updated correctly
      const usage = client.getTokenUsage();
      expect(usage.promptTokens).toBe(56);
      expect(usage.completionTokens).toBe(31);
      expect(usage.totalTokens).toBe(87);
      expect(usage.totalRequests).toBe(2);
      expect(usage.failedRequests).toBe(1);
    });
  });
});
