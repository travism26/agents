/**
 * Reviewer Agent
 * Responsible for evaluating and improving email drafts to ensure
 * quality, effectiveness, and alignment with goals.
 */

import { Contact, NewsArticle, Angle } from '../models/models';

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

  /**
   * Reviews an email draft against quality criteria
   * @param draft The email draft to review
   * @param context Email generation context including contact and content
   * @param criteria Optional custom quality criteria
   * @returns ReviewResult with approval status and improvement suggestions
   */
  async review(
    draft: string,
    context: EmailContext,
    criteria: Partial<QualityCriteria> = {}
  ): Promise<ReviewResult> {
    const finalCriteria = { ...this.DEFAULT_CRITERIA, ...criteria };
    const suggestions: string[] = [];
    let score = 100;

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

    // Length checks
    if (draft.length < finalCriteria.minLength) {
      score -= 20;
      suggestions.push(
        `Email is too short (${draft.length} chars). Minimum length is ${finalCriteria.minLength} chars.`
      );
    }
    if (draft.length > finalCriteria.maxLength) {
      score -= 20;
      suggestions.push(
        `Email is too long (${draft.length} chars). Maximum length is ${finalCriteria.maxLength} chars.`
      );
    }

    // Required elements check
    for (const element of finalCriteria.requiredElements) {
      if (!this.containsElement(draft.toLowerCase(), element)) {
        score -= 15;
        suggestions.push(`Missing required element: ${element}`);
      }
    }

    // Tone analysis
    const toneScore = this.analyzeTone(draft.toLowerCase(), finalCriteria.tone);
    score = Math.max(0, score - (100 - toneScore));
    if (toneScore < 70) {
      suggestions.push(
        'Tone does not match required style. Adjust for more professional and friendly language.'
      );
    }

    // Check for forbidden elements
    for (const forbidden of finalCriteria.forbidden) {
      if (draft.toLowerCase().includes(forbidden.toLowerCase())) {
        score -= 25;
        suggestions.push(`Contains forbidden element: ${forbidden}`);
      }
    }

    // Personalization check
    if (!draft.includes(context.contact.name)) {
      score -= 10;
      suggestions.push("Email should be personalized with contact's name");
    }

    // Article reference check
    const hasArticleReference = context.articles.some((article) =>
      draft.toLowerCase().includes(article.title.toLowerCase())
    );
    if (!hasArticleReference) {
      score -= 10;
      suggestions.push('Email should reference at least one news article');
    }

    return {
      approved: score >= 80 && suggestions.length === 0,
      score,
      suggestions:
        suggestions.length > 0
          ? suggestions
          : ['Email draft meets all quality criteria.'],
    };
  }

  /**
   * Checks if the draft contains a required element
   */
  private containsElement(draft: string, element: string): boolean {
    const elementPatterns = {
      greeting: /^(hi|hello|dear)\s+\w+/i,
      'value proposition': /(benefit|value|opportunity|advantage)/i,
      'call to action':
        /(let('s|\s+us)\s+|would you|can we|please|contact|reach out)/i,
    };

    const pattern = elementPatterns[element as keyof typeof elementPatterns];
    return pattern ? pattern.test(draft) : draft.includes(element);
  }

  /**
   * Analyzes the tone of the email
   */
  private analyzeTone(draft: string, requiredTones: string[]): number {
    let toneScore = 100;

    const toneIndicators = {
      professional: [
        'would',
        'could',
        'opportunity',
        'professional',
        'expertise',
        'experience',
        'solution',
        'value',
        'benefit',
      ],
      friendly: [
        'hope',
        'great',
        'looking forward',
        'appreciate',
        'thank you',
        'thanks',
        'pleasure',
        'enjoyed',
      ],
      concise: (text: string) => {
        const sentences = text
          .split(/[.!?]+/)
          .filter((s) => s.trim().length > 0);
        const avgLength =
          sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
        return avgLength < 20;
      },
    };

    for (const tone of requiredTones) {
      if (tone === 'concise') {
        if (!toneIndicators.concise(draft)) {
          toneScore -= 20;
        }
        continue;
      }

      const indicators = toneIndicators[
        tone as keyof typeof toneIndicators
      ] as string[];
      const matches = indicators.filter((indicator) =>
        draft.includes(indicator)
      );
      if (matches.length < 2) {
        toneScore -= 20;
      }
    }

    return Math.max(0, toneScore);
  }
}
