import {
  WriterAgent,
  CoverLetterTone,
  CoverLetterOptions,
} from '../../../src/agents/writer/WriterAgent';
import {
  LLMClient,
  LLMGenerationResult,
} from '../../../src/agents/writer/interfaces/LLMClient';
import { LLMClientFactory } from '../../../src/agents/writer/clients/LLMClientFactory';
import { mockCoverLetterResponse } from '../../../src/agents/writer/clients/__mocks__/mockResponses';

// Mock the LLMClientFactory
jest.mock('../../../src/agents/writer/clients/LLMClientFactory');

// Create a mock LLM client
const createMockLLMClient = (generateFn?: jest.Mock): LLMClient => {
  return {
    generate: generateFn || jest.fn(),
    isConfigured: jest.fn().mockReturnValue(true),
    getName: jest.fn().mockReturnValue('MockLLM'),
    getTokenUsage: jest.fn().mockReturnValue({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      totalRequests: 1,
      failedRequests: 0,
    }),
  } as unknown as LLMClient;
};

describe('WriterAgent', () => {
  // Sample cover letter options for testing
  const sampleOptions: CoverLetterOptions = {
    candidateName: 'John Smith',
    jobTitle: 'Software Engineer',
    companyName: 'Acme Corporation',
    companyInfo: 'A leading technology company',
    companyValues: 'Innovation, Collaboration, Excellence',
    jobDescription: 'Developing software applications',
    candidateSkills: 'JavaScript, TypeScript, React',
    candidateExperience: '5 years of software development',
    candidateEducation: 'Bachelor of Computer Science',
    tone: CoverLetterTone.PROFESSIONAL,
  };

  // Mock successful generation result
  const mockGenerationResult: LLMGenerationResult = {
    text: mockCoverLetterResponse.choices[0].message.content,
    usage: {
      promptTokens: 1024,
      completionTokens: 512,
      totalTokens: 1536,
    },
    model: 'gpt-4o',
    finishReason: 'stop',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock LLMClientFactory.getInstance
    const mockFactory = {
      getBestAvailableClient: jest.fn().mockReturnValue(createMockLLMClient()),
    };
    (LLMClientFactory.getInstance as jest.Mock).mockReturnValue(mockFactory);
  });

  describe('constructor', () => {
    it('should use the provided LLM client if given', () => {
      const mockClient = createMockLLMClient();
      const agent = new WriterAgent(mockClient);

      expect(agent.getLLMClientName()).toBe('MockLLM');
      expect(LLMClientFactory.getInstance).not.toHaveBeenCalled();
    });

    it('should get the best available client if none is provided', () => {
      const agent = new WriterAgent();

      expect(LLMClientFactory.getInstance).toHaveBeenCalled();
      expect(agent.getLLMClientName()).toBe('MockLLM');
    });

    it('should use the provided default model', () => {
      const mockClient = createMockLLMClient();
      const agent = new WriterAgent(mockClient, 'gpt-3.5-turbo');

      // We can't directly test the defaultModel as it's private, but we'll test it
      // through the generateCoverLetter method later
    });
  });

  describe('generateCoverLetter', () => {
    it('should generate a cover letter successfully', async () => {
      // Create a mock generate function that returns a successful result
      const generateMock = jest.fn().mockResolvedValue(mockGenerationResult);
      const mockClient = createMockLLMClient(generateMock);

      const agent = new WriterAgent(mockClient);
      const result = await agent.generateCoverLetter(sampleOptions);

      // Verify the result
      expect(result.coverLetter).toBe(mockGenerationResult.text);
      expect(result.metadata.model).toBe(mockGenerationResult.model);
      expect(result.metadata.tokenUsage).toEqual(mockGenerationResult.usage);
      expect(result.metadata.generationTime).toBeGreaterThanOrEqual(0);

      // Verify the generate function was called with the right parameters
      expect(generateMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          model: 'gpt-4o',
          temperature: 0.7,
        })
      );

      // Verify the prompt contains all the required information
      const prompt = generateMock.mock.calls[0][0];
      expect(prompt).toContain(sampleOptions.candidateName);
      expect(prompt).toContain(sampleOptions.jobTitle);
      expect(prompt).toContain(sampleOptions.companyName);
      expect(prompt).toContain(sampleOptions.companyInfo);
      expect(prompt).toContain(sampleOptions.companyValues);
      expect(prompt).toContain(sampleOptions.jobDescription);
      expect(prompt).toContain(sampleOptions.candidateSkills);
      expect(prompt).toContain(sampleOptions.candidateExperience);
      expect(prompt).toContain(sampleOptions.candidateEducation);
      expect(prompt).toContain(sampleOptions.tone);
    });

    it('should handle custom instructions', async () => {
      // Create a mock generate function that returns a successful result
      const generateMock = jest.fn().mockResolvedValue(mockGenerationResult);
      const mockClient = createMockLLMClient(generateMock);

      const agent = new WriterAgent(mockClient);
      const optionsWithCustomInstructions = {
        ...sampleOptions,
        customInstructions:
          'Make it more concise and focus on technical skills',
      };

      await agent.generateCoverLetter(optionsWithCustomInstructions);

      // Verify the prompt contains the custom instructions
      const prompt = generateMock.mock.calls[0][0];
      expect(prompt).toContain('Additional Instructions');
      expect(prompt).toContain(
        optionsWithCustomInstructions.customInstructions
      );
    });

    it('should handle maxLength option', async () => {
      // Create a mock generate function that returns a successful result
      const generateMock = jest.fn().mockResolvedValue(mockGenerationResult);
      const mockClient = createMockLLMClient(generateMock);

      const agent = new WriterAgent(mockClient);
      const optionsWithMaxLength = {
        ...sampleOptions,
        maxLength: 500,
      };

      await agent.generateCoverLetter(optionsWithMaxLength);

      // Verify the maxTokens parameter was set correctly
      const options = generateMock.mock.calls[0][1];
      expect(options.maxTokens).toBe(750); // 500 * 1.5
    });

    it('should handle errors during generation', async () => {
      // Create a mock generate function that throws an error
      const errorMessage = 'API error';
      const generateMock = jest.fn().mockRejectedValue(new Error(errorMessage));
      const mockClient = createMockLLMClient(generateMock);

      const agent = new WriterAgent(mockClient);

      // Expect the generateCoverLetter method to throw the same error
      await expect(agent.generateCoverLetter(sampleOptions)).rejects.toThrow(
        errorMessage
      );
    });
  });

  describe('validateOptions', () => {
    it('should throw an error for missing required fields', async () => {
      const agent = new WriterAgent();

      // Test each required field
      const requiredFields: (keyof CoverLetterOptions)[] = [
        'candidateName',
        'jobTitle',
        'companyName',
        'companyInfo',
        'jobDescription',
        'candidateSkills',
        'candidateExperience',
        'candidateEducation',
      ];

      for (const field of requiredFields) {
        const invalidOptions = { ...sampleOptions };
        // @ts-ignore: Dynamically setting field to undefined
        invalidOptions[field] = '';

        await expect(agent.generateCoverLetter(invalidOptions)).rejects.toThrow(
          `Missing required field: ${field}`
        );
      }
    });

    it('should use PROFESSIONAL tone if none is provided', async () => {
      // Create a mock generate function
      const generateMock = jest.fn().mockResolvedValue(mockGenerationResult);
      const mockClient = createMockLLMClient(generateMock);

      const agent = new WriterAgent(mockClient);

      // Create options without a tone
      const optionsWithoutTone = { ...sampleOptions };
      // @ts-ignore: Setting tone to undefined for testing
      optionsWithoutTone.tone = undefined;

      await agent.generateCoverLetter(optionsWithoutTone);

      // Verify the prompt contains the PROFESSIONAL tone
      const prompt = generateMock.mock.calls[0][0];
      expect(prompt).toContain('PROFESSIONAL');
    });

    it('should throw an error for invalid tone', async () => {
      const agent = new WriterAgent();

      // Create options with an invalid tone
      const optionsWithInvalidTone = { ...sampleOptions };
      // @ts-ignore: Setting an invalid tone for testing
      optionsWithInvalidTone.tone = 'INVALID_TONE';

      await expect(
        agent.generateCoverLetter(optionsWithInvalidTone)
      ).rejects.toThrow('Invalid tone: INVALID_TONE');
    });
  });

  describe('utility methods', () => {
    it('should return token usage statistics', () => {
      const mockClient = createMockLLMClient();
      const agent = new WriterAgent(mockClient);

      const usage = agent.getTokenUsage();

      expect(usage).toEqual({
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        totalRequests: 1,
        failedRequests: 0,
      });
      expect(mockClient.getTokenUsage).toHaveBeenCalled();
    });

    it('should return the LLM client name', () => {
      const mockClient = createMockLLMClient();
      const agent = new WriterAgent(mockClient);

      const name = agent.getLLMClientName();

      expect(name).toBe('MockLLM');
      expect(mockClient.getName).toHaveBeenCalled();
    });
  });
});
