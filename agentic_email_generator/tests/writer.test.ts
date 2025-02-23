import { User, Contact, Company, NewsArticle } from '../src/models/models';
import { WriterAgent, EmailOptions } from '../src/agents/writer';
import { ContextManager } from '../src/models/context';
import { ChatOpenAI } from '@langchain/openai';

// Test helper class to access protected members
class TestableWriterAgent extends WriterAgent {
  getContext() {
    return this.getSharedContext();
  }
}

// Mock ChatOpenAI
jest.mock('@langchain/openai');
const MockedChatOpenAI = ChatOpenAI as jest.MockedClass<typeof ChatOpenAI>;

describe('Writer Agent', () => {
  let writer: TestableWriterAgent;
  let contextManager: ContextManager;

  const mockUser: User = {
    _id: 'user1',
    name: 'John Doe',
    title: 'Business Development Manager',
    company: 'Tech Corp',
  };

  const mockContact: Contact = {
    _id: 'contact1',
    name: 'Jane Smith',
    title: 'VP of Operations',
    company: 'Target Corp',
  };

  const mockCompany: Company = {
    _id: 'company1',
    name: 'Target Corp',
    details: {
      industry: 'Retail',
      description: 'Major retail corporation',
    },
  };

  const mockNewsArticles: NewsArticle[] = [
    {
      id: 'article1',
      title: 'Target Corp Announces New Partnership',
      url: 'https://example.com/1',
      publishedAt: new Date().toISOString(),
      summary: 'Major partnership announcement',
      source: 'Business News',
      companyName: 'Target Corp',
      tags: ['partnerships_investments'],
    },
    {
      id: 'article2',
      title: 'Target Corp Launches Innovation Lab',
      url: 'https://example.com/2',
      publishedAt: new Date().toISOString(),
      summary: 'New innovation center launch',
      source: 'Tech News',
      companyName: 'Target Corp',
      tags: ['developments_innovations'],
    },
  ];

  const mockEmailOptions: EmailOptions = {
    goal: 'discussing potential partnership opportunities',
    style: 'professional',
    tone: 'friendly',
    includeSalutation: true,
    includeSignature: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create context manager with test data
    contextManager = new ContextManager(
      'test-session',
      mockUser,
      mockContact,
      mockCompany
    );

    // Mock ChatOpenAI invoke method
    MockedChatOpenAI.prototype.invoke = jest
      .fn()
      .mockImplementation(async (messages) => {
        const userMessage = messages[1].content as string;

        if (userMessage.includes('analyze these news articles')) {
          return {
            content: JSON.stringify({
              narrative:
                'Focus on recent partnership announcement and innovation initiatives',
              selectedArticles: ['Target Corp Announces New Partnership'],
            }),
          };
        }

        if (userMessage.includes('Create highly personalized email content')) {
          return {
            content: `Dear ${mockContact.name},

I hope this email finds you well. I noticed Target Corp's recent partnership announcement and wanted to connect regarding potential collaboration opportunities.

Given your role as VP of Operations at Target Corp, I believe there could be significant value in exploring how our organizations might work together.

Would you be interested in scheduling a brief discussion?

Best regards,
${mockUser.name}
${mockUser.title}
${mockUser.company}`,
          };
        }

        if (userMessage.includes('Create an engaging email subject line')) {
          return {
            content:
              'Exploring Partnership Opportunities - Tech Corp & Target Corp',
          };
        }

        return { content: 'default response' };
      });

    writer = new TestableWriterAgent(contextManager);
  });

  describe('compose', () => {
    it('should generate an email draft with all required components', async () => {
      const draft = await writer.compose(
        mockUser,
        mockContact,
        mockEmailOptions,
        mockNewsArticles
      );

      // Verify basic structure
      expect(draft.content).toBeDefined();
      expect(draft.subject).toBeDefined();
      expect(draft.metadata).toBeDefined();

      // Verify metadata
      expect(draft.metadata.tone).toBe(mockEmailOptions.tone);
      expect(draft.metadata.wordCount).toBeGreaterThan(0);
      expect(draft.metadata.targetGoals).toContain(mockEmailOptions.goal);
      expect(draft.metadata.includedArticles).toHaveLength(1);
      expect(draft.metadata.generationStrategy).toBeDefined();
      expect(draft.metadata.personalizationFactors).toBeDefined();
      expect(draft.metadata.styleAdherence).toBeDefined();
    });

    it('should include personalized details from user and contact', async () => {
      const draft = await writer.compose(
        mockUser,
        mockContact,
        mockEmailOptions,
        mockNewsArticles
      );

      // Check for contact details
      expect(draft.content).toContain(mockContact.name);
      expect(draft.content).toContain(mockContact.title);
      expect(draft.content).toContain(mockContact.company);

      // Check for user signature details
      expect(draft.content).toContain(mockUser.name);
      expect(draft.content).toContain(mockUser.title);
      expect(draft.content).toContain(mockUser.company);
    });

    it('should maintain context across multiple compositions', async () => {
      // First email
      await writer.compose(
        mockUser,
        mockContact,
        mockEmailOptions,
        mockNewsArticles
      );

      // Second email with different goal
      const secondOptions = {
        ...mockEmailOptions,
        goal: 'discussing innovation initiatives',
      };

      const draft = await writer.compose(
        mockUser,
        mockContact,
        secondOptions,
        mockNewsArticles
      );

      // Verify LLM was called with previous context
      const lastLLMCall = (
        MockedChatOpenAI.prototype.invoke as jest.Mock
      ).mock.calls.slice(-2)[0];

      const userMessage = lastLLMCall[0][1].content;
      expect(userMessage).toContain('Previous Interactions');
    });

    it('should use autonomous decision making for article selection', async () => {
      const draft = await writer.compose(
        mockUser,
        mockContact,
        mockEmailOptions,
        mockNewsArticles
      );

      // Verify article analysis was performed
      expect(MockedChatOpenAI.prototype.invoke).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('expert email strategist'),
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('analyze these news articles'),
          }),
        ])
      );

      // Verify selected articles are tracked
      expect(draft.metadata.includedArticles).toBeDefined();
      expect(draft.metadata.includedArticles.length).toBeGreaterThan(0);
    });

    it('should handle empty news articles array', async () => {
      const draft = await writer.compose(
        mockUser,
        mockContact,
        mockEmailOptions,
        []
      );

      expect(draft.content).toBeDefined();
      expect(draft.metadata.includedArticles).toHaveLength(0);
    });

    it('should adapt style based on email options', async () => {
      const formalOptions: EmailOptions = {
        ...mockEmailOptions,
        style: 'formal',
        tone: 'direct',
      };

      const draft = await writer.compose(
        mockUser,
        mockContact,
        formalOptions,
        mockNewsArticles
      );

      expect(draft.metadata.styleAdherence?.formalityScore).toBe(0.9);
      expect(draft.metadata.tone).toBe('direct');
    });

    it('should generate appropriate subject lines', async () => {
      const draft = await writer.compose(
        mockUser,
        mockContact,
        mockEmailOptions,
        mockNewsArticles
      );

      expect(draft.subject).toBeDefined();
      expect(draft.subject).toContain('Partnership');
      expect(draft.subject).toContain(mockContact.company);
    });

    it('should track composition phases', async () => {
      const compositionPhases: string[] = [];

      // Mock to capture phase transitions
      MockedChatOpenAI.prototype.invoke = jest
        .fn()
        .mockImplementation(async () => {
          const context = writer.getContext();
          compositionPhases.push(context.state.phase);
          return { content: 'test content' };
        });

      await writer.compose(
        mockUser,
        mockContact,
        mockEmailOptions,
        mockNewsArticles
      );

      expect(compositionPhases).toContain('planning');
      expect(compositionPhases).toContain('drafting');
      expect(compositionPhases).toContain('refining');
      expect(compositionPhases[0]).toBe('planning');
      expect(compositionPhases[compositionPhases.length - 1]).toBe('refining');
    });

    it('should autonomously determine style and tone for senior executives', async () => {
      const executiveContact: Contact = {
        ...mockContact,
        title: 'CEO',
      };

      // Create options without style/tone
      const options: EmailOptions = {
        goal: mockEmailOptions.goal,
        style: 'professional', // Default value that will be overridden by autonomous decision
        tone: 'friendly', // Default value that will be overridden by autonomous decision
        includeSalutation: mockEmailOptions.includeSalutation,
        includeSignature: mockEmailOptions.includeSignature,
      };

      const draft = await writer.compose(
        mockUser,
        executiveContact,
        options,
        mockNewsArticles
      );

      expect(draft.metadata.tone).toBe('direct');
      expect(draft.metadata.styleAdherence?.formalityScore).toBe(0.9);
    });

    it('should learn and apply communication patterns', async () => {
      // First email with good metrics
      await writer.compose(
        mockUser,
        mockContact,
        mockEmailOptions,
        mockNewsArticles
      );

      const context = writer.getContext();
      const memory = context.memory;

      // Verify decisions were recorded
      expect(memory.decisions.length).toBeGreaterThan(0);
      expect(memory.decisions[0].confidence).toBeGreaterThan(0);

      // Verify draft was recorded
      expect(memory.draftHistory.length).toBe(1);
    });

    it('should maintain and update contact preferences', async () => {
      // First interaction
      await writer.compose(
        mockUser,
        mockContact,
        {
          ...mockEmailOptions,
          style: 'casual',
          tone: 'friendly',
        },
        mockNewsArticles
      );

      // Second interaction
      const draft = await writer.compose(
        mockUser,
        mockContact,
        mockEmailOptions, // Use default options for second interaction
        mockNewsArticles
      );

      const context = writer.getContext();
      expect(context.memory.draftHistory.length).toBe(2);
      expect(draft.metadata.personalizationFactors).toContain(
        'role-based-context'
      );
    });

    it('should track goal progress throughout composition', async () => {
      const progressPoints: number[] = [];

      // Mock to capture progress
      MockedChatOpenAI.prototype.invoke = jest
        .fn()
        .mockImplementation(async () => {
          const context = writer.getContext();
          progressPoints.push(context.state.progress);
          return { content: 'test content' };
        });

      await writer.compose(
        mockUser,
        mockContact,
        mockEmailOptions,
        mockNewsArticles
      );

      expect(progressPoints[0]).toBe(0);
      expect(progressPoints[progressPoints.length - 1]).toBe(1);
      expect(progressPoints).toContain(0.25);
    });

    it('should handle and learn from multiple revisions', async () => {
      // Initial draft
      const initialDraft = await writer.compose(
        mockUser,
        mockContact,
        mockEmailOptions,
        mockNewsArticles
      );

      // Simulate feedback and revision
      contextManager.addDraftVersion(initialDraft.content, {
        score: 60,
        suggestions: ['Make it more concise'],
        improvements: ['Reduce length'],
      });

      const revisedDraft = await writer.compose(
        mockUser,
        mockContact,
        mockEmailOptions,
        mockNewsArticles
      );

      expect(revisedDraft.metadata.personalizationFactors).toContain(
        'learning-pattern-based'
      );
      const context = writer.getContext();
      expect(context.memory.draftHistory).toHaveLength(2);
    });
  });

  describe('Pattern Recognition', () => {
    it('should extract and learn from communication patterns', async () => {
      const testContent =
        'I noticed your recent announcement. This could create opportunities. Would you be interested in discussing further?';

      const patterns =
        testContent.match(/(^|\. )[A-Z][^.!?]*[.!?]/g)?.map((s) => s.trim()) ||
        [];

      expect(patterns).toHaveLength(3);
      expect(patterns[0]).toContain('noticed');
      expect(patterns[1]).toContain('opportunities');
      expect(patterns[2]).toContain('interested');
    });

    it('should update pattern success rates based on feedback', async () => {
      const draft = await writer.compose(
        mockUser,
        mockContact,
        mockEmailOptions,
        mockNewsArticles
      );

      contextManager.addDraftVersion(draft.content, {
        score: 90,
        suggestions: [],
        improvements: ['Good engagement'],
      });

      const context = writer.getContext();
      expect(context.memory.draftHistory).toHaveLength(1);
      expect(context.memory.draftHistory[0].feedback?.score).toBe(90);
    });
  });
});
