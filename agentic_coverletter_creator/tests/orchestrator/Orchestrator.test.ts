import { Orchestrator } from '../../src/orchestrator/Orchestrator';
import { ResearchAgent } from '../../src/agents/research/ResearchAgent';
import { ApiClientFactory } from '../../src/agents/research/clients/ApiClientFactory';
import { WriterAgent } from '../../src/agents/writer/WriterAgent';
import { EvaluatorAgent } from '../../src/agents/evaluator/EvaluatorAgent';
import { LLMClient } from '../../src/agents/writer/interfaces/LLMClient';
import { CoverLetterTone } from '../../src/agents/writer/WriterAgent';
import { OrchestratorStatus } from '../../src/orchestrator/interfaces/OrchestratorTypes';

// Mock the dependencies
jest.mock('../../src/agents/research/ResearchAgent');
jest.mock('../../src/agents/writer/WriterAgent');
jest.mock('../../src/agents/evaluator/EvaluatorAgent');
jest.mock('../../src/agents/evaluator/FeedbackLoop');
jest.mock('../../src/utils/logger');

describe('Orchestrator', () => {
  let orchestrator: Orchestrator;
  let mockResearchAgent: jest.Mocked<ResearchAgent>;
  let mockWriterAgent: jest.Mocked<WriterAgent>;
  let mockEvaluatorAgent: jest.Mocked<EvaluatorAgent>;

  // Sample test data
  const sampleResume = {
    personalInfo: {
      name: 'John Doe',
      email: 'john@example.com',
    },
    experience: [
      {
        title: 'Software Engineer',
        company: 'Tech Corp',
        duration: '2020-2023',
        description: 'Developed web applications',
      },
    ],
    education: [
      {
        degree: 'Computer Science',
        institution: 'University',
        year: '2020',
      },
    ],
    skills: ['JavaScript', 'TypeScript', 'React'],
  };

  const sampleCompanyResearch = {
    companyName: 'Example Inc',
    companyInfo: {
      description: 'A technology company',
      industry: 'Software',
      founded: '2010',
      headquarters: 'San Francisco',
      size: '500-1000 employees',
    },
    companyValues: ['Innovation', 'Teamwork', 'Excellence'],
    recentNews: [],
    blogPosts: [],
    jobAnalysis: {
      keySkills: ['JavaScript', 'React'],
      responsibilities: ['Develop web applications'],
      qualifications: ["Bachelor's degree"],
      companyFit: 'Looking for team players',
    },
    sources: [],
  };

  const sampleCoverLetterResult = {
    coverLetter: 'This is a sample cover letter',
    metadata: {
      model: 'gpt-4',
      tokenUsage: {
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
      },
      generationTime: 1000,
    },
  };

  const sampleEvaluationResult = {
    overallScore: 85,
    overallLevel: 'GOOD',
    feedback: [
      {
        category: 'GRAMMAR',
        score: 90,
        level: 'EXCELLENT',
        feedback: 'Grammar is excellent',
        suggestions: [],
      },
      {
        category: 'STYLE',
        score: 80,
        level: 'GOOD',
        feedback: 'Style is good',
        suggestions: ['Consider using more active voice'],
      },
    ],
    summary: 'Overall good cover letter',
    improvementPriorities: ['STYLE', 'GRAMMAR'],
  };

  const sampleFeedbackLoopResult = {
    success: true,
    finalCoverLetter: 'This is the final cover letter',
    finalEvaluation: sampleEvaluationResult,
    iterations: [
      {
        iteration: 1,
        coverLetter: 'This is the initial cover letter',
        evaluationResult: sampleEvaluationResult,
        timestamp: new Date(),
      },
    ],
    terminationReason: 'Acceptable score reached',
    iterationCount: 1,
    improvement: 5,
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock the ApiClientFactory
    jest.mock('../../src/agents/research/clients/ApiClientFactory', () => {
      return {
        ApiClientFactory: {
          getInstance: jest.fn().mockReturnValue({
            getBestAvailableClient: jest.fn().mockReturnValue({
              search: jest.fn().mockResolvedValue([]),
              getName: jest.fn().mockReturnValue('MockApiClient'),
              isConfigured: jest.fn().mockReturnValue(true),
            }),
          }),
        },
      };
    });

    // Mock the LLMClient
    const mockLLMClient: jest.Mocked<LLMClient> = {
      generate: jest.fn().mockResolvedValue({
        text: 'Generated text',
        model: 'gpt-4',
        usage: {
          promptTokens: 100,
          completionTokens: 200,
          totalTokens: 300,
        },
      }),
      getName: jest.fn().mockReturnValue('MockLLMClient'),
      getTokenUsage: jest.fn().mockReturnValue({
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
        totalRequests: 1,
        failedRequests: 0,
      }),
      isConfigured: jest.fn().mockReturnValue(true),
    };

    // Create mock instances
    mockResearchAgent = {
      researchCompany: jest.fn().mockResolvedValue(sampleCompanyResearch),
      clearCache: jest.fn(),
      setCacheTTL: jest.fn(),
    } as unknown as jest.Mocked<ResearchAgent>;

    mockWriterAgent = {
      generateCoverLetter: jest.fn().mockResolvedValue(sampleCoverLetterResult),
      getTokenUsage: jest.fn(),
      getLLMClientName: jest.fn().mockReturnValue('MockLLMClient'),
    } as unknown as jest.Mocked<WriterAgent>;

    mockEvaluatorAgent = {
      evaluateCoverLetter: jest.fn().mockResolvedValue(sampleEvaluationResult),
      getIterations: jest.fn().mockReturnValue([]),
      getLatestIteration: jest.fn(),
      isAcceptable: jest.fn().mockReturnValue(true),
      hasReachedMaxIterations: jest.fn().mockReturnValue(false),
      resetIterations: jest.fn(),
    } as unknown as jest.Mocked<EvaluatorAgent>;

    // Mock the FeedbackLoop
    jest.mock('../../src/agents/evaluator/FeedbackLoop', () => {
      return {
        FeedbackLoop: jest.fn().mockImplementation(() => {
          return {
            run: jest.fn().mockResolvedValue(sampleFeedbackLoopResult),
          };
        }),
      };
    });

    // Create the orchestrator with mocked dependencies
    orchestrator = new Orchestrator(
      mockResearchAgent,
      mockWriterAgent,
      mockEvaluatorAgent
    );
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      expect(orchestrator).toBeDefined();
      expect(orchestrator.getState().status).toBe(OrchestratorStatus.IDLE);
    });

    it('should initialize with custom options', () => {
      const customOptions = {
        maxIterations: 5,
        minApprovalScore: 8.0,
        enableParallelProcessing: true,
        onProgress: jest.fn(),
      };

      const customOrchestrator = new Orchestrator(
        mockResearchAgent,
        mockWriterAgent,
        mockEvaluatorAgent,
        customOptions
      );

      expect(customOrchestrator).toBeDefined();
      // We can't directly test private properties, but we can test behavior
      expect(customOrchestrator.getState().maxIterations).toBe(5);
    });
  });

  describe('generateCoverLetter', () => {
    it('should generate a cover letter successfully', async () => {
      const request = {
        resume: sampleResume,
        companyName: 'Example Inc',
        jobTitle: 'Senior Developer',
        jobDescription: 'We are looking for a senior developer',
        tonePreference: CoverLetterTone.PROFESSIONAL,
      };

      const result = await orchestrator.generateCoverLetter(request);

      // Verify the result
      expect(result).toBeDefined();
      expect(result.coverLetter).toBe('This is the final cover letter');
      expect(result.companyResearch).toBe(sampleCompanyResearch);
      expect(result.iterations).toBe(1);

      // Verify the research agent was called
      expect(mockResearchAgent.researchCompany).toHaveBeenCalledWith(
        'Example Inc',
        'We are looking for a senior developer'
      );

      // Verify the writer agent was called
      expect(mockWriterAgent.generateCoverLetter).toHaveBeenCalled();

      // Verify the state transitions
      const finalState = orchestrator.getState();
      expect(finalState.status).toBe(OrchestratorStatus.COMPLETED);
    });

    it('should handle errors during cover letter generation', async () => {
      const request = {
        resume: sampleResume,
        companyName: 'Example Inc',
        jobTitle: 'Senior Developer',
        jobDescription: 'We are looking for a senior developer',
      };

      // Mock an error in the research agent
      mockResearchAgent.researchCompany = jest
        .fn()
        .mockRejectedValue(new Error('Research failed'));

      // Expect the orchestrator to throw an error
      await expect(orchestrator.generateCoverLetter(request)).rejects.toThrow(
        'Research failed'
      );

      // Verify the state transitions
      const finalState = orchestrator.getState();
      expect(finalState.status).toBe(OrchestratorStatus.FAILED);
      expect(finalState.error).toBe('Research failed');
    });
  });

  describe('state management', () => {
    it('should track state changes during cover letter generation', async () => {
      const request = {
        resume: sampleResume,
        companyName: 'Example Inc',
        jobTitle: 'Senior Developer',
        jobDescription: 'We are looking for a senior developer',
      };

      // Start the process
      const generatePromise = orchestrator.generateCoverLetter(request);

      // Check initial state
      expect(orchestrator.getState().status).not.toBe(OrchestratorStatus.IDLE);

      // Wait for completion
      await generatePromise;

      // Check final state
      const finalState = orchestrator.getState();
      expect(finalState.status).toBe(OrchestratorStatus.COMPLETED);
      expect(finalState.endTime).toBeDefined();
      expect(orchestrator.getDuration()).toBeDefined();
    });
  });

  describe('parallel processing', () => {
    it('should use parallel processing when enabled', async () => {
      const customOptions = {
        enableParallelProcessing: true,
      };

      const parallelOrchestrator = new Orchestrator(
        mockResearchAgent,
        mockWriterAgent,
        mockEvaluatorAgent,
        customOptions
      );

      const request = {
        resume: sampleResume,
        companyName: 'Example Inc',
        jobTitle: 'Senior Developer',
        jobDescription: 'We are looking for a senior developer',
      };

      await parallelOrchestrator.generateCoverLetter(request);

      // We can't directly test if parallel processing was used,
      // but we can verify the process completed successfully
      expect(parallelOrchestrator.getState().status).toBe(
        OrchestratorStatus.COMPLETED
      );
    });
  });
});
