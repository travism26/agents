/**
 * State management for the Orchestrator component
 */

import {
  OrchestratorState,
  OrchestratorStatus,
  CoverLetterRequest,
  ProgressUpdate,
} from './interfaces/OrchestratorTypes';
import { CoverLetterApproach } from '../agents/writer/WriterAgent';

/**
 * Manages the state of the orchestration process
 */
export class OrchestratorStateManager {
  private state: OrchestratorState;
  private progressCallback?: (update: ProgressUpdate) => void;
  private totalSteps: number = 4; // Research, Write, Evaluate, Refine (if needed)

  /**
   * Creates a new OrchestratorStateManager instance
   * @param maxIterations Maximum number of iterations for the feedback loop
   * @param progressCallback Optional callback for progress updates
   */
  constructor(
    maxIterations: number = 3,
    progressCallback?: (update: ProgressUpdate) => void
  ) {
    this.progressCallback = progressCallback;
    this.state = {
      status: OrchestratorStatus.IDLE,
      request: {} as CoverLetterRequest, // Will be set when process starts
      iterations: 0,
      maxIterations,
      startTime: 0,
    };
  }

  /**
   * Initializes the state with a new request
   * @param request The cover letter request
   * @param isMultipleGeneration Whether this is a multiple cover letter generation
   */
  public initializeState(
    request: CoverLetterRequest,
    isMultipleGeneration: boolean = false
  ): void {
    this.state = {
      status: OrchestratorStatus.IDLE,
      request,
      iterations: 0,
      maxIterations: this.state.maxIterations,
      startTime: Date.now(),
      isMultipleGeneration,
    };

    const processType = isMultipleGeneration
      ? 'multiple cover letter'
      : 'cover letter';
    this.emitProgressUpdate(`Initializing ${processType} generation process`);
  }

  /**
   * Updates the state to indicate research is in progress
   */
  public startResearch(): void {
    this.state.status = OrchestratorStatus.RESEARCHING;
    this.emitProgressUpdate('Researching company information');
  }

  /**
   * Updates the state with research results
   * @param companyResearch The company research results
   */
  public completeResearch(companyResearch: any): void {
    this.state.companyResearch = companyResearch;
    this.emitProgressUpdate('Company research completed');
  }

  /**
   * Updates the state to indicate writing is in progress
   * @param count Optional number of cover letters being generated
   */
  public startWriting(count: number = 1): void {
    this.state.status = OrchestratorStatus.WRITING;

    if (this.state.isMultipleGeneration) {
      this.emitProgressUpdate(`Generating ${count} cover letter drafts`);
    } else {
      this.emitProgressUpdate('Generating cover letter draft');
    }
  }

  /**
   * Updates the state with the generated cover letter draft
   * @param draft The generated cover letter draft
   */
  public completeDraft(draft: string): void {
    this.state.currentDraft = draft;
    this.emitProgressUpdate('Cover letter draft completed');
  }

  /**
   * Updates the state with multiple generated cover letter drafts
   * @param drafts The generated cover letter drafts with their approaches
   */
  public completeMultipleDrafts(
    drafts: { coverLetter: string; approach: CoverLetterApproach | string }[]
  ): void {
    this.state.currentDrafts = drafts;
    this.emitProgressUpdate(`${drafts.length} cover letter drafts completed`);
  }

  /**
   * Updates the state to indicate evaluation is in progress
   * @param count Optional number of cover letters being evaluated
   */
  public startEvaluation(count: number = 1): void {
    this.state.status = OrchestratorStatus.EVALUATING;

    if (this.state.isMultipleGeneration) {
      this.emitProgressUpdate(`Evaluating ${count} cover letter drafts`);
    } else {
      this.emitProgressUpdate('Evaluating cover letter quality');
    }
  }

  /**
   * Updates the state with evaluation results
   * @param evaluation The evaluation results
   */
  public completeEvaluation(evaluation: any): void {
    this.state.currentEvaluation = evaluation;
    this.emitProgressUpdate('Cover letter evaluation completed');
  }

  /**
   * Updates the state with multiple evaluation results
   * @param evaluations The evaluation results for multiple cover letters
   */
  public completeMultipleEvaluations(
    evaluations: { approach: CoverLetterApproach | string; evaluation: any }[]
  ): void {
    this.state.currentEvaluations = evaluations;
    this.emitProgressUpdate(
      `${evaluations.length} cover letter evaluations completed`
    );
  }

  /**
   * Updates the state to indicate refinement is in progress
   */
  public startRefinement(): void {
    this.state.status = OrchestratorStatus.REFINING;
    this.state.iterations++;
    this.emitProgressUpdate(
      `Refining cover letter (iteration ${this.state.iterations})`
    );
  }

  /**
   * Updates the state to indicate the process is complete
   */
  public completeProcess(): void {
    this.state.status = OrchestratorStatus.COMPLETED;
    this.state.endTime = Date.now();
    this.emitProgressUpdate('Cover letter generation completed');
  }

  /**
   * Updates the state to indicate the process has failed
   * @param error The error message
   */
  public failProcess(error: string): void {
    this.state.status = OrchestratorStatus.FAILED;
    this.state.error = error;
    this.state.endTime = Date.now();
    this.emitProgressUpdate(`Cover letter generation failed: ${error}`);
  }

  /**
   * Gets the current state
   * @returns The current state
   */
  public getState(): OrchestratorState {
    return { ...this.state }; // Return a copy to prevent direct modification
  }

  /**
   * Gets the current status
   * @returns The current status
   */
  public getStatus(): OrchestratorStatus {
    return this.state.status;
  }

  /**
   * Gets the current draft
   * @returns The current draft or undefined if not available
   */
  public getCurrentDraft(): string | undefined {
    return this.state.currentDraft;
  }

  /**
   * Gets the current evaluation
   * @returns The current evaluation or undefined if not available
   */
  public getCurrentEvaluation(): any | undefined {
    return this.state.currentEvaluation;
  }

  /**
   * Gets the number of iterations performed
   * @returns The number of iterations
   */
  public getIterations(): number {
    return this.state.iterations;
  }

  /**
   * Checks if the maximum number of iterations has been reached
   * @returns True if the maximum number of iterations has been reached
   */
  public isMaxIterationsReached(): boolean {
    return this.state.iterations >= this.state.maxIterations;
  }

  /**
   * Gets the duration of the process in milliseconds
   * @returns The duration or undefined if the process is still running
   */
  public getDuration(): number | undefined {
    if (!this.state.endTime) {
      return undefined;
    }
    return this.state.endTime - this.state.startTime;
  }

  /**
   * Emits a progress update
   * @param description Description of the current step
   */
  private emitProgressUpdate(description: string): void {
    if (!this.progressCallback) {
      return;
    }

    let currentStep = 1;
    switch (this.state.status) {
      case OrchestratorStatus.RESEARCHING:
        currentStep = 1;
        break;
      case OrchestratorStatus.WRITING:
        currentStep = 2;
        break;
      case OrchestratorStatus.EVALUATING:
        currentStep = 3;
        break;
      case OrchestratorStatus.REFINING:
        currentStep = 3 + this.state.iterations;
        break;
      case OrchestratorStatus.COMPLETED:
      case OrchestratorStatus.FAILED:
        currentStep = this.totalSteps;
        break;
    }

    const update: ProgressUpdate = {
      status: this.state.status,
      currentStep,
      totalSteps: this.totalSteps + Math.max(0, this.state.iterations - 1),
      description,
      timestamp: Date.now(),
    };

    this.progressCallback(update);
  }
}
