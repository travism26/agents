/**
 * Reviewer Agent
 * Responsible for evaluating and improving email drafts to ensure
 * quality, effectiveness, and alignment with goals.
 */
import { Contact, NewsArticle, Angle } from '../models/models';
import { BaseAgent } from './base';
import { ContextManager, SharedContext } from '../models/context';
export interface EmailContext {
    contact: Contact;
    articles: NewsArticle[];
    angle: Angle;
    revisionCount: number;
}
export interface QualityCriteria {
    minLength: number;
    maxLength: number;
    requiredElements: string[];
    tone: string[];
    forbidden: string[];
}
export interface ReviewResult {
    approved: boolean;
    score: number;
    suggestions: string[];
    improvedContent?: string;
    analysis?: {
        toneScore: number;
        personalizationScore: number;
        contentRelevance: number;
        structureQuality: number;
        improvementAreas: string[];
        styleMatch?: string;
        toneMatch?: string;
        clarity?: number;
        engagement?: number;
        contextualRelevance?: number;
        improvements?: {
            suggestion: string;
            impact: number;
            reasoning: string;
        }[];
    };
}
export declare class ReviewerAgent extends BaseAgent {
    private readonly MAX_REVISIONS;
    private readonly DEFAULT_CRITERIA;
    constructor(contextManager: ContextManager);
    /**
     * Gets valid phases for this agent
     */
    protected getValidPhases(): SharedContext['state']['phase'][];
    /**
     * Implements fallback strategy for review failures
     */
    protected getFallbackStrategy(): Promise<ReviewResult>;
    /**
     * Reviews an email draft using autonomous analysis with multiple phases
     */
    review(draft: string, context: EmailContext, criteria?: Partial<QualityCriteria>): Promise<ReviewResult>;
    /**
     * Performs initial quick analysis of the draft
     */
    private performInitialAnalysis;
    /**
     * Performs detailed review incorporating contact history and patterns
     */
    private performDetailedReview;
    /**
     * Generates specific improvements with reasoning
     */
    private generateImprovements;
    /**
     * Performs final validation of the review
     */
    private validateReview;
    /**
     * Summarizes previous reviews
     */
    private summarizePreviousReviews;
    /**
     * Summarizes previous feedback
     */
    private summarizePreviousFeedback;
}
