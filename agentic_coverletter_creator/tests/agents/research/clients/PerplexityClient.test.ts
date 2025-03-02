import axios, { AxiosError } from 'axios';
import { PerplexityClient } from '../../../../src/agents/research/clients/PerplexityClient';
import { ApiError } from '../../../../src/agents/research/interfaces/ApiClient';
import {
  mockPerplexityResponse,
  mockErrorResponses,
} from '../../../../src/agents/research/clients/__mocks__/mockResponses';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PerplexityClient', () => {
  let client: PerplexityClient;
  const testApiKey = 'test-api-key';

  // Mock axios instance that will be returned by axios.create
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      post: jest.fn(),
      interceptors: {
        response: {
          use: jest.fn((successFn, errorFn) => {
            // Store the error handler for testing
            (mockedAxios as any).errorHandler = errorFn;
            return { interceptors: { response: { use: jest.fn() } } };
          }),
        },
        request: {
          use: jest.fn(),
        },
      },
    };

    // Setup axios.create to return our mock instance
    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // Create a new client instance after setting up the mock
    client = new PerplexityClient(testApiKey);
  });

  describe('constructor', () => {
    it('should initialize with the provided API key', () => {
      expect(client.isConfigured()).toBe(true);
      expect(client.getName()).toBe('Perplexity');
    });

    it('should create an axios instance with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.perplexity.ai',
          headers: expect.objectContaining({
            Authorization: `Bearer ${testApiKey}`,
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  describe('isConfigured', () => {
    it('should return true when API key is provided', () => {
      expect(client.isConfigured()).toBe(true);
    });

    it('should return false when API key is empty', () => {
      const emptyClient = new PerplexityClient('');
      expect(emptyClient.isConfigured()).toBe(false);
    });
  });

  describe('search', () => {
    // We'll use the same mock setup as in the main beforeEach

    it('should throw an error if client is not configured', async () => {
      const emptyClient = new PerplexityClient('');
      await expect(emptyClient.search('test query')).rejects.toThrow(
        'Perplexity API client is not configured with a valid API key'
      );
    });

    it('should make a request with correct parameters', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockPerplexityResponse,
      });

      await client.search('Acme Corporation', {
        model: 'pplx-7b-online',
        maxTokens: 2048,
        temperature: 0.5,
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/query',
        expect.objectContaining({
          model: 'pplx-7b-online',
          query: 'Acme Corporation',
          max_tokens: 2048,
          temperature: 0.5,
        })
      );
    });

    it('should use default parameters when not provided', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockPerplexityResponse,
      });

      await client.search('Acme Corporation');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/query',
        expect.objectContaining({
          model: 'pplx-7b-online', // Default model
          query: 'Acme Corporation',
          max_tokens: 1024, // Default max tokens
          temperature: 0.7, // Default temperature
        })
      );
    });

    it('should process and return standardized search results with sources', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockPerplexityResponse,
      });

      const results = await client.search('Acme Corporation');

      expect(results).toHaveLength(mockPerplexityResponse.sources.length);
      expect(results[0]).toEqual(
        expect.objectContaining({
          title: mockPerplexityResponse.sources[0].title,
          url: mockPerplexityResponse.sources[0].url,
          snippet: mockPerplexityResponse.sources[0].snippet,
          source: 'Perplexity',
          publishedDate: mockPerplexityResponse.sources[0].published_date,
        })
      );
    });

    it('should create a single result when no sources are available but answer exists', async () => {
      const responseWithoutSources = {
        ...mockPerplexityResponse,
        sources: [],
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: responseWithoutSources,
      });

      const results = await client.search('Acme Corporation');

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(
        expect.objectContaining({
          title: expect.stringContaining('Perplexity Answer'),
          url: '',
          snippet: responseWithoutSources.answer,
          source: 'Perplexity',
        })
      );
    });

    it('should return empty array when no answer is found', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { id: 'pplx-123456789' }, // No answer property
      });

      const results = await client.search('Non-existent query');

      expect(results).toEqual([]);
    });

    it('should handle API errors correctly', async () => {
      const axiosError = {
        response: {
          status: 401,
          data: mockErrorResponses.perplexity.unauthorized,
        },
        message: 'Request failed with status code 401',
      };

      mockAxiosInstance.post.mockRejectedValueOnce(axiosError);

      await expect(client.search('test query')).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('should mark network errors as retryable', () => {
      // Create a test error
      const networkError = {
        code: 'ECONNABORTED',
        message: 'Connection aborted',
        isAxiosError: true,
      } as AxiosError;

      // Create a private method accessor to test isRetryableError directly
      const client = new PerplexityClient(testApiKey);
      const isRetryableError = (client as any).isRetryableError.bind(client);

      // Test the method directly
      expect(isRetryableError(networkError)).toBe(true);
    });

    it('should mark rate limit errors as retryable', () => {
      // Create a test error
      const rateLimitError = {
        response: {
          status: 429,
          data: mockErrorResponses.perplexity.rateLimited,
        },
        message: 'Request failed with status code 429',
        isAxiosError: true,
      } as AxiosError;

      // Create a private method accessor to test isRetryableError directly
      const client = new PerplexityClient(testApiKey);
      const isRetryableError = (client as any).isRetryableError.bind(client);

      // Test the method directly
      expect(isRetryableError(rateLimitError)).toBe(true);
    });

    it('should mark server errors as retryable', () => {
      // Create a test error
      const serverError = {
        response: {
          status: 500,
          data: mockErrorResponses.perplexity.serverError,
        },
        message: 'Request failed with status code 500',
        isAxiosError: true,
      } as AxiosError;

      // Create a private method accessor to test isRetryableError directly
      const client = new PerplexityClient(testApiKey);
      const isRetryableError = (client as any).isRetryableError.bind(client);

      // Test the method directly
      expect(isRetryableError(serverError)).toBe(true);
    });

    it('should mark client errors as non-retryable', () => {
      // Create a test error
      const clientError = {
        response: {
          status: 400,
          data: { error: 'Bad request' },
        },
        message: 'Request failed with status code 400',
        isAxiosError: true,
      } as AxiosError;

      // Create a private method accessor to test isRetryableError directly
      const client = new PerplexityClient(testApiKey);
      const isRetryableError = (client as any).isRetryableError.bind(client);

      // Test the method directly
      expect(isRetryableError(clientError)).toBe(false);
    });
  });
});
