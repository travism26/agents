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
  protected async handoffToAgent(
    targetAgent: string,
    reason: string,
    data: Record<string, any>
  ): Promise<void> {
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

    // Give time for phase update to be processed
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify phase update
    const currentPhase = this.getSharedContext().state.phase;
    if (
      (targetAgent === 'writer' && currentPhase !== 'writing') ||
      (targetAgent === 'reviewer' && currentPhase !== 'review')
    ) {
      this.log('ERROR', 'Phase transition failed', {
        targetAgent,
        expectedPhase: targetAgent === 'writer' ? 'writing' : 'review',
        actualPhase: currentPhase,
      });
      throw new Error(`Failed to transition to ${targetAgent} phase`);
    }

    this.log('INFO', `Handing off to ${targetAgent}`, {
      reason,
      data,
      phase: this.getSharedContext().state.phase,
    });

    // Record the handoff
    this.contextManager.recordHandoff(
      this.agentType,
      targetAgent,
      reason,
      data
    );

    // Verify handoff was recorded
    const context = this.getSharedContext();
    const lastHandoff =
      context.collaboration.handoffs[context.collaboration.handoffs.length - 1];

    if (
      !lastHandoff ||
      lastHandoff.from !== this.agentType ||
      lastHandoff.to !== targetAgent
    ) {
      this.log('ERROR', 'Handoff verification failed', {
        lastHandoff,
        expectedFrom: this.agentType,
        expectedTo: targetAgent,
      });
      throw new Error(
        `Failed to record handoff from ${this.agentType} to ${targetAgent}`
      );
    }

    this.log('DEBUG', 'Handoff completed successfully', {
      from: this.agentType,
      to: targetAgent,
      handoffCount: context.collaboration.handoffs.length,
    });
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
      this.log('ERROR', 'No handoff found in context', {
        handoffs: context.collaboration.handoffs,
      });
      return false;
    }

    if (lastHandoff.from !== fromAgent) {
      this.log('ERROR', 'Invalid handoff source', {
        expected: fromAgent,
        actual: lastHandoff.from,
      });
      return false;
    }

    if (lastHandoff.to !== this.agentType) {
      this.log('ERROR', 'Invalid handoff destination', {
        expected: this.agentType,
        actual: lastHandoff.to,
      });
      return false;
    }

    // Validate required data fields based on agent type
    if (this.agentType === 'writer') {
      // Basic validation of articles array and angle object
      if (
        !lastHandoff.data.articles ||
        !Array.isArray(lastHandoff.data.articles) ||
        !lastHandoff.data.angle ||
        typeof lastHandoff.data.angle !== 'object'
      ) {
        this.log('ERROR', 'Missing or invalid data structure in handoff', {
          data: lastHandoff.data,
        });
        return false;
      }

      // Log validation details
      this.log('DEBUG', 'Handoff data validation details', {
        hasArticles: !!lastHandoff.data.articles,
        articleCount: lastHandoff.data.articles.length,
        hasAngle: !!lastHandoff.data.angle,
        angleFields: lastHandoff.data.angle
          ? Object.keys(lastHandoff.data.angle)
          : [],
      });
    } else if (this.agentType === 'reviewer') {
      // Validate reviewer's expected data structure
      if (
        !lastHandoff.data.draft ||
        typeof lastHandoff.data.draft !== 'string' ||
        !lastHandoff.data.emailContext ||
        typeof lastHandoff.data.emailContext !== 'object' ||
        !lastHandoff.data.emailContext.contact ||
        !lastHandoff.data.emailContext.articles ||
        !Array.isArray(lastHandoff.data.emailContext.articles) ||
        !lastHandoff.data.emailContext.angle ||
        typeof lastHandoff.data.emailContext.revisionCount !== 'number'
      ) {
        this.log(
          'ERROR',
          'Missing or invalid data structure in handoff to reviewer',
          {
            data: lastHandoff.data,
          }
        );
        return false;
      }

      // Log validation details
      this.log('DEBUG', 'Reviewer handoff data validation details', {
        hasDraft: !!lastHandoff.data.draft,
        draftLength: lastHandoff.data.draft.length,
        hasEmailContext: !!lastHandoff.data.emailContext,
        hasContact: !!lastHandoff.data.emailContext?.contact,
        articleCount: lastHandoff.data.emailContext?.articles?.length,
        hasAngle: !!lastHandoff.data.emailContext?.angle,
        revisionCount: lastHandoff.data.emailContext?.revisionCount,
      });
    }

    this.log('INFO', 'Handoff validation successful', {
      from: fromAgent,
      to: this.agentType,
      dataFields: Object.keys(lastHandoff.data),
    });

    return true;
  }

  /**
   * Checks if the agent can proceed with its operation
   */
  protected canProceed(): boolean {
    const context = this.getSharedContext();
    const validPhases = this.getValidPhases();
    const pendingSuggestions = this.getPendingSuggestions();
    const handoffs = context.collaboration.handoffs;
    const lastHandoff = handoffs[handoffs.length - 1];

    this.log('DEBUG', 'Checking if agent can proceed', {
      currentPhase: context.state.phase,
      agentType: this.agentType,
      hasError: !!context.state.error,
      pendingSuggestions: pendingSuggestions.length,
      validPhases,
      lastHandoff,
    });

    // Check if there's an active error
    if (context.state.error) {
      this.log('DEBUG', 'Cannot proceed due to active error', {
        error: context.state.error,
      });
      return false;
    }

    // Check if we're in the correct phase
    if (!validPhases.includes(context.state.phase)) {
      this.log('DEBUG', 'Cannot proceed due to invalid phase', {
        currentPhase: context.state.phase,
        validPhases,
        agentType: this.agentType,
      });
      return false;
    }

    // For reviewer, ensure we're in review phase before proceeding
    if (this.agentType === 'reviewer' && context.state.phase !== 'review') {
      this.log('DEBUG', 'Reviewer must be in review phase', {
        currentPhase: context.state.phase,
        validPhases,
      });
      return false;
    }

    // Check if there are blocking suggestions
    if (pendingSuggestions.length > 0) {
      this.log('DEBUG', 'Cannot proceed due to pending suggestions', {
        suggestions: pendingSuggestions,
      });
      return false;
    }

    // Check if we have a valid handoff (except for researcher who starts the chain)
    if (this.agentType !== 'researcher') {
      if (!lastHandoff || lastHandoff.to !== this.agentType) {
        this.log('DEBUG', 'Cannot proceed due to invalid handoff', {
          lastHandoff,
          expectedTo: this.agentType,
        });
        return false;
      }
    }

    this.log('DEBUG', 'Agent can proceed', {
      phase: context.state.phase,
      agentType: this.agentType,
      handoff: lastHandoff,
    });
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
