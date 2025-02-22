/**
 * CEFR (Common European Framework of Reference for Languages) level validation
 */

export enum CEFRLevel {
  A1 = 'A1', // Beginner
  A2 = 'A2', // Elementary
  B1 = 'B1', // Intermediate
  B2 = 'B2', // Upper Intermediate
  C1 = 'C1', // Advanced
  C2 = 'C2', // Mastery
}

interface CEFRMetrics {
  vocabularyComplexity: number; // 0-1 scale
  grammarAccuracy: number; // 0-1 scale
  sentenceComplexity: number; // 0-1 scale
  textCoherence: number; // 0-1 scale
}

interface CEFRValidationResult {
  level: CEFRLevel;
  metrics: CEFRMetrics;
  issues: string[];
}

// CEFR level thresholds for each metric
const levelThresholds: Record<CEFRLevel, CEFRMetrics> = {
  [CEFRLevel.A1]: {
    vocabularyComplexity: 0.2,
    grammarAccuracy: 0.3,
    sentenceComplexity: 0.2,
    textCoherence: 0.2,
  },
  [CEFRLevel.A2]: {
    vocabularyComplexity: 0.3,
    grammarAccuracy: 0.4,
    sentenceComplexity: 0.3,
    textCoherence: 0.3,
  },
  [CEFRLevel.B1]: {
    vocabularyComplexity: 0.5,
    grammarAccuracy: 0.6,
    sentenceComplexity: 0.5,
    textCoherence: 0.5,
  },
  [CEFRLevel.B2]: {
    vocabularyComplexity: 0.7,
    grammarAccuracy: 0.7,
    sentenceComplexity: 0.6,
    textCoherence: 0.6,
  },
  [CEFRLevel.C1]: {
    vocabularyComplexity: 0.8,
    grammarAccuracy: 0.8,
    sentenceComplexity: 0.8,
    textCoherence: 0.8,
  },
  [CEFRLevel.C2]: {
    vocabularyComplexity: 0.9,
    grammarAccuracy: 0.9,
    sentenceComplexity: 0.9,
    textCoherence: 0.9,
  },
};

// Common business vocabulary by CEFR level
const businessVocabulary: Record<CEFRLevel, string[]> = {
  [CEFRLevel.A1]: [
    'meeting',
    'email',
    'office',
    'work',
    'phone',
    'hello',
    'goodbye',
    'please',
    'thank you',
    'help',
  ],
  [CEFRLevel.A2]: [
    'company',
    'business',
    'customer',
    'product',
    'service',
    'price',
    'schedule',
    'appointment',
    'department',
    'manager',
  ],
  [CEFRLevel.B1]: [
    'proposal',
    'deadline',
    'budget',
    'project',
    'team',
    'report',
    'presentation',
    'conference',
    'strategy',
    'feedback',
  ],
  [CEFRLevel.B2]: [
    'implementation',
    'negotiation',
    'collaboration',
    'initiative',
    'objective',
    'performance',
    'development',
    'analysis',
    'investment',
    'partnership',
  ],
  [CEFRLevel.C1]: [
    'stakeholder',
    'optimization',
    'sustainability',
    'diversification',
    'acquisition',
    'methodology',
    'infrastructure',
    'compliance',
    'innovation',
    'strategic alignment',
  ],
  [CEFRLevel.C2]: [
    'paradigm shift',
    'value proposition',
    'synergy',
    'scalability',
    'monetization',
    'disruptive innovation',
    'market penetration',
    'competitive advantage',
    'operational excellence',
    'strategic differentiation',
  ],
};

export class CEFRValidator {
  /**
   * Analyze text complexity and assign CEFR level
   */
  static analyzeText(text: string): CEFRValidationResult {
    const metrics = CEFRValidator.calculateMetrics(text);
    const level = CEFRValidator.determineCEFRLevel(metrics);
    const issues = CEFRValidator.identifyIssues(text, metrics, level);

    return {
      level,
      metrics,
      issues,
    };
  }

  /**
   * Calculate text metrics based on various factors
   */
  private static calculateMetrics(text: string): CEFRMetrics {
    const words = text.toLowerCase().split(/\s+/);
    const sentences = text.split(/[.!?]+/).filter(Boolean);

    // Calculate vocabulary complexity
    const uniqueWords = new Set(words);
    const vocabularyComplexity = Math.min(
      (uniqueWords.size / words.length) * 2,
      1
    );

    // Calculate grammar accuracy (simplified)
    const grammarAccuracy = CEFRValidator.estimateGrammarAccuracy(text);

    // Calculate sentence complexity
    const avgWordsPerSentence = words.length / sentences.length;
    const sentenceComplexity = Math.min(avgWordsPerSentence / 30, 1);

    // Calculate text coherence
    const textCoherence = CEFRValidator.estimateTextCoherence(text);

    return {
      vocabularyComplexity,
      grammarAccuracy,
      sentenceComplexity,
      textCoherence,
    };
  }

  /**
   * Estimate grammar accuracy using basic patterns
   */
  private static estimateGrammarAccuracy(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(Boolean);
    let score = 0;

    for (const sentence of sentences) {
      // Check for basic sentence structure
      if (/^[A-Z].*[.!?]?\s*$/.test(sentence)) score++;
      // Check for subject-verb agreement
      if (/\b(is|are|was|were)\b/.test(sentence)) score++;
      // Check for proper punctuation
      if (/[.!?]\s*$/.test(sentence)) score++;
    }

    return Math.min(score / (sentences.length * 3), 1);
  }

  /**
   * Estimate text coherence using basic patterns
   */
  private static estimateTextCoherence(text: string): number {
    const coherenceMarkers = [
      'therefore',
      'however',
      'moreover',
      'furthermore',
      'consequently',
      'in addition',
      'as a result',
      'for example',
      'in conclusion',
      'nevertheless',
    ];

    const words = text.toLowerCase().split(/\s+/);
    const markerCount = coherenceMarkers.reduce(
      (count, marker) => count + words.filter((word) => word === marker).length,
      0
    );

    return Math.min(markerCount / (words.length / 20), 1);
  }

  /**
   * Determine CEFR level based on metrics
   */
  private static determineCEFRLevel(metrics: CEFRMetrics): CEFRLevel {
    const levels = Object.values(CEFRLevel);
    for (let i = levels.length - 1; i >= 0; i--) {
      const level = levels[i];
      const threshold = levelThresholds[level];

      if (
        metrics.vocabularyComplexity >= threshold.vocabularyComplexity &&
        metrics.grammarAccuracy >= threshold.grammarAccuracy &&
        metrics.sentenceComplexity >= threshold.sentenceComplexity &&
        metrics.textCoherence >= threshold.textCoherence
      ) {
        return level;
      }
    }

    return CEFRLevel.A1;
  }

  /**
   * Identify potential issues in the text
   */
  private static identifyIssues(
    text: string,
    metrics: CEFRMetrics,
    level: CEFRLevel
  ): string[] {
    const issues: string[] = [];
    const threshold = levelThresholds[level];

    if (metrics.vocabularyComplexity < threshold.vocabularyComplexity) {
      issues.push(
        'Vocabulary complexity is below target level. Consider using more varied and sophisticated terms.'
      );
    }

    if (metrics.grammarAccuracy < threshold.grammarAccuracy) {
      issues.push(
        'Grammar accuracy needs improvement. Review sentence structures and verb agreements.'
      );
    }

    if (metrics.sentenceComplexity < threshold.sentenceComplexity) {
      issues.push(
        'Sentence complexity is below target level. Consider using more complex sentence structures.'
      );
    }

    if (metrics.textCoherence < threshold.textCoherence) {
      issues.push(
        'Text coherence could be improved. Add more transition words and logical connections.'
      );
    }

    return issues;
  }

  /**
   * Check if text meets minimum CEFR level requirements
   */
  static meetsMinimumLevel(
    text: string,
    minimumLevel: CEFRLevel
  ): { meets: boolean; actual: CEFRLevel; issues: string[] } {
    const result = CEFRValidator.analyzeText(text);
    const meets =
      Object.values(CEFRLevel).indexOf(result.level) >=
      Object.values(CEFRLevel).indexOf(minimumLevel);

    return {
      meets,
      actual: result.level,
      issues: meets ? [] : result.issues,
    };
  }
}
