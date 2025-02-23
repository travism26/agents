import { ChatPromptTemplate } from '@langchain/core/prompts';
import {
  chatModel,
  createPromptTemplate,
  createBasicChain,
} from '../../src/config/langchain';

describe('LangChain Configuration', () => {
  it('should create a chat model with correct configuration', () => {
    expect(chatModel).toBeDefined();
    expect(chatModel.modelName).toBe(process.env.MODEL_NAME || 'gpt-4-turbo');
  });

  it('should create a prompt template with system and human messages', () => {
    const systemPrompt = 'You are a helpful assistant';
    const humanPrompt = 'Tell me about {topic}';

    const template = createPromptTemplate(systemPrompt, humanPrompt);

    expect(template).toBeInstanceOf(ChatPromptTemplate);
    expect(template.promptMessages).toHaveLength(2);
  });

  it('should create a basic chain that can be invoked', async () => {
    const template = createPromptTemplate(
      'You are a helpful assistant',
      'Say hello to {name}'
    );

    const chain = createBasicChain(template);
    expect(chain).toBeDefined();

    const response = await chain.invoke({
      name: 'Test User',
    });

    expect(typeof response).toBe('string');
    expect(response.length).toBeGreaterThan(0);
  });
});
