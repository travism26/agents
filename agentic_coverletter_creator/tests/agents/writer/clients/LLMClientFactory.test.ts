import { LLMClientFactory } from '../../../../src/agents/writer/clients/LLMClientFactory';
import { OpenAIClient } from '../../../../src/agents/writer/clients/OpenAIClient';
import { LLMClient } from '../../../../src/agents/writer/interfaces/LLMClient';

// Mock the OpenAIClient
jest.mock('../../../../src/agents/writer/clients/OpenAIClient');
const MockedOpenAIClient = OpenAIClient as jest.MockedClass<
  typeof OpenAIClient
>;

describe('LLMClientFactory', () => {
  // Store the original environment
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Reset the environment
    process.env = { ...originalEnv };

    // Reset the singleton instance
    // @ts-ignore: Accessing private static property for testing
    LLMClientFactory.instance = undefined;

    // Mock OpenAIClient implementation
    MockedOpenAIClient.mockImplementation((apiKey) => {
      return {
        isConfigured: () => !!apiKey && apiKey.length > 0,
        getName: () => 'OpenAI',
        generate: jest.fn(),
        getTokenUsage: () => ({
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
          totalRequests: 10,
          failedRequests: 2,
        }),
      } as unknown as OpenAIClient;
    });
  });

  afterEach(() => {
    // Restore the environment
    process.env = originalEnv;
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = LLMClientFactory.getInstance();
      const instance2 = LLMClientFactory.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('initializeFromEnvironment', () => {
    it('should initialize OpenAI client if API key is available', () => {
      // Set environment variable
      process.env.OPENAI_API_KEY = 'test-openai-key';

      // Get instance (which will initialize from environment)
      const factory = LLMClientFactory.getInstance();

      // Verify OpenAI client was created
      expect(MockedOpenAIClient).toHaveBeenCalledWith('test-openai-key');

      // Verify client was registered
      expect(factory.hasConfiguredClient('openai')).toBe(true);
    });

    it('should not initialize OpenAI client if API key is not available', () => {
      // Ensure environment variable is not set
      delete process.env.OPENAI_API_KEY;

      // Get instance
      const factory = LLMClientFactory.getInstance();

      // Verify OpenAI client was not created
      expect(MockedOpenAIClient).not.toHaveBeenCalled();

      // Verify client was not registered
      expect(factory.hasConfiguredClient('openai')).toBe(false);
    });
  });

  describe('registerClient', () => {
    it('should register a client', () => {
      const factory = LLMClientFactory.getInstance();
      const client = new MockedOpenAIClient(
        'test-key'
      ) as unknown as OpenAIClient;

      factory.registerClient('test-client', client);

      expect(factory.getClient('test-client')).toBe(client);
    });

    it('should convert client name to lowercase', () => {
      const factory = LLMClientFactory.getInstance();
      const client = new MockedOpenAIClient(
        'test-key'
      ) as unknown as OpenAIClient;

      factory.registerClient('TEST-CLIENT', client);

      expect(factory.getClient('test-client')).toBe(client);
    });
  });

  describe('getClient', () => {
    it('should return the client if it exists', () => {
      const factory = LLMClientFactory.getInstance();
      const client = new MockedOpenAIClient(
        'test-key'
      ) as unknown as OpenAIClient;

      factory.registerClient('test-client', client);

      expect(factory.getClient('test-client')).toBe(client);
    });

    it('should return undefined if the client does not exist', () => {
      const factory = LLMClientFactory.getInstance();

      expect(factory.getClient('non-existent')).toBeUndefined();
    });

    it('should be case-insensitive', () => {
      const factory = LLMClientFactory.getInstance();
      const client = new MockedOpenAIClient(
        'test-key'
      ) as unknown as OpenAIClient;

      factory.registerClient('test-client', client);

      expect(factory.getClient('TEST-CLIENT')).toBe(client);
    });
  });

  describe('getAllClients', () => {
    it('should return all registered clients', () => {
      const factory = LLMClientFactory.getInstance();
      const client1 = new MockedOpenAIClient('key1') as unknown as OpenAIClient;
      const client2 = new MockedOpenAIClient('key2') as unknown as OpenAIClient;

      factory.registerClient('client1', client1);
      factory.registerClient('client2', client2);

      const allClients = factory.getAllClients();

      expect(allClients).toHaveLength(2);
      expect(allClients).toContain(client1);
      expect(allClients).toContain(client2);
    });

    it('should return an empty array if no clients are registered', () => {
      const factory = LLMClientFactory.getInstance();

      expect(factory.getAllClients()).toEqual([]);
    });
  });

  describe('getConfiguredClients', () => {
    it('should return only configured clients', () => {
      const factory = LLMClientFactory.getInstance();
      const configuredClient = new MockedOpenAIClient(
        'valid-key'
      ) as unknown as OpenAIClient;
      const unconfiguredClient = new MockedOpenAIClient(
        ''
      ) as unknown as OpenAIClient;

      factory.registerClient('configured', configuredClient);
      factory.registerClient('unconfigured', unconfiguredClient);

      const configuredClients = factory.getConfiguredClients();

      expect(configuredClients).toHaveLength(1);
      expect(configuredClients).toContain(configuredClient);
      expect(configuredClients).not.toContain(unconfiguredClient);
    });
  });

  describe('hasConfiguredClient', () => {
    it('should return true if the client exists and is configured', () => {
      const factory = LLMClientFactory.getInstance();
      const client = new MockedOpenAIClient(
        'valid-key'
      ) as unknown as OpenAIClient;

      factory.registerClient('test-client', client);

      expect(factory.hasConfiguredClient('test-client')).toBe(true);
    });

    it('should return false if the client exists but is not configured', () => {
      const factory = LLMClientFactory.getInstance();
      const client = new MockedOpenAIClient('') as unknown as OpenAIClient;

      factory.registerClient('test-client', client);

      expect(factory.hasConfiguredClient('test-client')).toBe(false);
    });

    it('should return false if the client does not exist', () => {
      const factory = LLMClientFactory.getInstance();

      expect(factory.hasConfiguredClient('non-existent')).toBe(false);
    });
  });

  describe('getBestAvailableClient', () => {
    it('should return the first preferred client that is configured', () => {
      const factory = LLMClientFactory.getInstance();
      const client1 = new MockedOpenAIClient('key1') as unknown as OpenAIClient;
      const client2 = new MockedOpenAIClient('key2') as unknown as OpenAIClient;

      factory.registerClient('client1', client1);
      factory.registerClient('client2', client2);

      expect(factory.getBestAvailableClient(['client2', 'client1'])).toBe(
        client2
      );
    });

    it('should skip preferred clients that are not configured', () => {
      const factory = LLMClientFactory.getInstance();
      const client1 = new MockedOpenAIClient('key1') as unknown as OpenAIClient;
      const client2 = new MockedOpenAIClient('') as unknown as OpenAIClient;

      factory.registerClient('client1', client1);
      factory.registerClient('client2', client2);

      expect(factory.getBestAvailableClient(['client2', 'client1'])).toBe(
        client1
      );
    });

    it('should return any configured client if no preferred clients are available', () => {
      const factory = LLMClientFactory.getInstance();
      const client = new MockedOpenAIClient('key') as unknown as OpenAIClient;

      factory.registerClient('client', client);

      expect(factory.getBestAvailableClient(['non-existent'])).toBe(client);
    });

    it('should return undefined if no clients are configured', () => {
      const factory = LLMClientFactory.getInstance();

      expect(factory.getBestAvailableClient()).toBeUndefined();
    });

    it('should use default preferences if none are provided', () => {
      const factory = LLMClientFactory.getInstance();
      const openaiClient = new MockedOpenAIClient(
        'key'
      ) as unknown as OpenAIClient;

      factory.registerClient('openai', openaiClient);

      expect(factory.getBestAvailableClient()).toBe(openaiClient);
    });
  });

  describe('getTotalTokenUsage', () => {
    it('should aggregate token usage across all clients', () => {
      const factory = LLMClientFactory.getInstance();

      // Create mock clients with different token usage
      const client1 = {
        isConfigured: () => true,
        getName: () => 'Client1',
        generate: jest.fn(),
        getTokenUsage: () => ({
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
          totalRequests: 10,
          failedRequests: 2,
        }),
      } as unknown as LLMClient;

      const client2 = {
        isConfigured: () => true,
        getName: () => 'Client2',
        generate: jest.fn(),
        getTokenUsage: () => ({
          promptTokens: 200,
          completionTokens: 100,
          totalTokens: 300,
          totalRequests: 20,
          failedRequests: 3,
        }),
      } as unknown as LLMClient;

      factory.registerClient('client1', client1);
      factory.registerClient('client2', client2);

      const totalUsage = factory.getTotalTokenUsage();

      expect(totalUsage).toEqual({
        promptTokens: 300,
        completionTokens: 150,
        totalTokens: 450,
        totalRequests: 30,
        failedRequests: 5,
      });
    });

    it('should return zero usage if no clients are registered', () => {
      const factory = LLMClientFactory.getInstance();

      expect(factory.getTotalTokenUsage()).toEqual({
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        totalRequests: 0,
        failedRequests: 0,
      });
    });
  });
});
