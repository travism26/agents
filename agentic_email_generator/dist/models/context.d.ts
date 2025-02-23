/**
 * Shared Context Management System
 * Enables communication and state sharing between agents
 */
import { User, Contact, Company, NewsArticle, Angle } from './models';
export interface AgentDecision {
    agent: 'researcher' | 'writer' | 'reviewer';
    timestamp: Date;
    decision: string;
    reasoning: string;
    confidence: number;
    metadata: Record<string, any>;
}
export interface SharedContext {
    sessionId: string;
    startTime: Date;
    user: User;
    contact: Contact;
    company: Company;
    state: {
        phase: 'research' | 'writing' | 'review' | 'revision' | 'complete' | 'failed';
        subPhase?: string;
        progress: number;
        error?: {
            agent: string;
            message: string;
            timestamp: Date;
            recoveryAttempts: number;
        };
    };
    memory: {
        decisions: AgentDecision[];
        researchFindings?: {
            articles: NewsArticle[];
            angle: Angle;
            relevanceScores: Record<string, number>;
        };
        draftHistory: {
            version: number;
            content: string;
            timestamp: Date;
            feedback?: {
                score: number;
                suggestions: string[];
                improvements: string[];
            };
        }[];
        performance: {
            researchTime?: number;
            writingTime?: number;
            reviewTime?: number;
            totalRevisions: number;
            qualityScores: number[];
        };
    };
    collaboration: {
        handoffs: {
            from: string;
            to: string;
            timestamp: Date;
            reason: string;
            data: Record<string, any>;
        }[];
        suggestions: {
            agent: string;
            timestamp: Date;
            suggestion: string;
            context: string;
            status: 'pending' | 'accepted' | 'rejected';
        }[];
    };
}
export declare class ContextManager {
    private context;
    constructor(sessionId: string, user: User, contact: Contact, company: Company);
    /**
     * Records a decision made by an agent
     */
    recordDecision(decision: AgentDecision): void;
    /**
     * Updates the current phase of email generation
     */
    updatePhase(phase: SharedContext['state']['phase'], subPhase?: string, progress?: number): void;
    /**
     * Records a handoff between agents
     */
    recordHandoff(from: string, to: string, reason: string, data: Record<string, any>): void;
    /**
     * Records research findings
     */
    setResearchFindings(articles: NewsArticle[], angle: Angle, relevanceScores: Record<string, number>): void;
    /**
     * Records a new draft version
     */
    addDraftVersion(content: string, feedback?: SharedContext['memory']['draftHistory'][0]['feedback']): void;
    /**
     * Records a suggestion from one agent to another
     */
    addSuggestion(agent: string, suggestion: string, context: string): void;
    /**
     * Updates the status of a suggestion
     */
    updateSuggestionStatus(index: number, status: 'accepted' | 'rejected'): void;
    /**
     * Records an error and its recovery attempts
     */
    recordError(agent: string, message: string): void;
    /**
     * Increments the recovery attempts for the current error
     */
    incrementRecoveryAttempts(): void;
    /**
     * Clears the current error state
     */
    clearError(): void;
    /**
     * Updates performance metrics
     */
    updatePerformance(metrics: Partial<SharedContext['memory']['performance']>): void;
    /**
     * Gets the current context state
     */
    getContext(): SharedContext;
    /**
     * Gets the latest draft version
     */
    getLatestDraft(): string | null;
    /**
     * Gets all decisions made by a specific agent
     */
    getAgentDecisions(agent: string): AgentDecision[];
    /**
     * Gets the current error state if any
     */
    getCurrentError(): SharedContext['state']['error'] | undefined;
    /**
     * Gets all pending suggestions
     */
    getPendingSuggestions(): SharedContext['collaboration']['suggestions'];
}
