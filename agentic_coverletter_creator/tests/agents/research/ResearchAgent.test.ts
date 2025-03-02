import {
  ResearchAgent,
  CompanyResearchResult,
} from '../../../src/agents/research/ResearchAgent';
import { ApiClientFactory } from '../../../src/agents/research/clients/ApiClientFactory';
import {
  ApiClient,
  SearchResult,
} from '../../../src/agents/research/interfaces/ApiClient';
import {
  mockBingSearchResponse,
  mockPerplexityResponse,
} from '../../../src/agents/research/clients/__mocks__/mockResponses';

// Mock the ApiClientFactory
jest.mock('../../../src/agents/research/clients/ApiClientFactory');

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('ResearchAgent', () => {
  let researchAgent: ResearchAgent;
  let mockApiClientFactory: jest.Mocked<ApiClientFactory>;
  let mockApiClient: jest.Mocked<ApiClient>;

  beforeEach(() => {
    // Create mock search results based on the mock responses
    const mockSearchResults: SearchResult[] = [
      {
        title: 'Acme Corporation - Official Website',
        url: 'https://www.acmecorp.example.com',
        snippet:
          'Acme Corporation is a leading provider of innovative solutions for businesses. Founded in 1990, we have been delivering quality products and services to customers worldwide.',
        source: 'Bing',
        publishedDate: '2025-02-28T10:15:00.0000000Z',
      },
      {
        title: 'About Acme Corporation | Company History and Values',
        url: 'https://www.acmecorp.example.com/about',
        snippet:
          "Learn about Acme Corporation's history, mission, and values. Our company was founded with the vision of creating sustainable solutions for modern businesses.",
        source: 'Bing',
        publishedDate: '2025-02-27T14:22:00.0000000Z',
      },
    ];

    // Create a mock API client
    mockApiClient = {
      search: jest.fn().mockResolvedValue(mockSearchResults),
      isConfigured: jest.fn().mockReturnValue(true),
      getName: jest.fn().mockReturnValue('MockApiClient'),
    };

    // Create a mock API client factory
    mockApiClientFactory = {
      getInstance: jest.fn().mockReturnThis(),
      registerClient: jest.fn(),
      getClient: jest.fn().mockReturnValue(mockApiClient),
      getAllClients: jest.fn().mockReturnValue([mockApiClient]),
      getConfiguredClients: jest.fn().mockReturnValue([mockApiClient]),
      hasConfiguredClient: jest.fn().mockReturnValue(true),
      getBestAvailableClient: jest.fn().mockReturnValue(mockApiClient),
      initializeFromEnvironment: jest.fn(),
    } as unknown as jest.Mocked<ApiClientFactory>;

    // Mock the static getInstance method
    (ApiClientFactory.getInstance as jest.Mock).mockReturnValue(
      mockApiClientFactory
    );

    // Create a new ResearchAgent instance with the mock factory
    researchAgent = new ResearchAgent(mockApiClientFactory);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('researchCompany', () => {
    it('should perform research on a company and return results', async () => {
      // Arrange
      const companyName = 'Acme Corporation';
      const jobDescription =
        'Software Engineer position at Acme Corporation...';

      // Act
      const result = await researchAgent.researchCompany(
        companyName,
        jobDescription
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.companyName).toBe(companyName);
      expect(mockApiClientFactory.getBestAvailableClient).toHaveBeenCalled();
      expect(mockApiClient.search).toHaveBeenCalledTimes(5); // 5 different searches
    });

    it('should use cached results if available', async () => {
      // Arrange
      const companyName = 'Acme Corporation';
      const jobDescription =
        'Software Engineer position at Acme Corporation...';

      // First call to populate the cache
      await researchAgent.researchCompany(companyName, jobDescription);

      // Reset mocks to verify they aren't called again
      jest.clearAllMocks();

      // Act
      const result = await researchAgent.researchCompany(
        companyName,
        jobDescription
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.companyName).toBe(companyName);
      expect(
        mockApiClientFactory.getBestAvailableClient
      ).not.toHaveBeenCalled();
      expect(mockApiClient.search).not.toHaveBeenCalled();
    });

    it('should throw an error if no API clients are available', async () => {
      // Arrange
      const companyName = 'Acme Corporation';
      const jobDescription =
        'Software Engineer position at Acme Corporation...';

      // Mock the getBestAvailableClient to return undefined
      mockApiClientFactory.getBestAvailableClient.mockReturnValueOnce(
        undefined
      );

      // Act & Assert
      await expect(
        researchAgent.researchCompany(companyName, jobDescription)
      ).rejects.toThrow('No configured API clients available for research');
    });

    it('should not use cache if cacheResults is false', async () => {
      // Arrange
      const companyName = 'Acme Corporation';
      const jobDescription =
        'Software Engineer position at Acme Corporation...';

      // First call to populate the cache
      await researchAgent.researchCompany(companyName, jobDescription);

      // Reset mocks to verify they are called again
      jest.clearAllMocks();

      // Act
      const result = await researchAgent.researchCompany(
        companyName,
        jobDescription,
        {
          cacheResults: false,
        }
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.companyName).toBe(companyName);
      expect(mockApiClientFactory.getBestAvailableClient).toHaveBeenCalled();
      expect(mockApiClient.search).toHaveBeenCalledTimes(5); // 5 different searches
    });
  });

  describe('cache management', () => {
    it('should clear the cache when clearCache is called', async () => {
      // Arrange
      const companyName = 'Acme Corporation';
      const jobDescription =
        'Software Engineer position at Acme Corporation...';

      // First call to populate the cache
      await researchAgent.researchCompany(companyName, jobDescription);

      // Act
      researchAgent.clearCache();

      // Reset mocks to verify they are called again after cache is cleared
      jest.clearAllMocks();

      // Call again to verify cache was cleared
      await researchAgent.researchCompany(companyName, jobDescription);

      // Assert
      expect(mockApiClientFactory.getBestAvailableClient).toHaveBeenCalled();
      expect(mockApiClient.search).toHaveBeenCalledTimes(5); // 5 different searches
    });

    it('should update the cache TTL when setCacheTTL is called', async () => {
      // Arrange
      const companyName = 'Acme Corporation';
      const jobDescription =
        'Software Engineer position at Acme Corporation...';
      const newTTL = 1; // 1 millisecond for testing

      // First call to populate the cache
      await researchAgent.researchCompany(companyName, jobDescription);

      // Act
      researchAgent.setCacheTTL(newTTL);

      // Wait for the cache to expire
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Reset mocks to verify they are called again after cache expires
      jest.clearAllMocks();

      // Call again to verify cache was expired
      await researchAgent.researchCompany(companyName, jobDescription);

      // Assert
      expect(mockApiClientFactory.getBestAvailableClient).toHaveBeenCalled();
      expect(mockApiClient.search).toHaveBeenCalledTimes(5); // 5 different searches
    });
  });

  describe('extractKeywords', () => {
    it('should extract keywords from text based on trigger words', () => {
      // Arrange
      const text =
        'The candidate should have experience with JavaScript and React. ' +
        'The candidate will be responsible for developing web applications. ' +
        'A bachelor degree in Computer Science is required.';

      const triggerWords = ['experience', 'responsible', 'degree'];

      // Use a private method accessor to test the private method
      const extractKeywords = (researchAgent as any).extractKeywords.bind(
        researchAgent
      );

      // Act
      const keywords = extractKeywords(text, triggerWords);

      // Assert
      expect(keywords).toContain('with JavaScript and React');
      expect(keywords).toContain('for developing web applications');
      expect(keywords).toContain('in Computer Science is');
    });
  });
});
