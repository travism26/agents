import { IGeneratedEmail } from '../models/GeneratedEmail';

/**
 * Common status types for all agents
 */
export enum AgentStatus {
  IDLE = 'idle',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
}

/**
 * Base configuration interface that all agent configs must extend
 */
export interface BaseAgentConfig {
  maxRetries: number;
  timeoutMs: number;
  debug?: boolean;
}

/**
 * Base result interface that all agent results must extend
 */
export interface BaseAgentResult {
  success: boolean;
  status: AgentStatus;
  error?: Error;
  metadata?: Record<string, any>;
}

/**
 * Base Agent interface defining common functionality across all agents
 */
export interface IAgent {
  status: AgentStatus;
  initialize(): Promise<void>;
  process(data: any): Promise<BaseAgentResult>;
  handleError(error: Error): Promise<void>;
  cleanup(): Promise<void>;
}

/**
 * Abstract base agent class implementing common functionality
 */
export abstract class BaseAgent implements IAgent {
  protected config: BaseAgentConfig;
  protected retryCount: number = 0;
  private _status: AgentStatus = AgentStatus.IDLE;

  constructor(config: Partial<BaseAgentConfig>) {
    this.config = {
      maxRetries: 3,
      timeoutMs: 30000,
      debug: false,
      ...config,
    };
  }

  get status(): AgentStatus {
    return this._status;
  }

  protected set status(newStatus: AgentStatus) {
    this._status = newStatus;
  }

  /**
   * Initialize agent resources and connections
   */
  public async initialize(): Promise<void> {
    this.status = AgentStatus.IDLE;
    this.retryCount = 0;
  }

  /**
   * Process the input data and return a result
   * @param data Input data for processing
   */
  public abstract process(data: any): Promise<BaseAgentResult>;

  /**
   * Handle errors that occur during processing
   * @param error The error that occurred
   */
  public async handleError(error: Error): Promise<void> {
    this.status = AgentStatus.FAILED;

    if (this.config.debug) {
      console.error(`Agent error: ${error.message}`, {
        name: this.constructor.name,
        error,
        retryCount: this.retryCount,
      });
    }

    if (this.retryCount < this.config.maxRetries) {
      this.retryCount++;
      this.status = AgentStatus.IDLE;
    }
  }

  /**
   * Clean up agent resources
   */
  public async cleanup(): Promise<void> {
    this.status = AgentStatus.IDLE;
  }

  /**
   * Utility method to create a timeout promise
   * @param ms Timeout duration in milliseconds
   */
  protected createTimeout(ms: number = this.config.timeoutMs): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${ms}ms`));
      }, ms);
    });
  }

  /**
   * Utility method to execute an operation with timeout
   * @param operation The async operation to execute
   */
  protected async executeWithTimeout<T>(operation: Promise<T>): Promise<T> {
    return Promise.race([operation, this.createTimeout()]);
  }

  /**
   * Update the generated email document with the agent's progress
   * @param emailDoc The generated email document to update
   * @param update The update to apply
   */
  protected async updateGeneratedEmail(
    emailDoc: IGeneratedEmail,
    update: Partial<IGeneratedEmail>
  ): Promise<void> {
    try {
      Object.assign(emailDoc, update);
      await emailDoc.save();
    } catch (error) {
      await this.handleError(error as Error);
      throw error;
    }
  }
}
