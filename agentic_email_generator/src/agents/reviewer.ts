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
import util from 'util';

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
    console.log('INFO - Initiating fallback review strategy');
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
    emailContext: EmailContext,
    criteria: Partial<QualityCriteria> = {}
  ): Promise<ReviewResult> {
    console.log('INFO - Starting email review', {
      contactName: emailContext.contact.name,
      revisionCount: emailContext.revisionCount,
      draftLength: draft.length,
    });

    // Get shared context state
    const sharedContext = this.getSharedContext();

    console.log('DEBUG - Starting review process', {
      currentPhase: sharedContext.state.phase,
      handoffs: sharedContext.collaboration.handoffs,
      pendingSuggestions: this.getPendingSuggestions().length,
    });

    // Wait for phase transition to complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Validate handoff from writer with expected data structure
    if (
      !this.validateHandoff('writer', {
        draft: '',
        emailContext: {
          contact: {},
          articles: [],
          angle: {},
          revisionCount: 0,
        },
      })
    ) {
      console.error('ERROR - Invalid handoff from writer', {
        phase: sharedContext.state.phase,
        handoffs: sharedContext.collaboration.handoffs,
        pendingSuggestions: this.getPendingSuggestions().length,
      });
      console.error(
        'mtravis - handoffs:',
        util.inspect(sharedContext.collaboration.handoffs, false, null, true)
      );
      throw new Error('Invalid or missing handoff from writer agent');
    }

    // Log review context
    console.log('DEBUG - Review context', {
      draftLength: draft.length,
      contactName: emailContext.contact.name,
      articleCount: emailContext.articles.length,
      revisionCount: emailContext.revisionCount,
    });

    // Verify we can proceed
    if (!this.canProceed()) {
      console.error('ERROR - Cannot proceed with review', {
        phase: sharedContext.state.phase,
        pendingSuggestions: this.getPendingSuggestions(),
        error: sharedContext.state.error,
      });
      throw new Error(
        'Cannot proceed with review - invalid state or blocking suggestions'
      );
    }

    const finalCriteria = { ...this.DEFAULT_CRITERIA, ...criteria };

    // Check revision limit
    if (emailContext.revisionCount >= this.MAX_REVISIONS) {
      console.warn('WARN - Maximum revision limit reached', {
        revisionCount: emailContext.revisionCount,
        maxRevisions: this.MAX_REVISIONS,
      });
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
      console.log('DEBUG - Starting initial analysis');
      const initialAnalysis = await this.performInitialAnalysis(
        draft,
        emailContext
      );

      console.log('INFO - Initial analysis completed', {
        score: initialAnalysis.score,
        toneScore: initialAnalysis.analysis?.toneScore,
        contentRelevance: initialAnalysis.analysis?.contentRelevance,
      });

      // Record initial analysis decision
      this.recordDecision(
        'initial_analysis',
        `Initial analysis completed with score ${initialAnalysis.score}`,
        0.8,
        { score: initialAnalysis.score }
      );

      // Phase 2: Detailed Review
      this.updatePhase('review', 'detailed_review', 0.4);
      console.log('DEBUG - Starting detailed review');
      const detailedReview = await this.performDetailedReview(
        draft,
        emailContext,
        finalCriteria,
        initialAnalysis
      );

      // Phase 3: Improvement Generation (if needed)
      let improvements;
      if (detailedReview.score < 80) {
        console.log('INFO - Draft requires improvements', {
          score: detailedReview.score,
          improvementAreas: detailedReview.analysis?.improvementAreas,
        });
        this.updatePhase('review', 'improvement_generation', 0.6);
        improvements = await this.generateImprovements(
          draft,
          emailContext,
          detailedReview
        );
        detailedReview.improvedContent = improvements.improvedContent;
        if (detailedReview.analysis) {
          detailedReview.analysis.improvements = improvements.improvements;
        }
      }

      // Phase 4: Final Validation
      this.updatePhase('review', 'final_validation', 0.8);
      console.log('DEBUG - Starting final validation');
      const finalReview = await this.validateReview(
        detailedReview,
        emailContext
      );

      console.log('INFO - Review validation completed', {
        approved: finalReview.approved,
        finalScore: finalReview.score,
        suggestionCount: finalReview.suggestions.length,
      });

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
      console.log('mtravis - error:', error);
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
    console.log('DEBUG - Performing initial analysis', {
      draftLength: draft.length,
      contactTitle: context.contact.title,
    });

    const prompt = `
    <Purpose>
    Perform a quick initial analysis of this email draft.
    </Purpose>

    <Draft>
    ${draft}
    </Draft>

    <Context>
      <Contact>
        ${context.contact.name} (${context.contact.title})
      </Contact>
      <Goal>${context.angle.title}</Goal>
      <PreviousReviews>
        ${this.summarizePreviousReviews()}
      </PreviousReviews>
    </Context>

    <Instructions>
      <Instruction>
        Provide a quick initial assessment with:
        <Analysis>
          <Score>Initial quality score (0-100)</Score>
          <Components>
            <ToneScore>0-100</ToneScore>
            <ContentRelevance>0-100</ContentRelevance>
            <ImprovementAreas>Array of major areas needing attention</ImprovementAreas>
          </Components>
        </Analysis>
      </Instruction>
    </Instructions>

    <ResponseFormat>
    Return a valid JSON object with exactly the following keys and nothing else:
    {
      "score": "Initial quality score (0-100)",
      "analysis": {
        "toneScore": "0-100",
        "contentRelevance": "0-100",
        "improvementAreas": ["Array of major areas needing attention"]
      }
    }

    YOU MUST RETURN A VALID JSON OBJECT ONLY, NO OTHER TEXT OR FORMATTING.
    </ResponseFormat>`;

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
    console.log('DEBUG - Starting detailed review', {
      initialScore: initialAnalysis.score,
      criteriaElements: criteria.requiredElements.length,
    });
    const sharedContext = this.getSharedContext();
    const previousDrafts = sharedContext.memory.draftHistory;

    const improvedPrompt = `
    <Purpose>
    Perform a detailed review of this email draft.
    </Purpose>

    <Draft>
    ${draft}
    </Draft>

    <InitialAnalysis>
    ${JSON.stringify(initialAnalysis.analysis)}
    </InitialAnalysis>

    <Context>
      <Contact>
        ${context.contact.name} (${context.contact.title})
      </Contact>
      <Goal>${context.angle.title}</Goal>
      <PreviousDrafts>
        ${previousDrafts.length}
      </PreviousDrafts>
      <PreviousFeedback>
        ${this.summarizePreviousFeedback()}
      </PreviousFeedback>
    </Context>

    <QualityCriteria>
    ${JSON.stringify(criteria, null, 2)}
    </QualityCriteria>

    <Instructions>
      <Instruction>
        Provide a comprehensive JSON analysis including:
        <Analysis>
          <Score>0-100</Score>
          <Analysis>
            <ToneScore>0-100</ToneScore>
            <PersonalizationScore>0-100</PersonalizationScore>
            <ContentRelevance>0-100</ContentRelevance>
            <StructureQuality>0-100</StructureQuality>
            <Clarity>0-100</Clarity>
            <Engagement>0-100</Engagement>
            <ContextualRelevance>0-100</ContextualRelevance>
            <StyleMatch>string</StyleMatch>
            <ToneMatch>string</ToneMatch>
            <ImprovementAreas>Array of specific areas needing improvement</ImprovementAreas>
          </Analysis>
        </Analysis>
      </Instruction>
      <Instruction>
        Analyze the draft against the quality criteria.
      </Instruction>
      <Instruction>
        Generate specific improvement suggestions.
      </Instruction>
    </Instructions>

    <ResponseFormat>
    Return a valid JSON object with exactly the following keys and nothing else:
    {
      "score": "Detailed quality score (0-100)",
      "approved": "Boolean indicating if email meets standards",
      "analysis": {
        "toneScore": "0-100",
        "personalizationScore": "0-100",
        "contentRelevance": "0-100",
        "structureQuality": "0-100",
        "clarity": "0-100",
        "engagement": "0-100",
        "contextualRelevance": "0-100",
        "styleMatch": "string describing writing style match",
        "toneMatch": "string describing tone appropriateness",
        "improvementAreas": ["Array of specific areas needing improvement"]
      },
      "suggestions": ["Array of detailed improvement suggestions"]
    }

    YOU MUST RETURN A VALID JSON OBJECT ONLY, NO OTHER TEXT OR FORMATTING.
    </ResponseFormat>`;

    const response = await llm.invoke([
      { role: 'system', content: 'You are an expert email reviewer.' },
      { role: 'user', content: improvedPrompt },
    ]);

    console.log(
      'mtravis - response:',
      util.inspect(response.content, false, null, true)
    );

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
    console.log('DEBUG - Generating improvements', {
      currentScore: review.score,
      improvementAreas: review.analysis?.improvementAreas,
    });
    const sharedContext = this.getSharedContext();
    const previousDrafts = sharedContext.memory.draftHistory;

    const improvedPrompt = `
    <Purpose>
    Generate specific improvements for this email draft.
    </Purpose>

    <CurrentDraft>
    ${draft}
    </CurrentDraft>

    <ReviewAnalysis>
    ${JSON.stringify(review.analysis)}
    </ReviewAnalysis>

    <Context>
      <Contact>
        ${context.contact.name} (${context.contact.title})
      </Contact>
      <PreviousDrafts>
        ${previousDrafts.length}
      </PreviousDrafts>
      <PreviousFeedback>
        ${this.summarizePreviousFeedback()}
      </PreviousFeedback>
    </Context>

    <Instructions>
      <Instruction>For each improvement area, provide:
        <ImprovementArea>
          <Suggestion>Specific suggestion</Suggestion>
          <ExpectedImpact>Expected impact (0-100)</ExpectedImpact>
          <Reasoning>Detailed reasoning</Reasoning>
        </ImprovementArea>
      </Instruction>
      <Instruction>Also generate an improved version of the entire email.</Instruction>
    </Instructions>

    <ResponseFormat>
    Return a valid JSON object with exactly the following keys and nothing else:
    {
      "improvedContent": "The complete improved email text",
      "improvements": [
        {
          "suggestion": "Specific improvement suggestion",
          "impact": "Impact score (0-100)",
          "reasoning": "Detailed explanation of the improvement"
        }
      ]
    }
    
    YOU MUST RETURN A VALID JSON OBJECT ONLY, NO OTHER TEXT OR FORMATTING.
    </ResponseFormat>
    `;

    console.log('mtravis - improvedPrompt:', improvedPrompt);

    const response = await llm.invoke([
      { role: 'system', content: 'You are an expert email improver.' },
      { role: 'user', content: improvedPrompt },
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
    console.log('DEBUG - Validating review results', {
      score: review.score,
      hasImprovements: !!review.improvedContent,
    });
    const sharedContext = this.getSharedContext();
    const previousDrafts = sharedContext.memory.draftHistory;

    // Adjust scores based on historical patterns
    if (previousDrafts.length > 0) {
      const successfulDrafts = previousDrafts.filter(
        (draft) => draft.feedback && draft.feedback.score >= 80
      );

      if (successfulDrafts.length > 0) {
        console.log('DEBUG - Applying historical pattern boost', {
          successfulDraftsCount: successfulDrafts.length,
        });
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
