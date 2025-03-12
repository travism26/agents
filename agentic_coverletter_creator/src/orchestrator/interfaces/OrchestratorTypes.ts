/**
 * Types and interfaces for the Orchestrator component
 */

import { Resume } from '../../utils/resumeParser';
import { CompanyResearchResult } from '../../agents/research/ResearchAgent';
import {
  CoverLetterTone,
  CoverLetterApproach,
} from '../../agents/writer/WriterAgent';

/**
 * Input parameters for the cover letter generation process
 */
export interface CoverLetterRequest {
  /** The parsed resume data */
  resume: Resume;

  /** The name of the company being applied to */
  companyName: string;

  /** The title of the job being applied for */
  jobTitle: string;

  /** Optional job description text */
  jobDescription?: string;

  /** Optional preference for the tone of the cover letter */
  tonePreference?: CoverLetterTone;

  /** Optional approach for the cover letter */
  approach?: CoverLetterApproach;

  /** Optional flag to generate multiple cover letters */
  generateMultiple?: boolean;

  /** Optional approaches for multiple cover letter generation */
  approaches?: CoverLetterApproach[];

  /** Optional custom template for cover letter generation */
  customTemplate?: string;
}

/**
 * Result of the evaluation process
 */
export interface EvaluationResult {
  /** Whether the cover letter meets quality standards */
  approved: boolean;

  /** Numerical score (typically 1-10) */
  score: number;

  /** Feedback comments on the cover letter */
  feedback: string[];

  /** Suggested improvements for the cover letter */
  suggestedImprovements?: string[];
}

/**
 * Final result of the cover letter generation process
 */
export interface CoverLetterResult {
  /** The generated cover letter text */
  coverLetter: string;

  /** Research data about the company */
  companyResearch: CompanyResearchResult;

  /** Evaluation results for the final cover letter */
  evaluation: EvaluationResult;

  /** Number of iterations performed to reach the final result */
  iterations: number;

  /** The approach used for this cover letter */
  approach?: CoverLetterApproach;
}

/**
 * Final result of multiple cover letter generation process
 */
export interface MultiCoverLetterResult {
  /** Array of generated cover letters */
  coverLetters: CoverLetterResult[];

  /** Research data about the company (shared across all cover letters) */
  companyResearch: CompanyResearchResult;
}

/**
 * Status of the orchestration process
 */
export enum OrchestratorStatus {
  IDLE = 'idle',
  RESEARCHING = 'researching',
  WRITING = 'writing',
  EVALUATING = 'evaluating',
  REFINING = 'refining',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * State of the orchestration process
 */
export interface OrchestratorState {
  /** Current status of the orchestration process */
  status: OrchestratorStatus;

  /** Request parameters */
  request: CoverLetterRequest;

  /** Research data (if available) */
  companyResearch?: CompanyResearchResult;

  /** Current draft of the cover letter (if available) */
  currentDraft?: string;

  /** Current drafts for multiple cover letter generation (if available) */
  currentDrafts?: {
    coverLetter: string;
    approach: CoverLetterApproach | string;
  }[];

  /** Current evaluation results (if available) */
  currentEvaluation?: EvaluationResult;

  /** Current evaluation results for multiple cover letters (if available) */
  currentEvaluations?: {
    approach: CoverLetterApproach | string;
    evaluation: EvaluationResult;
  }[];

  /** Number of iterations performed */
  iterations: number;

  /** Maximum number of iterations allowed */
  maxIterations: number;

  /** Error message (if any) */
  error?: string;

  /** Timestamp when the process started */
  startTime: number;

  /** Timestamp when the process completed or failed */
  endTime?: number;

  /** Flag indicating if this is a multiple cover letter generation */
  isMultipleGeneration?: boolean;
}

/**
 * Progress update for the orchestration process
 */
export interface ProgressUpdate {
  /** Current status */
  status: OrchestratorStatus;

  /** Current step number */
  currentStep: number;

  /** Total number of steps */
  totalSteps: number;

  /** Description of the current step */
  description: string;

  /** Timestamp of the update */
  timestamp: number;
}

/**
 * Options for the Orchestrator
 */
export interface OrchestratorOptions {
  /** Maximum number of iterations for the feedback loop */
  maxIterations?: number;

  /** Minimum score required for approval */
  minApprovalScore?: number;

  /** Whether to enable parallel processing where possible */
  enableParallelProcessing?: boolean;

  /** Callback for progress updates */
  onProgress?: (update: ProgressUpdate) => void;

  /** Whether to generate multiple cover letters */
  generateMultiple?: boolean;

  /** Approaches to use for multiple cover letter generation */
  approaches?: CoverLetterApproach[];

  /** Custom template for cover letter generation */
  customTemplate?: string;
}
