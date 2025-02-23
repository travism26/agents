import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
export declare const chatModel: ChatOpenAI<import("@langchain/openai").ChatOpenAICallOptions>;
export declare const outputParser: StringOutputParser;
/**
 * Creates a chat prompt template with system and human messages
 * @param systemPrompt - The system prompt to use
 * @param humanPrompt - The human prompt template
 * @returns ChatPromptTemplate
 */
export declare function createPromptTemplate(systemPrompt: string, humanPrompt: string): ChatPromptTemplate;
/**
 * Creates a basic chain that combines a prompt template with the chat model and output parser
 * @param promptTemplate - The prompt template to use
 * @returns A runnable chain
 */
export declare function createBasicChain(promptTemplate: ChatPromptTemplate): import("@langchain/core/runnables").Runnable<any, string, import("@langchain/core/runnables").RunnableConfig<Record<string, any>>>;
