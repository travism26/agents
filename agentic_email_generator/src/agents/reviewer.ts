/**
 * Reviewer Agent
 * Responsible for evaluating and improving email drafts to ensure
 * quality, effectiveness, and alignment with goals.
 */

import { Contact, NewsArticle, Angle } from '../models/models';
import { ChatOpenAI } from '@langchain/openai';
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
  };
}

export class ReviewerAgent {
  private readonly MAX_REVISIONS = 3;
  private readonly DEFAULT_CRITERIA: QualityCriteria = {
    minLength: 100,
    maxLength: 500,
    requiredElements: ['greeting', 'value proposition', 'call to action'],
    tone: ['professional', 'friendly', 'concise'],
    forbidden: ['spam', 'aggressive', 'pushy'],
  };

  private context: {
    previousReviews: ReviewResult[];
    commonIssues: Map<string, number>;
    successPatterns: Map<string, number>;
    lastReviewTime?: Date;
  };

  constructor() {
    this.context = {
      previousReviews: [],
      commonIssues: new Map(),
      successPatterns: new Map(),
    };
  }

  /**
   * Reviews an email draft using autonomous analysis
   */
  async review(
    draft: string,
    context: EmailContext,
    criteria: Partial<QualityCriteria> = {}
  ): Promise<ReviewResult> {
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

    // Perform autonomous analysis
    const analysis = await this.analyzeContent(draft, context, finalCriteria);

    // Update context with review results
    this.updateContext(analysis);

    return analysis;
  }

  /**
   * Performs comprehensive content analysis using LLM
   */
  private async analyzeContent(
    draft: string,
    context: EmailContext,
    criteria: QualityCriteria
  ): Promise<ReviewResult> {
    const prompt = `As an expert email reviewer, analyze this email draft for quality and effectiveness.

Draft:
${draft}

Context:
- Contact: ${context.contact.name} (${context.contact.title} at ${
      context.contact.company
    })
- Goal: ${context.angle.title}
- Previous Reviews: ${this.summarizePreviousReviews()}
- Common Issues: ${this.summarizeCommonIssues()}

Quality Criteria:
- Length: ${criteria.minLength}-${criteria.maxLength} chars
- Required Elements: ${criteria.requiredElements.join(', ')}
- Tone: ${criteria.tone.join(', ')}
- Forbidden Elements: ${criteria.forbidden.join(', ')}

Provide a JSON response with:
- score: Overall quality score (0-100)
- approved: Boolean indicating if email meets quality standards
- suggestions: Array of specific improvement suggestions
- analysis: {
    toneScore: 0-100,
    personalizationScore: 0-100,
    contentRelevance: 0-100,
    structureQuality: 0-100,
    improvementAreas: Array of areas needing improvement
  }`;

    const response = await llm.invoke([
      { role: 'system', content: 'You are an expert email reviewer.' },
      { role: 'user', content: prompt },
    ]);

    const result = JSON.parse(response.content.toString());

    // If score is low, generate improved content
    if (result.score < 80) {
      result.improvedContent = await this.generateImprovedContent(
        draft,
        context,
        result.suggestions
      );
    }

    return result;
  }

  /**
   * Generates improved content based on review findings
   */
  private async generateImprovedContent(
    draft: string,
    context: EmailContext,
    suggestions: string[]
  ): Promise<string> {
    const prompt = `Improve this email draft based on the following suggestions.

Original Draft:
${draft}

Context:
- Contact: ${context.contact.name} (${context.contact.title} at ${
      context.contact.company
    })
- Goal: ${context.angle.title}

Suggestions:
${suggestions.join('\n')}

Success Patterns:
${this.summarizeSuccessPatterns()}

Generate an improved version that addresses all suggestions while maintaining the original intent.`;

    const response = await llm.invoke([
      { role: 'system', content: 'You are an expert email writer.' },
      { role: 'user', content: prompt },
    ]);

    return response.content.toString();
  }

  /**
   * Updates agent's context with new review information
   */
  private updateContext(review: ReviewResult) {
    this.context.previousReviews.push(review);
    this.context.lastReviewTime = new Date();

    // Update common issues
    review.analysis?.improvementAreas.forEach((area) => {
      this.context.commonIssues.set(
        area,
        (this.context.commonIssues.get(area) || 0) + 1
      );
    });

    // Update success patterns if review was approved
    if (review.approved) {
      const patterns = this.extractSuccessPatterns(review);
      patterns.forEach((pattern) => {
        this.context.successPatterns.set(
          pattern,
          (this.context.successPatterns.get(pattern) || 0) + 1
        );
      });
    }
  }

  /**
   * Extracts success patterns from approved reviews
   */
  private extractSuccessPatterns(review: ReviewResult): string[] {
    const patterns: string[] = [];

    const { analysis } = review;
    if (!analysis) return patterns;

    if ((analysis.toneScore || 0) >= 90) {
      patterns.push('high_tone_alignment');
    }
    if ((analysis.personalizationScore || 0) >= 90) {
      patterns.push('strong_personalization');
    }
    if ((analysis.contentRelevance || 0) >= 90) {
      patterns.push('high_content_relevance');
    }
    if ((analysis.structureQuality || 0) >= 90) {
      patterns.push('excellent_structure');
    }

    return patterns;
  }

  /**
   * Summarizes previous review results
   */
  private summarizePreviousReviews(): string {
    if (!this.context.previousReviews.length) {
      return 'No previous reviews';
    }

    const avgScore =
      this.context.previousReviews.reduce((sum, r) => sum + r.score, 0) /
      this.context.previousReviews.length;

    return `${
      this.context.previousReviews.length
    } previous reviews, avg score: ${avgScore.toFixed(1)}`;
  }

  /**
   * Summarizes common issues found in reviews
   */
  private summarizeCommonIssues(): string {
    if (!this.context.commonIssues.size) {
      return 'No common issues identified';
    }

    return Array.from(this.context.commonIssues.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([issue, count]) => `${issue} (${count}x)`)
      .join(', ');
  }

  /**
   * Summarizes patterns found in successful emails
   */
  private summarizeSuccessPatterns(): string {
    if (!this.context.successPatterns.size) {
      return 'No success patterns established';
    }

    return Array.from(this.context.successPatterns.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([pattern, count]) => `${pattern} (${count}x)`)
      .join(', ');
  }
}
