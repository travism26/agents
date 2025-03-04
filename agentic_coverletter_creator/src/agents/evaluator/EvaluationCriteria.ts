import logger from '../../utils/logger';

/**
 * Evaluation category for cover letter assessment
 */
export enum EvaluationCategory {
  GRAMMAR = 'GRAMMAR',
  STYLE = 'STYLE',
  RELEVANCE = 'RELEVANCE',
  COMPLETENESS = 'COMPLETENESS',
  OVERALL = 'OVERALL',
}

/**
 * Evaluation score level
 */
export enum ScoreLevel {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  SATISFACTORY = 'SATISFACTORY',
  NEEDS_IMPROVEMENT = 'NEEDS_IMPROVEMENT',
  POOR = 'POOR',
}

/**
 * Score range for each level
 */
export const SCORE_RANGES = {
  [ScoreLevel.EXCELLENT]: { min: 90, max: 100 },
  [ScoreLevel.GOOD]: { min: 75, max: 89 },
  [ScoreLevel.SATISFACTORY]: { min: 60, max: 74 },
  [ScoreLevel.NEEDS_IMPROVEMENT]: { min: 40, max: 59 },
  [ScoreLevel.POOR]: { min: 0, max: 39 },
};

/**
 * Feedback item for a specific evaluation category
 */
export interface FeedbackItem {
  category: EvaluationCategory;
  score: number;
  level: ScoreLevel;
  feedback: string;
  suggestions: string[];
}

/**
 * Evaluation result for a cover letter
 */
export interface EvaluationResult {
  overallScore: number;
  overallLevel: ScoreLevel;
  feedback: FeedbackItem[];
  summary: string;
  improvementPriorities: EvaluationCategory[];
}

/**
 * Options for cover letter evaluation
 */
export interface EvaluationOptions {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  candidateSkills: string;
  candidateExperience: string;
  customCriteria?: {
    category: EvaluationCategory;
    weight: number;
    description: string;
  }[];
}

/**
 * Default weights for each evaluation category
 */
export const DEFAULT_CATEGORY_WEIGHTS = {
  [EvaluationCategory.GRAMMAR]: 0.2,
  [EvaluationCategory.STYLE]: 0.2,
  [EvaluationCategory.RELEVANCE]: 0.3,
  [EvaluationCategory.COMPLETENESS]: 0.3,
  [EvaluationCategory.OVERALL]: 0, // Not used directly in calculations, derived from other categories
};

/**
 * Class for defining and applying evaluation criteria to cover letters
 */
export class EvaluationCriteria {
  private categoryWeights: Record<EvaluationCategory, number>;

  /**
   * Creates a new EvaluationCriteria instance
   * @param customWeights Optional custom weights for evaluation categories
   */
  constructor(customWeights?: Partial<Record<EvaluationCategory, number>>) {
    // Initialize with default weights
    this.categoryWeights = { ...DEFAULT_CATEGORY_WEIGHTS };

    // Apply custom weights if provided
    if (customWeights) {
      Object.entries(customWeights).forEach(([category, weight]) => {
        if (
          Object.values(EvaluationCategory).includes(
            category as EvaluationCategory
          ) &&
          weight >= 0 &&
          weight <= 1
        ) {
          this.categoryWeights[category as EvaluationCategory] = weight;
        } else {
          logger.warn(`Invalid category or weight: ${category}, ${weight}`);
        }
      });

      // Normalize weights to ensure they sum to 1
      this.normalizeWeights();
    }

    logger.info(
      'EvaluationCriteria initialized with weights:',
      this.categoryWeights
    );
  }

  /**
   * Normalizes the category weights to ensure they sum to 1
   * Excludes the OVERALL category from normalization
   */
  private normalizeWeights(): void {
    // Calculate sum of weights excluding OVERALL
    const sum = Object.entries(this.categoryWeights).reduce(
      (acc, [category, weight]) =>
        category !== EvaluationCategory.OVERALL ? acc + weight : acc,
      0
    );

    if (sum > 0 && sum !== 1) {
      // Normalize all weights except OVERALL
      Object.entries(this.categoryWeights).forEach(([category, weight]) => {
        if (category !== EvaluationCategory.OVERALL) {
          this.categoryWeights[category as EvaluationCategory] /= sum;
        }
      });
    }
  }

  /**
   * Gets the score level based on a numeric score
   * @param score The numeric score (0-100)
   * @returns The corresponding score level
   */
  public getScoreLevel(score: number): ScoreLevel {
    if (score >= SCORE_RANGES[ScoreLevel.EXCELLENT].min) {
      return ScoreLevel.EXCELLENT;
    } else if (score >= SCORE_RANGES[ScoreLevel.GOOD].min) {
      return ScoreLevel.GOOD;
    } else if (score >= SCORE_RANGES[ScoreLevel.SATISFACTORY].min) {
      return ScoreLevel.SATISFACTORY;
    } else if (score >= SCORE_RANGES[ScoreLevel.NEEDS_IMPROVEMENT].min) {
      return ScoreLevel.NEEDS_IMPROVEMENT;
    } else {
      return ScoreLevel.POOR;
    }
  }

  /**
   * Gets the weight for a specific evaluation category
   * @param category The evaluation category
   * @returns The weight for the category
   */
  public getCategoryWeight(category: EvaluationCategory): number {
    return this.categoryWeights[category] || 0;
  }

  /**
   * Sets the weight for a specific evaluation category
   * @param category The evaluation category
   * @param weight The weight to set (0-1)
   * @param normalize Whether to normalize weights after setting (default: true)
   * @throws Error if the category is invalid or weight is out of range
   */
  public setCategoryWeight(
    category: EvaluationCategory,
    weight: number,
    normalize: boolean = true
  ): void {
    if (!Object.values(EvaluationCategory).includes(category)) {
      throw new Error(`Invalid evaluation category: ${category}`);
    }

    if (weight < 0 || weight > 1) {
      throw new Error(`Weight must be between 0 and 1, got: ${weight}`);
    }

    this.categoryWeights[category] = weight;

    if (normalize) {
      this.normalizeWeights();
    }
  }

  /**
   * Gets the criteria description for a specific evaluation category
   * @param category The evaluation category
   * @returns The criteria description
   */
  public getCriteriaDescription(category: EvaluationCategory): string {
    switch (category) {
      case EvaluationCategory.GRAMMAR:
        return 'Correct grammar, spelling, and punctuation';
      case EvaluationCategory.STYLE:
        return 'Professional tone, clear language, appropriate formality, and good flow';
      case EvaluationCategory.RELEVANCE:
        return 'Alignment with job requirements, company values, and industry standards';
      case EvaluationCategory.COMPLETENESS:
        return 'Includes all necessary components: introduction, skills/experience highlight, company fit, call to action, and closing';
      case EvaluationCategory.OVERALL:
        return 'Overall quality and effectiveness of the cover letter';
      default:
        return 'Unknown category';
    }
  }

  /**
   * Creates evaluation prompts for assessing a cover letter
   * @param coverLetter The cover letter to evaluate
   * @param options The evaluation options
   * @returns An object containing prompts for each evaluation category
   */
  public createEvaluationPrompts(
    coverLetter: string,
    options: EvaluationOptions
  ): Record<EvaluationCategory, string> {
    const prompts: Record<EvaluationCategory, string> = {} as Record<
      EvaluationCategory,
      string
    >;

    // Grammar and style prompt
    prompts[EvaluationCategory.GRAMMAR] = `
      Evaluate the following cover letter for grammar, spelling, and punctuation.
      Identify any errors and suggest corrections.
      
      Cover Letter:
      ${coverLetter}
      
      Provide a score from 0-100 and specific feedback on grammar issues.
    `;

    // Style prompt
    prompts[EvaluationCategory.STYLE] = `
      Evaluate the following cover letter for writing style, tone, clarity, and flow.
      Consider professional tone, clear language, appropriate formality, and good paragraph transitions.
      
      Cover Letter:
      ${coverLetter}
      
      Provide a score from 0-100 and specific feedback on style issues.
    `;

    // Relevance prompt
    prompts[EvaluationCategory.RELEVANCE] = `
      Evaluate how well the following cover letter addresses the specific job requirements and company values.
      
      Cover Letter:
      ${coverLetter}
      
      Job Title: ${options.jobTitle}
      Company: ${options.companyName}
      Job Description: ${options.jobDescription}
      Candidate Skills: ${options.candidateSkills}
      Candidate Experience: ${options.candidateExperience}
      
      Provide a score from 0-100 and specific feedback on relevance issues.
    `;

    // Completeness prompt
    prompts[EvaluationCategory.COMPLETENESS] = `
      Evaluate whether the following cover letter includes all necessary components:
      1. Introduction with position and company name
      2. Skills and experience highlights relevant to the position
      3. Explanation of fit with company culture and values
      4. Call to action (interview request)
      5. Professional closing
      
      Cover Letter:
      ${coverLetter}
      
      Provide a score from 0-100 and specific feedback on completeness issues.
    `;

    // Overall evaluation prompt
    prompts[EvaluationCategory.OVERALL] = `
      Provide an overall evaluation of the following cover letter for the position of ${options.jobTitle} at ${options.companyName}.
      Consider grammar, style, relevance to the job requirements, and completeness.
      
      Cover Letter:
      ${coverLetter}
      
      Job Description: ${options.jobDescription}
      Candidate Skills: ${options.candidateSkills}
      Candidate Experience: ${options.candidateExperience}
      
      Provide an overall score from 0-100, a summary of strengths and weaknesses, and prioritized improvement suggestions.
    `;

    return prompts;
  }

  /**
   * Calculates the overall score based on individual category scores and weights
   * @param scores The scores for each category
   * @returns The calculated overall score
   */
  public calculateOverallScore(
    scores: Partial<Record<EvaluationCategory, number>>
  ): number {
    let totalScore = 0;
    let totalWeight = 0;

    // Calculate weighted score for each category
    Object.entries(scores).forEach(([category, score]) => {
      if (category !== EvaluationCategory.OVERALL) {
        const weight =
          this.categoryWeights[category as EvaluationCategory] || 0;
        totalScore += score * weight;
        totalWeight += weight;
      }
    });

    // Normalize if not all categories are present
    if (totalWeight > 0 && totalWeight < 1) {
      totalScore /= totalWeight;
    }

    return Math.round(totalScore);
  }

  /**
   * Determines improvement priorities based on category scores
   * @param scores The scores for each category
   * @returns Array of categories ordered by priority for improvement (lowest scores first)
   */
  public determineImprovementPriorities(
    scores: Partial<Record<EvaluationCategory, number>>
  ): EvaluationCategory[] {
    return Object.entries(scores)
      .filter(([category]) => category !== EvaluationCategory.OVERALL)
      .sort(([categoryA, scoreA], [categoryB, scoreB]) => {
        // Sort by score (ascending)
        if (scoreA !== scoreB) {
          return scoreA - scoreB;
        }

        // If scores are equal, sort by weight (descending)
        const weightA =
          this.categoryWeights[categoryA as EvaluationCategory] || 0;
        const weightB =
          this.categoryWeights[categoryB as EvaluationCategory] || 0;
        return weightB - weightA;
      })
      .map(([category]) => category as EvaluationCategory);
  }
}
