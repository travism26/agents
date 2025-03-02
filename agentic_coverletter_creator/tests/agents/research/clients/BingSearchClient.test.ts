import axios, { AxiosError } from 'axios';
import { BingSearchClient } from '../../../../src/agents/research/clients/BingSearchClient';
import { ApiError } from '../../../../src/agents/research/interfaces/ApiClient';
import {
  mockBingSearchResponse,
  mockErrorResponses,
} from '../../../../src/agents/research/clients/__mocks__/mockResponses';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('BingSearchClient', () => {
  let client: BingSearchClient;
  const testApiKey = 'test-api-key';

  // Mock axios instance that will be returned by axios.create
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
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
    client = new BingSearchClient(testApiKey);
  });

  describe('constructor', () => {
    it('should initialize with the provided API key', () => {
      expect(client.isConfigured()).toBe(true);
      expect(client.getName()).toBe('BingSearch');
    });

    it('should create an axios instance with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.bing.microsoft.com/v7.0',
          headers: expect.objectContaining({
            'Ocp-Apim-Subscription-Key': testApiKey,
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
      const emptyClient = new BingSearchClient('');
      expect(emptyClient.isConfigured()).toBe(false);
    });
  });

  describe('search', () => {
    // We'll use the same mock setup as in the main beforeEach

    it('should throw an error if client is not configured', async () => {
      const emptyClient = new BingSearchClient('');
      await expect(emptyClient.search('test query')).rejects.toThrow(
        'Bing Search API client is not configured with a valid API key'
      );
    });

    it('should make a request with correct parameters', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockBingSearchResponse,
      });

      await client.search('Acme Corporation', { count: 5 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/search',
        expect.objectContaining({
          params: expect.objectContaining({
            q: 'Acme Corporation',
            count: 5,
          }),
        })
      );
    });

    it('should process and return standardized search results', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockBingSearchResponse,
      });

      const results = await client.search('Acme Corporation');

      expect(results).toHaveLength(
        mockBingSearchResponse.webPages.value.length
      );
      expect(results[0]).toEqual(
        expect.objectContaining({
          title: mockBingSearchResponse.webPages.value[0].name,
          url: mockBingSearchResponse.webPages.value[0].url,
          snippet: mockBingSearchResponse.webPages.value[0].snippet,
          source: 'Bing',
        })
      );
    });

    it('should return empty array when no results are found', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { _type: 'SearchResponse' }, // No webPages property
      });

      const results = await client.search('Non-existent query');

      expect(results).toEqual([]);
    });

    it('should handle API errors correctly', async () => {
      const axiosError = {
        response: {
          status: 401,
          data: mockErrorResponses.bing.unauthorized.error,
        },
        message: 'Request failed with status code 401',
      };

      mockAxiosInstance.get.mockRejectedValueOnce(axiosError);

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
      const client = new BingSearchClient(testApiKey);
      const isRetryableError = (client as any).isRetryableError.bind(client);

      // Test the method directly
      expect(isRetryableError(networkError)).toBe(true);
    });

    it('should mark rate limit errors as retryable', () => {
      // Create a test error
      const rateLimitError = {
        response: {
          status: 429,
          data: mockErrorResponses.bing.rateLimited.error,
        },
        message: 'Request failed with status code 429',
        isAxiosError: true,
      } as AxiosError;

      // Create a private method accessor to test isRetryableError directly
      const client = new BingSearchClient(testApiKey);
      const isRetryableError = (client as any).isRetryableError.bind(client);

      // Test the method directly
      expect(isRetryableError(rateLimitError)).toBe(true);
    });

    it('should mark server errors as retryable', () => {
      // Create a test error
      const serverError = {
        response: {
          status: 500,
          data: mockErrorResponses.bing.serverError.error,
        },
        message: 'Request failed with status code 500',
        isAxiosError: true,
      } as AxiosError;

      // Create a private method accessor to test isRetryableError directly
      const client = new BingSearchClient(testApiKey);
      const isRetryableError = (client as any).isRetryableError.bind(client);

      // Test the method directly
      expect(isRetryableError(serverError)).toBe(true);
    });

    it('should mark client errors as non-retryable', () => {
      // Create a test error
      const clientError = {
        response: {
          status: 400,
          data: { error: { message: 'Bad request' } },
        },
        message: 'Request failed with status code 400',
        isAxiosError: true,
      } as AxiosError;

      // Create a private method accessor to test isRetryableError directly
      const client = new BingSearchClient(testApiKey);
      const isRetryableError = (client as any).isRetryableError.bind(client);

      // Test the method directly
      expect(isRetryableError(clientError)).toBe(false);
    });
  });
});
