import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize the OpenAI chat model with environment variables
export const chatModel = new ChatOpenAI({
  modelName: process.env.MODEL_NAME || 'gpt-4-turbo',
  temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
  maxTokens: parseInt(process.env.MAX_TOKENS || '4000'),
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// Create a basic output parser
export const outputParser = new StringOutputParser();

/**
 * Creates a chat prompt template with system and human messages
 * @param systemPrompt - The system prompt to use
 * @param humanPrompt - The human prompt template
 * @returns ChatPromptTemplate
 */
export function createPromptTemplate(
  systemPrompt: string,
  humanPrompt: string
): ChatPromptTemplate {
  return ChatPromptTemplate.fromMessages([
    ['system', systemPrompt],
    ['human', humanPrompt],
  ]);
}

/**
 * Creates a basic chain that combines a prompt template with the chat model and output parser
 * @param promptTemplate - The prompt template to use
 * @returns A runnable chain
 */
export function createBasicChain(promptTemplate: ChatPromptTemplate) {
  return promptTemplate.pipe(chatModel).pipe(outputParser);
}
