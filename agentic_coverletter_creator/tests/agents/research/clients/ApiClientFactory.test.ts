import { ApiClientFactory } from '../../../../src/agents/research/clients/ApiClientFactory';
import { BingSearchClient } from '../../../../src/agents/research/clients/BingSearchClient';
import { PerplexityClient } from '../../../../src/agents/research/clients/PerplexityClient';
import { ApiClient } from '../../../../src/agents/research/interfaces/ApiClient';

// Mock the environment variables
const originalEnv = process.env;

describe('ApiClientFactory', () => {
  beforeEach(() => {
    // Reset the module registry before each test
    jest.resetModules();

    // Mock process.env
    process.env = { ...originalEnv };

    // Clear the singleton instance between tests
    // @ts-ignore: Accessing private static property for testing
    ApiClientFactory.instance = undefined;
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = ApiClientFactory.getInstance();
      const instance2 = ApiClientFactory.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should initialize clients from environment variables', () => {
      // Set environment variables
      process.env.BING_API_KEY = 'test-bing-key';
      process.env.PERPLEXITY_API_KEY = 'test-perplexity-key';

      const factory = ApiClientFactory.getInstance();

      expect(factory.hasConfiguredClient('bing')).toBe(true);
      expect(factory.hasConfiguredClient('perplexity')).toBe(true);
    });
  });

  describe('registerClient', () => {
    it('should register a new client', () => {
      const factory = ApiClientFactory.getInstance();
      const mockClient = {
        search: jest.fn(),
        isConfigured: jest.fn().mockReturnValue(true),
        getName: jest.fn().mockReturnValue('MockClient'),
      } as unknown as ApiClient;

      factory.registerClient('mock', mockClient);

      expect(factory.getClient('mock')).toBe(mockClient);
    });

    it('should convert client name to lowercase', () => {
      const factory = ApiClientFactory.getInstance();
      const mockClient = {
        search: jest.fn(),
        isConfigured: jest.fn().mockReturnValue(true),
        getName: jest.fn().mockReturnValue('MockClient'),
      } as unknown as ApiClient;

      factory.registerClient('MOCK', mockClient);

      expect(factory.getClient('mock')).toBe(mockClient);
      expect(factory.getClient('MOCK')).toBe(mockClient);
      expect(factory.getClient('Mock')).toBe(mockClient);
    });
  });

  describe('getClient', () => {
    it('should return undefined for non-existent client', () => {
      const factory = ApiClientFactory.getInstance();

      expect(factory.getClient('non-existent')).toBeUndefined();
    });

    it('should return the registered client', () => {
      const factory = ApiClientFactory.getInstance();
      const bingClient = new BingSearchClient('test-key');

      factory.registerClient('bing', bingClient);

      expect(factory.getClient('bing')).toBe(bingClient);
    });
  });

  describe('getAllClients', () => {
    it('should return all registered clients', () => {
      const factory = ApiClientFactory.getInstance();
      const bingClient = new BingSearchClient('test-key');
      const perplexityClient = new PerplexityClient('test-key');

      factory.registerClient('bing', bingClient);
      factory.registerClient('perplexity', perplexityClient);

      const allClients = factory.getAllClients();

      expect(allClients).toHaveLength(2);
      expect(allClients).toContain(bingClient);
      expect(allClients).toContain(perplexityClient);
    });

    it('should return empty array when no clients are registered', () => {
      // Create a new instance with no environment variables
      process.env.BING_API_KEY = undefined;
      process.env.PERPLEXITY_API_KEY = undefined;

      // @ts-ignore: Accessing private static property for testing
      ApiClientFactory.instance = undefined;

      const factory = ApiClientFactory.getInstance();

      expect(factory.getAllClients()).toEqual([]);
    });
  });

  describe('getConfiguredClients', () => {
    it('should return only configured clients', () => {
      const factory = ApiClientFactory.getInstance();

      const configuredClient = {
        search: jest.fn(),
        isConfigured: jest.fn().mockReturnValue(true),
        getName: jest.fn().mockReturnValue('Configured'),
      } as unknown as ApiClient;

      const unconfiguredClient = {
        search: jest.fn(),
        isConfigured: jest.fn().mockReturnValue(false),
        getName: jest.fn().mockReturnValue('Unconfigured'),
      } as unknown as ApiClient;

      factory.registerClient('configured', configuredClient);
      factory.registerClient('unconfigured', unconfiguredClient);

      const configuredClients = factory.getConfiguredClients();

      expect(configuredClients).toHaveLength(1);
      expect(configuredClients).toContain(configuredClient);
      expect(configuredClients).not.toContain(unconfiguredClient);
    });
  });

  describe('hasConfiguredClient', () => {
    it('should return true for configured clients', () => {
      const factory = ApiClientFactory.getInstance();

      const configuredClient = {
        search: jest.fn(),
        isConfigured: jest.fn().mockReturnValue(true),
        getName: jest.fn().mockReturnValue('Configured'),
      } as unknown as ApiClient;

      factory.registerClient('configured', configuredClient);

      expect(factory.hasConfiguredClient('configured')).toBe(true);
    });

    it('should return false for unconfigured clients', () => {
      const factory = ApiClientFactory.getInstance();

      const unconfiguredClient = {
        search: jest.fn(),
        isConfigured: jest.fn().mockReturnValue(false),
        getName: jest.fn().mockReturnValue('Unconfigured'),
      } as unknown as ApiClient;

      factory.registerClient('unconfigured', unconfiguredClient);

      expect(factory.hasConfiguredClient('unconfigured')).toBe(false);
    });

    it('should return false for non-existent clients', () => {
      const factory = ApiClientFactory.getInstance();

      expect(factory.hasConfiguredClient('non-existent')).toBe(false);
    });
  });

  describe('getBestAvailableClient', () => {
    it('should return the first preferred client that is configured', () => {
      const factory = ApiClientFactory.getInstance();

      const bingClient = {
        search: jest.fn(),
        isConfigured: jest.fn().mockReturnValue(true),
        getName: jest.fn().mockReturnValue('Bing'),
      } as unknown as ApiClient;

      const perplexityClient = {
        search: jest.fn(),
        isConfigured: jest.fn().mockReturnValue(true),
        getName: jest.fn().mockReturnValue('Perplexity'),
      } as unknown as ApiClient;

      factory.registerClient('bing', bingClient);
      factory.registerClient('perplexity', perplexityClient);

      // Default preference is ['perplexity', 'bing']
      expect(factory.getBestAvailableClient()).toBe(perplexityClient);

      // Custom preference
      expect(factory.getBestAvailableClient(['bing', 'perplexity'])).toBe(
        bingClient
      );
    });

    it('should skip unconfigured clients', () => {
      const factory = ApiClientFactory.getInstance();

      const bingClient = {
        search: jest.fn(),
        isConfigured: jest.fn().mockReturnValue(true),
        getName: jest.fn().mockReturnValue('Bing'),
      } as unknown as ApiClient;

      const perplexityClient = {
        search: jest.fn(),
        isConfigured: jest.fn().mockReturnValue(false), // Not configured
        getName: jest.fn().mockReturnValue('Perplexity'),
      } as unknown as ApiClient;

      factory.registerClient('bing', bingClient);
      factory.registerClient('perplexity', perplexityClient);

      // Default preference is ['perplexity', 'bing'], but perplexity is not configured
      expect(factory.getBestAvailableClient()).toBe(bingClient);
    });

    it('should return any configured client if no preferred clients are available', () => {
      const factory = ApiClientFactory.getInstance();

      const otherClient = {
        search: jest.fn(),
        isConfigured: jest.fn().mockReturnValue(true),
        getName: jest.fn().mockReturnValue('Other'),
      } as unknown as ApiClient;

      factory.registerClient('other', otherClient);

      // Preference is ['perplexity', 'bing'], but only 'other' is available
      expect(factory.getBestAvailableClient()).toBe(otherClient);
    });

    it('should return undefined if no clients are configured', () => {
      const factory = ApiClientFactory.getInstance();

      const unconfiguredClient = {
        search: jest.fn(),
        isConfigured: jest.fn().mockReturnValue(false),
        getName: jest.fn().mockReturnValue('Unconfigured'),
      } as unknown as ApiClient;

      factory.registerClient('unconfigured', unconfiguredClient);

      expect(factory.getBestAvailableClient()).toBeUndefined();
    });
  });
});
