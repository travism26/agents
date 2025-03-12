/**
 * Orchestrator for coordinating the cover letter generation process
 */

import {
  ResearchAgent,
  CompanyResearchResult,
} from '../agents/research/ResearchAgent';
import {
  WriterAgent,
  CoverLetterTone,
  CoverLetterApproach,
  CoverLetterResult as WriterResult,
} from '../agents/writer/WriterAgent';
import { EvaluatorAgent } from '../agents/evaluator/EvaluatorAgent';
import {
  FeedbackLoop,
  FeedbackIteration,
  FeedbackLoopResult,
} from '../agents/evaluator/FeedbackLoop';
import { InputSanitizer } from '../utils/inputSanitizer';
import { OrchestratorStateManager } from './OrchestratorState';
import {
  CoverLetterRequest,
  CoverLetterResult,
  MultiCoverLetterResult,
  EvaluationResult,
  OrchestratorOptions,
  ProgressUpdate,
} from './interfaces/OrchestratorTypes';
import logger from '../utils/logger';

/**
 * Orchestrator class for coordinating the cover letter generation process
 */
export class Orchestrator {
  private researchAgent: ResearchAgent;
  private writerAgent: WriterAgent;
  private evaluatorAgent: EvaluatorAgent;
  private feedbackLoop: FeedbackLoop;
  private stateManager: OrchestratorStateManager;
  private sanitizer: InputSanitizer;
  private options: Required<OrchestratorOptions>;

  /**
   * Creates a new Orchestrator instance
   * @param researchAgent The research agent
   * @param writerAgent The writer agent
   * @param evaluatorAgent The evaluator agent
   * @param options Optional orchestrator options
   */
  constructor(
    researchAgent: ResearchAgent,
    writerAgent: WriterAgent,
    evaluatorAgent: EvaluatorAgent,
    options: OrchestratorOptions = {}
  ) {
    this.researchAgent = researchAgent;
    this.writerAgent = writerAgent;
    this.evaluatorAgent = evaluatorAgent;
    this.feedbackLoop = new FeedbackLoop({
      evaluatorAgent,
      writerAgent,
    });
    this.sanitizer = new InputSanitizer();

    // Set default options
    this.options = {
      maxIterations: options.maxIterations ?? 3,
      minApprovalScore: options.minApprovalScore ?? 7.0,
      enableParallelProcessing: options.enableParallelProcessing ?? false,
      onProgress: options.onProgress ?? (() => {}),
      generateMultiple: options.generateMultiple ?? false,
      approaches: options.approaches ?? [],
      customTemplate: options.customTemplate ?? '',
    };

    // Initialize state manager
    this.stateManager = new OrchestratorStateManager(
      this.options.maxIterations,
      this.options.onProgress
    );

    logger.info('Orchestrator initialized');
  }

  /**
   * Generates a cover letter based on the provided request
   * @param request The cover letter request
   * @returns Promise resolving to the cover letter result
   */
  public async generateCoverLetter(
    request: CoverLetterRequest
  ): Promise<CoverLetterResult> {
    try {
      // Initialize state
      this.stateManager.initializeState(request);
      logger.info('Starting cover letter generation process');

      // Sanitize inputs
      const sanitizedCompanyName = this.sanitizer.sanitizeCompanyName(
        request.companyName
      );
      const sanitizedJobTitle = this.sanitizer.sanitizeJobTitle(
        request.jobTitle
      );
      const sanitizedJobDescription = request.jobDescription
        ? this.sanitizer.sanitizeJobDescription(request.jobDescription)
        : '';

      // Step 1: Research the company
      this.stateManager.startResearch();
      logger.info(`Researching company: ${sanitizedCompanyName}`);

      const companyResearch = await this.researchAgent.researchCompany(
        sanitizedCompanyName,
        sanitizedJobDescription
      );

      this.stateManager.completeResearch(companyResearch);
      logger.info('Company research completed');

      // Step 2: Generate initial cover letter draft
      this.stateManager.startWriting();
      logger.info('Generating initial cover letter draft');

      const writerOptions = this.createWriterOptions(
        request,
        companyResearch,
        sanitizedJobTitle,
        sanitizedJobDescription
      );

      const initialDraft = await this.writerAgent.generateCoverLetter(
        writerOptions
      );

      this.stateManager.completeDraft(initialDraft.coverLetter);
      logger.info('Initial cover letter draft completed');

      // Step 3: Evaluate and refine in a feedback loop
      this.stateManager.startEvaluation();
      logger.info('Evaluating cover letter quality');

      const evaluationOptions = {
        jobTitle: sanitizedJobTitle,
        companyName: companyResearch.companyName,
        jobDescription: sanitizedJobDescription,
        candidateSkills: request.resume.skills?.join(', ') || '',
        candidateExperience: request.resume.experience
          .map((exp) => `${exp.title} at ${exp.company}`)
          .join(', '),
      };

      const feedbackResult = await this.feedbackLoop.run(
        initialDraft.coverLetter,
        evaluationOptions
      );

      // Process each iteration
      for (let i = 0; i < feedbackResult.iterations.length; i++) {
        const iteration = feedbackResult.iterations[i];

        // Map evaluation result to the format expected by the state manager
        const mappedEvaluation: EvaluationResult = {
          approved:
            iteration.evaluationResult.overallScore >=
            this.options.minApprovalScore,
          score: iteration.evaluationResult.overallScore,
          feedback: iteration.evaluationResult.feedback.map(
            (item) => item.feedback
          ),
          suggestedImprovements: iteration.evaluationResult.feedback.flatMap(
            (item) => item.suggestions
          ),
        };

        // Update state for each iteration
        this.stateManager.completeEvaluation(mappedEvaluation);

        // If not the last iteration, start refinement
        if (i < feedbackResult.iterations.length - 1) {
          this.stateManager.startRefinement();
          logger.info(`Refining cover letter (iteration ${i + 1})`);
        }
      }

      // Map final evaluation to the format expected by the result
      const finalEvaluation: EvaluationResult = {
        approved:
          feedbackResult.finalEvaluation.overallScore >=
          this.options.minApprovalScore,
        score: feedbackResult.finalEvaluation.overallScore,
        feedback: feedbackResult.finalEvaluation.feedback.map(
          (item) => item.feedback
        ),
        suggestedImprovements: feedbackResult.finalEvaluation.feedback.flatMap(
          (item) => item.suggestions
        ),
      };

      // Update final state
      this.stateManager.completeEvaluation(finalEvaluation);
      this.stateManager.completeDraft(feedbackResult.finalCoverLetter);
      this.stateManager.completeProcess();

      logger.info(
        `Cover letter generation completed after ${feedbackResult.iterationCount} iterations`
      );

      // Return the final result
      return {
        coverLetter: feedbackResult.finalCoverLetter,
        companyResearch,
        evaluation: finalEvaluation,
        iterations: feedbackResult.iterationCount,
      };
    } catch (error: any) {
      // Handle errors
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Cover letter generation failed: ${errorMessage}`);
      this.stateManager.failProcess(errorMessage);
      throw error;
    }
  }

  /**
   * Creates writer options from the request and research data
   * @param request The cover letter request
   * @param companyResearch The company research results
   * @param jobTitle The sanitized job title
   * @param jobDescription The sanitized job description
   * @returns The writer options
   */
  private createWriterOptions(
    request: CoverLetterRequest,
    companyResearch: CompanyResearchResult,
    jobTitle: string,
    jobDescription: string
  ): any {
    // Extract candidate information from resume
    const candidateName = request.resume.personalInfo.name;

    // Format candidate skills
    const candidateSkills = request.resume.skills
      ? request.resume.skills.join(', ')
      : '';

    // Format candidate experience
    const candidateExperience = request.resume.experience
      .map(
        (exp) =>
          `${exp.title} at ${exp.company}${
            exp.duration ? ` (${exp.duration})` : ''
          }${exp.description ? `: ${exp.description}` : ''}`
      )
      .join('\n');

    // Format candidate education
    const candidateEducation = request.resume.education
      .map(
        (edu) =>
          `${edu.degree} from ${edu.institution}${
            edu.year ? ` (${edu.year})` : ''
          }`
      )
      .join('\n');

    // Format company information
    const companyInfo = [
      companyResearch.companyInfo.description,
      `Industry: ${companyResearch.companyInfo.industry || 'Not specified'}`,
      `Size: ${companyResearch.companyInfo.size || 'Not specified'}`,
      `Founded: ${companyResearch.companyInfo.founded || 'Not specified'}`,
    ].join('\n');

    // Format company values
    const companyValues = companyResearch.companyValues.join(', ');

    // Return writer options
    return {
      candidateName,
      jobTitle,
      companyName: companyResearch.companyName,
      companyInfo,
      companyValues,
      jobDescription,
      candidateSkills,
      candidateExperience,
      candidateEducation,
      tone: this.mapTonePreference(request.tonePreference),
    };
  }

  /**
   * Maps the tone preference from the request to a CoverLetterTone
   * @param tonePreference The tone preference from the request
   * @returns The corresponding CoverLetterTone
   */
  private mapTonePreference(tonePreference?: CoverLetterTone): CoverLetterTone {
    if (!tonePreference) {
      return CoverLetterTone.PROFESSIONAL;
    }
    return tonePreference;
  }

  /**
   * Gets the current state of the orchestration process
   * @returns The current state
   */
  public getState() {
    return this.stateManager.getState();
  }

  /**
   * Generates multiple cover letters with different approaches based on the provided request
   * @param request The cover letter request
   * @returns Promise resolving to the multiple cover letter result
   */
  public async generateMultipleCoverLetters(
    request: CoverLetterRequest
  ): Promise<MultiCoverLetterResult> {
    try {
      // Initialize state
      this.stateManager.initializeState(request, true);
      logger.info('Starting multiple cover letter generation process');

      // Sanitize inputs
      const sanitizedCompanyName = this.sanitizer.sanitizeCompanyName(
        request.companyName
      );
      const sanitizedJobTitle = this.sanitizer.sanitizeJobTitle(
        request.jobTitle
      );
      const sanitizedJobDescription = request.jobDescription
        ? this.sanitizer.sanitizeJobDescription(request.jobDescription)
        : '';

      // Step 1: Research the company (shared for all cover letters)
      this.stateManager.startResearch();
      logger.info(`Researching company: ${sanitizedCompanyName}`);

      const companyResearch = await this.researchAgent.researchCompany(
        sanitizedCompanyName,
        sanitizedJobDescription
      );

      this.stateManager.completeResearch(companyResearch);
      logger.info('Company research completed');

      // Step 2: Generate multiple cover letter drafts
      this.stateManager.startWriting(request.approaches?.length || 0);
      logger.info('Generating multiple cover letter drafts');

      const writerOptions = this.createWriterOptions(
        request,
        companyResearch,
        sanitizedJobTitle,
        sanitizedJobDescription
      );

      // Create options for multiple cover letter generation
      const multiOptions = {
        ...writerOptions,
        variations: {
          count: request.approaches?.length || 0,
          approaches: request.approaches || [],
        },
        customTemplate: request.customTemplate,
      };

      // Generate multiple cover letters
      const multiResult = await this.writerAgent.generateMultipleCoverLetters(
        multiOptions
      );

      // Store all drafts in state manager
      const drafts = multiResult.coverLetters.map((result) => ({
        coverLetter: result.coverLetter,
        approach: result.approach || 'STANDARD',
      }));
      this.stateManager.completeMultipleDrafts(drafts);
      logger.info('Multiple cover letter drafts completed');

      // Step 3: Evaluate each cover letter (optional parallel processing)
      this.stateManager.startEvaluation(drafts.length);
      logger.info('Evaluating cover letter quality');

      const evaluationOptions = {
        jobTitle: sanitizedJobTitle,
        companyName: companyResearch.companyName,
        jobDescription: sanitizedJobDescription,
        candidateSkills: request.resume.skills?.join(', ') || '',
        candidateExperience: request.resume.experience
          .map((exp) => `${exp.title} at ${exp.company}`)
          .join(', '),
      };

      // Process each cover letter evaluation (sequentially or in parallel)
      const evaluationPromises = drafts.map(async (draft, index) => {
        try {
          // Evaluate the cover letter
          const evaluationResult =
            await this.evaluatorAgent.evaluateCoverLetter(
              draft.coverLetter,
              evaluationOptions
            );

          // Map evaluation result to the format expected by the state manager
          const mappedEvaluation: EvaluationResult = {
            approved:
              evaluationResult.overallScore >= this.options.minApprovalScore,
            score: evaluationResult.overallScore,
            feedback: evaluationResult.feedback.map((item) => item.feedback),
            suggestedImprovements: evaluationResult.feedback.flatMap(
              (item) => item.suggestions
            ),
          };

          // Return the result with approach information
          return {
            approach: draft.approach,
            evaluation: mappedEvaluation,
            coverLetter: draft.coverLetter,
          };
        } catch (error) {
          logger.error(
            `Error evaluating cover letter with approach ${draft.approach}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );

          // Return a default evaluation with error information
          return {
            approach: draft.approach,
            evaluation: {
              approved: false,
              score: 0,
              feedback: [
                `Error evaluating cover letter: ${
                  error instanceof Error ? error.message : 'Unknown error'
                }`,
              ],
              suggestedImprovements: ['Try generating a new cover letter'],
            },
            coverLetter: draft.coverLetter,
          };
        }
      });

      // Wait for all evaluations to complete
      const evaluationResults = this.options.enableParallelProcessing
        ? await Promise.all(evaluationPromises)
        : [];

      // If not using parallel processing, evaluate sequentially
      if (!this.options.enableParallelProcessing) {
        for (const promise of evaluationPromises) {
          const result = await promise;
          evaluationResults.push(result);
        }
      }

      // Update state with all evaluations
      this.stateManager.completeMultipleEvaluations(
        evaluationResults.map((result) => ({
          approach: result.approach,
          evaluation: result.evaluation,
        }))
      );

      // Complete the process
      this.stateManager.completeProcess();
      logger.info('Multiple cover letter generation completed');

      // Map results to the expected format
      const coverLetterResults: CoverLetterResult[] = evaluationResults.map(
        (result) => ({
          coverLetter: result.coverLetter,
          companyResearch,
          evaluation: result.evaluation,
          iterations: 1, // No refinement for multiple cover letters
          approach: result.approach as CoverLetterApproach,
        })
      );

      // Return the final result
      return {
        coverLetters: coverLetterResults,
        companyResearch,
      };
    } catch (error: any) {
      // Handle errors
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Multiple cover letter generation failed: ${errorMessage}`);
      this.stateManager.failProcess(errorMessage);
      throw error;
    }
  }

  /**
   * Gets the duration of the process in milliseconds
   * @returns The duration or undefined if the process is still running
   */
  public getDuration(): number | undefined {
    return this.stateManager.getDuration();
  }
}
