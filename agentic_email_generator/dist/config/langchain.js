"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.outputParser = exports.chatModel = void 0;
exports.createPromptTemplate = createPromptTemplate;
exports.createBasicChain = createBasicChain;
const openai_1 = require("@langchain/openai");
const prompts_1 = require("@langchain/core/prompts");
const output_parsers_1 = require("@langchain/core/output_parsers");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
// Initialize the OpenAI chat model with environment variables
exports.chatModel = new openai_1.ChatOpenAI({
    modelName: process.env.MODEL_NAME || 'gpt-4-turbo',
    temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.MAX_TOKENS || '4000'),
    openAIApiKey: process.env.OPENAI_API_KEY,
});
// Create a basic output parser
exports.outputParser = new output_parsers_1.StringOutputParser();
/**
 * Creates a chat prompt template with system and human messages
 * @param systemPrompt - The system prompt to use
 * @param humanPrompt - The human prompt template
 * @returns ChatPromptTemplate
 */
function createPromptTemplate(systemPrompt, humanPrompt) {
    return prompts_1.ChatPromptTemplate.fromMessages([
        ['system', systemPrompt],
        ['human', humanPrompt],
    ]);
}
/**
 * Creates a basic chain that combines a prompt template with the chat model and output parser
 * @param promptTemplate - The prompt template to use
 * @returns A runnable chain
 */
function createBasicChain(promptTemplate) {
    return promptTemplate.pipe(exports.chatModel).pipe(exports.outputParser);
}
