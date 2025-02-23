/**
 * Base Agent Class
 * Provides shared functionality and context management for all agents
 */

import {
  ContextManager,
  AgentDecision,
  SharedContext,
} from '../models/context';

export abstract class BaseAgent {
  protected contextManager: ContextManager;
  protected agentType: 'researcher' | 'writer' | 'reviewer';
  protected maxRecoveryAttempts = 3;

  constructor(
    contextManager: ContextManager,
    agentType: 'researcher' | 'writer' | 'reviewer'
  ) {
    this.contextManager = contextManager;
    this.agentType = agentType;
  }

  /**
   * Records a decision made by this agent
   */
  protected recordDecision(
    decision: string,
    reasoning: string,
    confidence: number,
    metadata: Record<string, any> = {}
  ): void {
    const agentDecision: AgentDecision = {
      agent: this.agentType,
      timestamp: new Date(),
      decision,
      reasoning,
      confidence,
      metadata,
    };
    this.contextManager.recordDecision(agentDecision);
  }

  /**
   * Handles errors with automatic recovery attempts
   */
  protected async handleError<T>(
    operation: () => Promise<T>,
    fallbackStrategy?: () => Promise<T>
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.contextManager.recordError(this.agentType, errorMessage);

      // Attempt recovery if fallback strategy is provided
      if (fallbackStrategy) {
        const currentError = this.contextManager.getCurrentError();
        if (
          currentError &&
          currentError.recoveryAttempts < this.maxRecoveryAttempts
        ) {
          this.contextManager.incrementRecoveryAttempts();
          try {
            const result = await fallbackStrategy();
            this.contextManager.clearError();
            return result;
          } catch (fallbackError) {
            throw new Error(
              `Recovery attempt failed: ${
                fallbackError instanceof Error
                  ? fallbackError.message
                  : 'Unknown error'
              }`
            );
          }
        }
      }

      throw error;
    }
  }

  /**
   * Initiates a handoff to another agent
   */
  protected handoffToAgent(
    targetAgent: string,
    reason: string,
    data: Record<string, any>
  ): void {
    this.contextManager.recordHandoff(
      this.agentType,
      targetAgent,
      reason,
      data
    );
  }

  /**
   * Makes a suggestion to another agent
   */
  protected makeSuggestion(suggestion: string, context: string): void {
    this.contextManager.addSuggestion(this.agentType, suggestion, context);
  }

  /**
   * Updates the current phase and progress
   */
  protected updatePhase(
    phase: SharedContext['state']['phase'],
    subPhase?: string,
    progress?: number
  ): void {
    this.contextManager.updatePhase(phase, subPhase, progress);
  }

  /**
   * Records performance metrics for the agent
   */
  protected recordPerformance(
    metrics: Partial<SharedContext['memory']['performance']>
  ): void {
    this.contextManager.updatePerformance(metrics);
  }

  /**
   * Gets all decisions made by this agent
   */
  protected getAgentDecisions(): AgentDecision[] {
    return this.contextManager.getAgentDecisions(this.agentType);
  }

  /**
   * Gets pending suggestions for this agent
   */
  protected getPendingSuggestions(): SharedContext['collaboration']['suggestions'] {
    return this.contextManager
      .getPendingSuggestions()
      .filter((s) => s.agent === this.agentType);
  }

  /**
   * Gets the complete shared context
   */
  protected getSharedContext(): SharedContext {
    return this.contextManager.getContext();
  }

  /**
   * Validates if a handoff to this agent is expected
   */
  protected validateHandoff(
    fromAgent: string,
    data: Record<string, any>
  ): boolean {
    const context = this.getSharedContext();
    const lastHandoff =
      context.collaboration.handoffs[context.collaboration.handoffs.length - 1];

    return (
      lastHandoff &&
      lastHandoff.from === fromAgent &&
      lastHandoff.to === this.agentType
    );
  }

  /**
   * Checks if the agent can proceed with its operation
   */
  protected canProceed(): boolean {
    const context = this.getSharedContext();

    // Check if there's an active error
    if (context.state.error) {
      return false;
    }

    // Check if we're in the correct phase
    const validPhases = this.getValidPhases();
    if (!validPhases.includes(context.state.phase)) {
      return false;
    }

    // Check if there are blocking suggestions
    const pendingSuggestions = this.getPendingSuggestions();
    if (pendingSuggestions.length > 0) {
      return false;
    }

    return true;
  }

  /**
   * Gets valid phases for this agent
   */
  protected abstract getValidPhases(): SharedContext['state']['phase'][];

  /**
   * Implements agent-specific fallback strategy
   */
  protected abstract getFallbackStrategy(): Promise<any>;
}
