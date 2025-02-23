/**
 * Shared Context Management System
 * Enables communication and state sharing between agents
 */

import { User, Contact, Company, NewsArticle, Angle } from './models';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  agent: string;
  message: string;
  metadata: Record<string, any>;
}

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
  logs: LogEntry[];
  state: {
    phase:
      | 'research'
      | 'writing'
      | 'review'
      | 'revision'
      | 'complete'
      | 'failed';
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

export class ContextManager {
  private context: SharedContext;

  constructor(
    sessionId: string,
    user: User,
    contact: Contact,
    company: Company
  ) {
    this.context = {
      sessionId,
      startTime: new Date(),
      user,
      contact,
      company,
      logs: [],
      state: {
        phase: 'research',
        progress: 0,
      },
      memory: {
        decisions: [],
        draftHistory: [],
        performance: {
          totalRevisions: 0,
          qualityScores: [],
        },
      },
      collaboration: {
        handoffs: [],
        suggestions: [],
      },
    };
  }

  /**
   * Adds a log entry to the context
   */
  addLog(entry: LogEntry): void {
    this.context.logs.push(entry);

    // Keep only the last 1000 logs to prevent memory issues
    if (this.context.logs.length > 1000) {
      this.context.logs = this.context.logs.slice(-1000);
    }
  }

  /**
   * Gets all logs for a specific agent
   */
  getAgentLogs(agent: string): LogEntry[] {
    return this.context.logs.filter((log) => log.agent === agent);
  }

  /**
   * Gets all logs of a specific level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.context.logs.filter((log) => log.level === level);
  }

  /**
   * Records a decision made by an agent
   */
  recordDecision(decision: AgentDecision): void {
    this.context.memory.decisions.push(decision);
  }

  /**
   * Updates the current phase of email generation
   */
  updatePhase(
    phase: SharedContext['state']['phase'],
    subPhase?: string,
    progress?: number
  ): void {
    this.context.state.phase = phase;
    if (subPhase) this.context.state.subPhase = subPhase;
    if (progress !== undefined) this.context.state.progress = progress;
  }

  /**
   * Records a handoff between agents
   */
  recordHandoff(
    from: string,
    to: string,
    reason: string,
    data: Record<string, any>
  ): void {
    this.context.collaboration.handoffs.push({
      from,
      to,
      timestamp: new Date(),
      reason,
      data,
    });
  }

  /**
   * Records research findings
   */
  setResearchFindings(
    articles: NewsArticle[],
    angle: Angle,
    relevanceScores: Record<string, number>
  ): void {
    this.context.memory.researchFindings = {
      articles,
      angle,
      relevanceScores,
    };
  }

  /**
   * Records a new draft version
   */
  addDraftVersion(
    content: string,
    feedback?: SharedContext['memory']['draftHistory'][0]['feedback']
  ): void {
    this.context.memory.draftHistory.push({
      version: this.context.memory.draftHistory.length,
      content,
      timestamp: new Date(),
      feedback,
    });
  }

  /**
   * Records a suggestion from one agent to another
   */
  addSuggestion(agent: string, suggestion: string, context: string): void {
    this.context.collaboration.suggestions.push({
      agent,
      timestamp: new Date(),
      suggestion,
      context,
      status: 'pending',
    });
  }

  /**
   * Updates the status of a suggestion
   */
  updateSuggestionStatus(index: number, status: 'accepted' | 'rejected'): void {
    if (this.context.collaboration.suggestions[index]) {
      this.context.collaboration.suggestions[index].status = status;
    }
  }

  /**
   * Records an error and its recovery attempts
   */
  recordError(agent: string, message: string): void {
    this.context.state.error = {
      agent,
      message,
      timestamp: new Date(),
      recoveryAttempts: 0,
    };
  }

  /**
   * Increments the recovery attempts for the current error
   */
  incrementRecoveryAttempts(): void {
    if (this.context.state.error) {
      this.context.state.error.recoveryAttempts++;
    }
  }

  /**
   * Clears the current error state
   */
  clearError(): void {
    delete this.context.state.error;
  }

  /**
   * Updates performance metrics
   */
  updatePerformance(
    metrics: Partial<SharedContext['memory']['performance']>
  ): void {
    Object.assign(this.context.memory.performance, metrics);
  }

  /**
   * Gets the current context state
   */
  getContext(): SharedContext {
    return { ...this.context };
  }

  /**
   * Gets the latest draft version
   */
  getLatestDraft(): string | null {
    const history = this.context.memory.draftHistory;
    return history.length > 0 ? history[history.length - 1].content : null;
  }

  /**
   * Gets all decisions made by a specific agent
   */
  getAgentDecisions(agent: string): AgentDecision[] {
    return this.context.memory.decisions.filter((d) => d.agent === agent);
  }

  /**
   * Gets the current error state if any
   */
  getCurrentError(): SharedContext['state']['error'] | undefined {
    return this.context.state.error;
  }

  /**
   * Gets all pending suggestions
   */
  getPendingSuggestions(): SharedContext['collaboration']['suggestions'] {
    return this.context.collaboration.suggestions.filter(
      (s) => s.status === 'pending'
    );
  }
}
