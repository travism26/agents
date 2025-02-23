/**
 * Base Agent Class
 * Provides shared functionality and context management for all agents
 */

import {
  ContextManager,
  AgentDecision,
  SharedContext,
  LogLevel,
} from '../models/context';

type LogMetadata = Record<string, any>;

export abstract class BaseAgent {
  protected contextManager: ContextManager;
  protected agentType: 'researcher' | 'writer' | 'reviewer';
  protected maxRecoveryAttempts = 3;

  /**
   * Log a message with optional metadata
   */
  protected log(
    level: LogLevel,
    message: string,
    metadata: LogMetadata = {},
    error?: Error
  ): void {
    const timestamp = new Date();
    const logEntry = {
      timestamp,
      level,
      agent: this.agentType,
      message,
      metadata: {
        ...metadata,
        error: error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : undefined,
      },
    };

    this.contextManager.addLog(logEntry);

    // Also record as error if appropriate
    if (level === 'ERROR' && error) {
      this.contextManager.recordError(this.agentType, error.message);
    }
  }

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
    this.log('INFO', `Making decision: ${decision}`, {
      reasoning,
      confidence,
      ...metadata,
    });
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
      this.log('DEBUG', 'Starting operation', { operation: operation.name });
      const result = await operation();
      this.log('DEBUG', 'Operation completed successfully', {
        operation: operation.name,
      });
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.log(
        'ERROR',
        `Operation failed: ${errorMessage}`,
        {
          operation: operation.name,
        },
        error instanceof Error ? error : undefined
      );

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
    this.log('DEBUG', `Attempting handoff to ${targetAgent}`, {
      fromAgent: this.agentType,
      toAgent: targetAgent,
      reason,
      data,
      currentPhase: this.getSharedContext().state.phase,
    });

    // Update phase before handoff
    if (targetAgent === 'writer') {
      this.updatePhase('writing', 'initial_draft', 0.3);
    } else if (targetAgent === 'reviewer') {
      this.updatePhase('review', 'initial_review', 0.6);
    }

    this.log('INFO', `Handing off to ${targetAgent}`, {
      reason,
      data,
    });

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
    this.log('INFO', `Making suggestion: ${suggestion}`, { context });
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
    this.log('INFO', `Updating phase to ${phase}`, {
      subPhase,
      progress,
    });
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
    this.log('DEBUG', `Validating handoff from ${fromAgent}`, {
      data,
      agentType: this.agentType,
      handoffs: this.getSharedContext().collaboration.handoffs,
    });
    const context = this.getSharedContext();
    const lastHandoff =
      context.collaboration.handoffs[context.collaboration.handoffs.length - 1];

    if (!lastHandoff) {
      this.log('DEBUG', 'No handoff found');
      return false;
    }

    // Only check if the required data fields are present
    const isValid =
      lastHandoff.from === fromAgent &&
      lastHandoff.to === this.agentType &&
      Object.entries(data).every(
        ([key, value]) =>
          lastHandoff.data[key] !== undefined &&
          typeof lastHandoff.data[key] === typeof value
      );

    this.log('DEBUG', `Handoff validation result: ${isValid}`, {
      expected: { from: fromAgent, to: this.agentType, data },
      actual: lastHandoff,
    });

    return isValid;
  }

  /**
   * Checks if the agent can proceed with its operation
   */
  protected canProceed(): boolean {
    const context = this.getSharedContext();
    this.log('DEBUG', 'Checking if agent can proceed', {
      currentPhase: context.state.phase,
      hasError: !!context.state.error,
      pendingSuggestions: this.getPendingSuggestions().length,
    });

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
