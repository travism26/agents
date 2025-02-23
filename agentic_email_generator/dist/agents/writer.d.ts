/**
 * Writer Agent
 * Responsible for generating personalized email content based on
 * research findings and specified parameters.
 */
import { User, Contact, NewsArticle } from '../models/models';
import { BaseAgent } from './base';
import { ContextManager, SharedContext } from '../models/context';
export interface EmailOptions {
    goal: string;
    style: 'formal' | 'casual' | 'professional';
    tone: 'friendly' | 'direct' | 'enthusiastic';
    maxLength?: number;
    includeSalutation?: boolean;
    includeSignature?: boolean;
}
export interface EmailDraft {
    content: string;
    subject?: string;
    metadata: {
        tone: string;
        wordCount: number;
        targetGoals: string[];
        includedArticles: string[];
        generationStrategy?: string;
        personalizationFactors?: string[];
        styleAdherence?: {
            formalityScore: number;
            toneAlignment: number;
            clarity: number;
        };
    };
}
/**
 * WriterAgent class with autonomous email generation capabilities
 */
export declare class WriterAgent extends BaseAgent {
    private writerContext;
    constructor(contextManager: ContextManager);
    /**
     * Gets valid phases for this agent
     */
    protected getValidPhases(): SharedContext['state']['phase'][];
    /**
     * Implements fallback strategy for writing failures
     */
    protected getFallbackStrategy(): Promise<EmailDraft>;
    /**
     * Generates a simplified draft when normal generation fails
     */
    private generateSimplifiedDraft;
    /**
     * Extracts communication patterns from content
     */
    private extractPatterns;
    /**
     * Analyzes articles to determine the most compelling narrative
     */
    private analyzeArticles;
    /**
     * Generates personalized content based on contact and context
     */
    private generatePersonalizedContent;
    /**
     * Summarizes previous interactions for context
     */
    private summarizePreviousInteractions;
    /**
     * Extracts patterns from draft history
     */
    private extractPatternsFromHistory;
    /**
     * Determines optimal email style and tone based on context
     */
    private determineOptimalStyle;
    /**
     * Generates an email draft using autonomous decision making
     */
    compose(user: User, contact: Contact, emailOptions: EmailOptions, newsArticles: NewsArticle[]): Promise<EmailDraft>;
    /**
     * Generates an engaging subject line
     */
    private generateSubjectLine;
}
