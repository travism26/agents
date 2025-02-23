/**
 * Base Agent Class
 * Provides shared functionality and context management for all agents
 */
import { ContextManager, AgentDecision, SharedContext } from '../models/context';
export declare abstract class BaseAgent {
    protected contextManager: ContextManager;
    protected agentType: 'researcher' | 'writer' | 'reviewer';
    protected maxRecoveryAttempts: number;
    constructor(contextManager: ContextManager, agentType: 'researcher' | 'writer' | 'reviewer');
    /**
     * Records a decision made by this agent
     */
    protected recordDecision(decision: string, reasoning: string, confidence: number, metadata?: Record<string, any>): void;
    /**
     * Handles errors with automatic recovery attempts
     */
    protected handleError<T>(operation: () => Promise<T>, fallbackStrategy?: () => Promise<T>): Promise<T>;
    /**
     * Initiates a handoff to another agent
     */
    protected handoffToAgent(targetAgent: string, reason: string, data: Record<string, any>): void;
    /**
     * Makes a suggestion to another agent
     */
    protected makeSuggestion(suggestion: string, context: string): void;
    /**
     * Updates the current phase and progress
     */
    protected updatePhase(phase: SharedContext['state']['phase'], subPhase?: string, progress?: number): void;
    /**
     * Records performance metrics for the agent
     */
    protected recordPerformance(metrics: Partial<SharedContext['memory']['performance']>): void;
    /**
     * Gets all decisions made by this agent
     */
    protected getAgentDecisions(): AgentDecision[];
    /**
     * Gets pending suggestions for this agent
     */
    protected getPendingSuggestions(): SharedContext['collaboration']['suggestions'];
    /**
     * Gets the complete shared context
     */
    protected getSharedContext(): SharedContext;
    /**
     * Validates if a handoff to this agent is expected
     */
    protected validateHandoff(fromAgent: string, data: Record<string, any>): boolean;
    /**
     * Checks if the agent can proceed with its operation
     */
    protected canProceed(): boolean;
    /**
     * Gets valid phases for this agent
     */
    protected abstract getValidPhases(): SharedContext['state']['phase'][];
    /**
     * Implements agent-specific fallback strategy
     */
    protected abstract getFallbackStrategy(): Promise<any>;
}
