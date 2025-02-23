import { User, Contact, NewsArticle } from '../src/models/models';
import { WriterAgent, EmailOptions } from '../src/agents/writer';
import { ChatOpenAI } from '@langchain/openai';

// Mock ChatOpenAI
jest.mock('@langchain/openai');
const MockedChatOpenAI = ChatOpenAI as jest.MockedClass<typeof ChatOpenAI>;

describe('Writer Agent', () => {
  let writer: WriterAgent;

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

    writer = new WriterAgent();
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
  });
});
