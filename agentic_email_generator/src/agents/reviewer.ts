/**
 * Reviewer Agent
 * Responsible for evaluating and improving email drafts to ensure
 * quality, effectiveness, and alignment with goals.
 */

import { Contact, NewsArticle, Angle } from '../models/models';
import { ChatOpenAI } from '@langchain/openai';
import { BaseAgent } from './base';
import { ContextManager, SharedContext } from '../models/context';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize the OpenAI chat model
const llm = new ChatOpenAI({
  modelName: process.env.MODEL_NAME || 'gpt-4-turbo',
  temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
  maxTokens: parseInt(process.env.MAX_TOKENS || '4000'),
  openAIApiKey: process.env.OPENAI_API_KEY,
});

export interface EmailContext {
  contact: Contact;
  articles: NewsArticle[];
  angle: Angle;
  revisionCount: number;
}

export interface QualityCriteria {
  minLength: number;
  maxLength: number;
  requiredElements: string[];
  tone: string[];
  forbidden: string[];
}

export interface ReviewResult {
  approved: boolean;
  score: number;
  suggestions: string[];
  improvedContent?: string;
  analysis?: {
    toneScore: number;
    personalizationScore: number;
    contentRelevance: number;
    structureQuality: number;
    improvementAreas: string[];
    styleMatch?: string;
    toneMatch?: string;
    clarity?: number;
    engagement?: number;
    contextualRelevance?: number;
    improvements?: {
      suggestion: string;
      impact: number;
      reasoning: string;
    }[];
  };
}

export class ReviewerAgent extends BaseAgent {
  private readonly MAX_REVISIONS = 3;
  private readonly DEFAULT_CRITERIA: QualityCriteria = {
    minLength: 100,
    maxLength: 500,
    requiredElements: ['greeting', 'value proposition', 'call to action'],
    tone: ['professional', 'friendly', 'concise'],
    forbidden: ['spam', 'aggressive', 'pushy'],
  };

  constructor(contextManager: ContextManager) {
    super(contextManager, 'reviewer');
  }

  /**
   * Gets valid phases for this agent
   */
  protected getValidPhases(): SharedContext['state']['phase'][] {
    return ['review', 'revision'];
  }

  /**
   * Implements fallback strategy for review failures
   */
  protected async getFallbackStrategy(): Promise<ReviewResult> {
    // Return a conservative review result
    return {
      approved: false,
      score: 0,
      suggestions: ['Manual review required due to analysis failure'],
      analysis: {
        toneScore: 0,
        personalizationScore: 0,
        contentRelevance: 0,
        structureQuality: 0,
        improvementAreas: ['manual_review_needed'],
      },
    };
  }

  /**
   * Reviews an email draft using autonomous analysis with multiple phases
   */
  async review(
    draft: string,
    context: EmailContext,
    criteria: Partial<QualityCriteria> = {}
  ): Promise<ReviewResult> {
    // Verify we can proceed
    if (!this.canProceed()) {
      throw new Error(
        'Cannot proceed with review - invalid state or blocking suggestions'
      );
    }

    const finalCriteria = { ...this.DEFAULT_CRITERIA, ...criteria };

    // Check revision limit
    if (context.revisionCount >= this.MAX_REVISIONS) {
      return {
        approved: false,
        score: 0,
        suggestions: [
          'Maximum revision limit reached. Manual review required.',
        ],
      };
    }

    try {
      // Record start time for performance tracking
      const startTime = Date.now();

      // Phase 1: Initial Analysis
      this.updatePhase('review', 'initial_analysis', 0.2);
      const initialAnalysis = await this.performInitialAnalysis(draft, context);

      // Record initial analysis decision
      this.recordDecision(
        'initial_analysis',
        `Initial analysis completed with score ${initialAnalysis.score}`,
        0.8,
        { score: initialAnalysis.score }
      );

      // Phase 2: Detailed Review
      this.updatePhase('review', 'detailed_review', 0.4);
      const detailedReview = await this.performDetailedReview(
        draft,
        context,
        finalCriteria,
        initialAnalysis
      );

      // Phase 3: Improvement Generation (if needed)
      let improvements;
      if (detailedReview.score < 80) {
        this.updatePhase('review', 'improvement_generation', 0.6);
        improvements = await this.generateImprovements(
          draft,
          context,
          detailedReview
        );
        detailedReview.improvedContent = improvements.improvedContent;
        if (detailedReview.analysis) {
          detailedReview.analysis.improvements = improvements.improvements;
        }
      }

      // Phase 4: Final Validation
      this.updatePhase('review', 'final_validation', 0.8);
      const finalReview = await this.validateReview(detailedReview, context);

      // Update shared context with review results
      this.contextManager.addDraftVersion(draft, {
        score: finalReview.score,
        suggestions: finalReview.suggestions,
        improvements:
          finalReview.analysis?.improvements?.map((imp) => imp.suggestion) ||
          [],
      });

      // Record performance metrics
      this.recordPerformance({
        reviewTime: Date.now() - startTime,
      });

      // Record final decision
      this.recordDecision(
        'review_completion',
        `Review completed with ${
          finalReview.approved ? 'approval' : 'rejection'
        }`,
        0.9,
        {
          approved: finalReview.approved,
          score: finalReview.score,
        }
      );

      this.updatePhase('review', 'complete', 1);

      return finalReview;
    } catch (error) {
      // Attempt recovery using fallback strategy
      return this.handleError(
        async () => {
          throw error;
        },
        async () => this.getFallbackStrategy()
      );
    }
  }

  /**
   * Performs initial quick analysis of the draft
   */
  private async performInitialAnalysis(
    draft: string,
    context: EmailContext
  ): Promise<ReviewResult> {
    const prompt = `Perform a quick initial analysis of this email draft.

Draft:
${draft}

Context:
- Contact: ${context.contact.name} (${context.contact.title})
- Goal: ${context.angle.title}

Previous Reviews:
${this.summarizePreviousReviews()}

Provide a JSON response with:
- score: Initial quality score (0-100)
- analysis: {
    toneScore: 0-100,
    contentRelevance: 0-100,
    improvementAreas: Array of major areas needing attention
  }`;

    const response = await llm.invoke([
      { role: 'system', content: 'You are an expert email reviewer.' },
      { role: 'user', content: prompt },
    ]);

    return JSON.parse(response.content.toString());
  }

  /**
   * Performs detailed review incorporating contact history and patterns
   */
  private async performDetailedReview(
    draft: string,
    context: EmailContext,
    criteria: QualityCriteria,
    initialAnalysis: ReviewResult
  ): Promise<ReviewResult> {
    const sharedContext = this.getSharedContext();
    const previousDrafts = sharedContext.memory.draftHistory;

    const prompt = `Perform a detailed review of this email draft.

Draft:
${draft}

Initial Analysis:
${JSON.stringify(initialAnalysis.analysis)}

Context:
- Contact: ${context.contact.name} (${context.contact.title})
- Goal: ${context.angle.title}
- Previous Drafts: ${previousDrafts.length}
- Previous Feedback: ${this.summarizePreviousFeedback()}

Quality Criteria:
${JSON.stringify(criteria, null, 2)}

Provide a comprehensive JSON analysis including:
- score: Detailed quality score (0-100)
- approved: Boolean indicating if email meets standards
- analysis: {
    toneScore: 0-100,
    personalizationScore: 0-100,
    contentRelevance: 0-100,
    structureQuality: 0-100,
    clarity: 0-100,
    engagement: 0-100,
    contextualRelevance: 0-100,
    styleMatch: string,
    toneMatch: string,
    improvementAreas: Array of specific areas needing improvement
  }
- suggestions: Array of detailed improvement suggestions`;

    const response = await llm.invoke([
      { role: 'system', content: 'You are an expert email reviewer.' },
      { role: 'user', content: prompt },
    ]);

    return JSON.parse(response.content.toString());
  }

  /**
   * Generates specific improvements with reasoning
   */
  private async generateImprovements(
    draft: string,
    context: EmailContext,
    review: ReviewResult
  ): Promise<{
    improvedContent: string;
    improvements: { suggestion: string; impact: number; reasoning: string }[];
  }> {
    const sharedContext = this.getSharedContext();
    const previousDrafts = sharedContext.memory.draftHistory;

    const prompt = `Generate specific improvements for this email draft.

Draft:
${draft}

Review Analysis:
${JSON.stringify(review.analysis)}

Context:
- Contact: ${context.contact.name}
- Previous Drafts: ${previousDrafts.length}
- Previous Feedback: ${this.summarizePreviousFeedback()}

For each improvement area, provide:
- Specific suggestion
- Expected impact (0-100)
- Detailed reasoning

Also generate an improved version of the entire email.

Return as JSON with:
- improvedContent: string
- improvements: Array of {suggestion, impact, reasoning}`;

    const response = await llm.invoke([
      { role: 'system', content: 'You are an expert email improver.' },
      { role: 'user', content: prompt },
    ]);

    return JSON.parse(response.content.toString());
  }

  /**
   * Performs final validation of the review
   */
  private async validateReview(
    review: ReviewResult,
    context: EmailContext
  ): Promise<ReviewResult> {
    const sharedContext = this.getSharedContext();
    const previousDrafts = sharedContext.memory.draftHistory;

    // Adjust scores based on historical patterns
    if (previousDrafts.length > 0) {
      const successfulDrafts = previousDrafts.filter(
        (draft) => draft.feedback && draft.feedback.score >= 80
      );

      if (successfulDrafts.length > 0) {
        // Boost scores for matching successful patterns
        if (review.analysis) {
          review.analysis.toneScore *= 1.1;
          review.analysis.personalizationScore *= 1.1;
        }
      }
    }

    return review;
  }

  /**
   * Summarizes previous reviews
   */
  private summarizePreviousReviews(): string {
    const sharedContext = this.getSharedContext();
    const previousDrafts = sharedContext.memory.draftHistory;

    if (!previousDrafts.length) {
      return 'No previous reviews';
    }

    const avgScore =
      previousDrafts.reduce(
        (sum, draft) => sum + (draft.feedback?.score || 0),
        0
      ) / previousDrafts.length;

    return `${
      previousDrafts.length
    } previous reviews, avg score: ${avgScore.toFixed(1)}`;
  }

  /**
   * Summarizes previous feedback
   */
  private summarizePreviousFeedback(): string {
    const sharedContext = this.getSharedContext();
    const previousDrafts = sharedContext.memory.draftHistory;

    if (!previousDrafts.length) {
      return 'No previous feedback';
    }

    const allSuggestions = previousDrafts.flatMap(
      (draft) => draft.feedback?.suggestions || []
    );

    if (!allSuggestions.length) {
      return 'No previous suggestions';
    }

    // Count suggestion frequencies
    const suggestionCounts = allSuggestions.reduce((acc, suggestion) => {
      acc[suggestion] = (acc[suggestion] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Return most common suggestions
    return Object.entries(suggestionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([suggestion, count]) => `${suggestion} (${count}x)`)
      .join(', ');
  }
}
