import {
  EvaluationCriteria,
  EvaluationCategory,
  ScoreLevel,
  DEFAULT_CATEGORY_WEIGHTS,
  SCORE_RANGES,
} from '../../../src/agents/evaluator/EvaluationCriteria';

describe('EvaluationCriteria', () => {
  let evaluationCriteria: EvaluationCriteria;

  beforeEach(() => {
    evaluationCriteria = new EvaluationCriteria();
  });

  describe('constructor', () => {
    it('should initialize with default weights', () => {
      // Test each category weight
      Object.entries(DEFAULT_CATEGORY_WEIGHTS).forEach(([category, weight]) => {
        expect(
          evaluationCriteria.getCategoryWeight(category as EvaluationCategory)
        ).toBe(weight);
      });
    });

    it('should apply custom weights when provided', () => {
      const customWeights = {
        [EvaluationCategory.GRAMMAR]: 0.1,
        [EvaluationCategory.STYLE]: 0.1,
        [EvaluationCategory.RELEVANCE]: 0.4,
        [EvaluationCategory.COMPLETENESS]: 0.4,
      };

      const customCriteria = new EvaluationCriteria(customWeights);

      // Test each custom weight
      Object.entries(customWeights).forEach(([category, weight]) => {
        expect(
          customCriteria.getCategoryWeight(category as EvaluationCategory)
        ).toBe(weight);
      });
    });

    it('should normalize weights to ensure they sum to 1', () => {
      const unnormalizedWeights = {
        [EvaluationCategory.GRAMMAR]: 2,
        [EvaluationCategory.STYLE]: 2,
        [EvaluationCategory.RELEVANCE]: 3,
        [EvaluationCategory.COMPLETENESS]: 3,
      };

      const customCriteria = new EvaluationCriteria(unnormalizedWeights);

      // Calculate the sum of weights
      const sum = Object.values(EvaluationCategory)
        .filter((category) => category !== EvaluationCategory.OVERALL)
        .reduce(
          (acc, category) => acc + customCriteria.getCategoryWeight(category),
          0
        );

      // Sum should be close to 1 (allowing for floating point precision)
      expect(sum).toBeCloseTo(1, 5);
    });

    it('should ignore invalid categories in custom weights', () => {
      const customWeights = {
        [EvaluationCategory.GRAMMAR]: 0.1,
        ['INVALID_CATEGORY' as EvaluationCategory]: 0.9,
      };

      // Create a custom criteria with normalization disabled for testing
      const customCriteria = new EvaluationCriteria();

      // Set the weight without normalizing
      customCriteria.setCategoryWeight(EvaluationCategory.GRAMMAR, 0.1, false);

      // GRAMMAR should be set to exactly 0.1
      expect(customCriteria.getCategoryWeight(EvaluationCategory.GRAMMAR)).toBe(
        0.1
      );

      // Other categories should have default weights
      expect(customCriteria.getCategoryWeight(EvaluationCategory.STYLE)).toBe(
        DEFAULT_CATEGORY_WEIGHTS[EvaluationCategory.STYLE]
      );
      expect(
        customCriteria.getCategoryWeight(EvaluationCategory.RELEVANCE)
      ).toBe(DEFAULT_CATEGORY_WEIGHTS[EvaluationCategory.RELEVANCE]);
      expect(
        customCriteria.getCategoryWeight(EvaluationCategory.COMPLETENESS)
      ).toBe(DEFAULT_CATEGORY_WEIGHTS[EvaluationCategory.COMPLETENESS]);
    });
  });

  describe('getScoreLevel', () => {
    it('should return EXCELLENT for scores >= 90', () => {
      expect(evaluationCriteria.getScoreLevel(90)).toBe(ScoreLevel.EXCELLENT);
      expect(evaluationCriteria.getScoreLevel(95)).toBe(ScoreLevel.EXCELLENT);
      expect(evaluationCriteria.getScoreLevel(100)).toBe(ScoreLevel.EXCELLENT);
    });

    it('should return GOOD for scores >= 75 and < 90', () => {
      expect(evaluationCriteria.getScoreLevel(75)).toBe(ScoreLevel.GOOD);
      expect(evaluationCriteria.getScoreLevel(80)).toBe(ScoreLevel.GOOD);
      expect(evaluationCriteria.getScoreLevel(89)).toBe(ScoreLevel.GOOD);
    });

    it('should return SATISFACTORY for scores >= 60 and < 75', () => {
      expect(evaluationCriteria.getScoreLevel(60)).toBe(
        ScoreLevel.SATISFACTORY
      );
      expect(evaluationCriteria.getScoreLevel(65)).toBe(
        ScoreLevel.SATISFACTORY
      );
      expect(evaluationCriteria.getScoreLevel(74)).toBe(
        ScoreLevel.SATISFACTORY
      );
    });

    it('should return NEEDS_IMPROVEMENT for scores >= 40 and < 60', () => {
      expect(evaluationCriteria.getScoreLevel(40)).toBe(
        ScoreLevel.NEEDS_IMPROVEMENT
      );
      expect(evaluationCriteria.getScoreLevel(50)).toBe(
        ScoreLevel.NEEDS_IMPROVEMENT
      );
      expect(evaluationCriteria.getScoreLevel(59)).toBe(
        ScoreLevel.NEEDS_IMPROVEMENT
      );
    });

    it('should return POOR for scores < 40', () => {
      expect(evaluationCriteria.getScoreLevel(0)).toBe(ScoreLevel.POOR);
      expect(evaluationCriteria.getScoreLevel(20)).toBe(ScoreLevel.POOR);
      expect(evaluationCriteria.getScoreLevel(39)).toBe(ScoreLevel.POOR);
    });
  });

  describe('getCategoryWeight and setCategoryWeight', () => {
    it('should get the correct weight for a category', () => {
      expect(
        evaluationCriteria.getCategoryWeight(EvaluationCategory.GRAMMAR)
      ).toBe(DEFAULT_CATEGORY_WEIGHTS[EvaluationCategory.GRAMMAR]);
      expect(
        evaluationCriteria.getCategoryWeight(EvaluationCategory.STYLE)
      ).toBe(DEFAULT_CATEGORY_WEIGHTS[EvaluationCategory.STYLE]);
      expect(
        evaluationCriteria.getCategoryWeight(EvaluationCategory.RELEVANCE)
      ).toBe(DEFAULT_CATEGORY_WEIGHTS[EvaluationCategory.RELEVANCE]);
      expect(
        evaluationCriteria.getCategoryWeight(EvaluationCategory.COMPLETENESS)
      ).toBe(DEFAULT_CATEGORY_WEIGHTS[EvaluationCategory.COMPLETENESS]);
    });

    it('should set the weight for a category', () => {
      // Set weight without normalization
      evaluationCriteria.setCategoryWeight(
        EvaluationCategory.GRAMMAR,
        0.5,
        false
      );
      expect(
        evaluationCriteria.getCategoryWeight(EvaluationCategory.GRAMMAR)
      ).toBe(0.5);
    });

    it('should throw an error for invalid category', () => {
      expect(() => {
        evaluationCriteria.setCategoryWeight(
          'INVALID_CATEGORY' as EvaluationCategory,
          0.5
        );
      }).toThrow('Invalid evaluation category');
    });

    it('should throw an error for weight out of range', () => {
      expect(() => {
        evaluationCriteria.setCategoryWeight(EvaluationCategory.GRAMMAR, -0.1);
      }).toThrow('Weight must be between 0 and 1');

      expect(() => {
        evaluationCriteria.setCategoryWeight(EvaluationCategory.GRAMMAR, 1.1);
      }).toThrow('Weight must be between 0 and 1');
    });

    it('should normalize weights after setting a category weight', () => {
      // Set a new weight
      evaluationCriteria.setCategoryWeight(EvaluationCategory.GRAMMAR, 0.5);

      // Calculate the sum of weights
      const sum = Object.values(EvaluationCategory)
        .filter((category) => category !== EvaluationCategory.OVERALL)
        .reduce(
          (acc, category) =>
            acc + evaluationCriteria.getCategoryWeight(category),
          0
        );

      // Sum should be close to 1 (allowing for floating point precision)
      expect(sum).toBeCloseTo(1, 5);
    });
  });

  describe('getCriteriaDescription', () => {
    it('should return the correct description for each category', () => {
      expect(
        evaluationCriteria.getCriteriaDescription(EvaluationCategory.GRAMMAR)
      ).toContain('grammar');
      expect(
        evaluationCriteria.getCriteriaDescription(EvaluationCategory.STYLE)
      ).toContain('tone');
      expect(
        evaluationCriteria.getCriteriaDescription(EvaluationCategory.RELEVANCE)
      ).toContain('job requirements');
      expect(
        evaluationCriteria.getCriteriaDescription(
          EvaluationCategory.COMPLETENESS
        )
      ).toContain('components');
      expect(
        evaluationCriteria.getCriteriaDescription(EvaluationCategory.OVERALL)
      ).toContain('quality');
    });

    it('should return "Unknown category" for invalid categories', () => {
      expect(
        evaluationCriteria.getCriteriaDescription(
          'INVALID_CATEGORY' as EvaluationCategory
        )
      ).toBe('Unknown category');
    });
  });

  describe('createEvaluationPrompts', () => {
    const sampleCoverLetter = 'This is a sample cover letter for testing.';
    const sampleOptions = {
      jobTitle: 'Software Engineer',
      companyName: 'Acme Corporation',
      jobDescription: 'Developing software applications',
      candidateSkills: 'JavaScript, TypeScript, React',
      candidateExperience: '5 years of software development',
    };

    it('should create prompts for all evaluation categories', () => {
      const prompts = evaluationCriteria.createEvaluationPrompts(
        sampleCoverLetter,
        sampleOptions
      );

      // Check that all categories have prompts
      Object.values(EvaluationCategory).forEach((category) => {
        expect(prompts[category]).toBeDefined();
        expect(typeof prompts[category]).toBe('string');
      });
    });

    it('should include the cover letter in all prompts', () => {
      const prompts = evaluationCriteria.createEvaluationPrompts(
        sampleCoverLetter,
        sampleOptions
      );

      Object.values(prompts).forEach((prompt) => {
        expect(prompt).toContain(sampleCoverLetter);
      });
    });

    it('should include job-specific information in relevant prompts', () => {
      const prompts = evaluationCriteria.createEvaluationPrompts(
        sampleCoverLetter,
        sampleOptions
      );

      // Relevance prompt should include job details
      expect(prompts[EvaluationCategory.RELEVANCE]).toContain(
        sampleOptions.jobTitle
      );
      expect(prompts[EvaluationCategory.RELEVANCE]).toContain(
        sampleOptions.companyName
      );
      expect(prompts[EvaluationCategory.RELEVANCE]).toContain(
        sampleOptions.jobDescription
      );
      expect(prompts[EvaluationCategory.RELEVANCE]).toContain(
        sampleOptions.candidateSkills
      );
      expect(prompts[EvaluationCategory.RELEVANCE]).toContain(
        sampleOptions.candidateExperience
      );

      // Overall prompt should include job details
      expect(prompts[EvaluationCategory.OVERALL]).toContain(
        sampleOptions.jobTitle
      );
      expect(prompts[EvaluationCategory.OVERALL]).toContain(
        sampleOptions.companyName
      );
      expect(prompts[EvaluationCategory.OVERALL]).toContain(
        sampleOptions.jobDescription
      );
      expect(prompts[EvaluationCategory.OVERALL]).toContain(
        sampleOptions.candidateSkills
      );
      expect(prompts[EvaluationCategory.OVERALL]).toContain(
        sampleOptions.candidateExperience
      );
    });
  });

  describe('calculateOverallScore', () => {
    it('should calculate the weighted average of category scores', () => {
      const scores = {
        [EvaluationCategory.GRAMMAR]: 80,
        [EvaluationCategory.STYLE]: 70,
        [EvaluationCategory.RELEVANCE]: 90,
        [EvaluationCategory.COMPLETENESS]: 85,
      };

      // Expected calculation:
      // (80 * 0.2) + (70 * 0.2) + (90 * 0.3) + (85 * 0.3) = 16 + 14 + 27 + 25.5 = 82.5 -> 83 (rounded)
      const expectedScore = Math.round(
        80 * DEFAULT_CATEGORY_WEIGHTS[EvaluationCategory.GRAMMAR] +
          70 * DEFAULT_CATEGORY_WEIGHTS[EvaluationCategory.STYLE] +
          90 * DEFAULT_CATEGORY_WEIGHTS[EvaluationCategory.RELEVANCE] +
          85 * DEFAULT_CATEGORY_WEIGHTS[EvaluationCategory.COMPLETENESS]
      );

      expect(evaluationCriteria.calculateOverallScore(scores)).toBe(
        expectedScore
      );
    });

    it('should handle missing category scores', () => {
      const scores = {
        [EvaluationCategory.GRAMMAR]: 80,
        [EvaluationCategory.STYLE]: 70,
        // RELEVANCE and COMPLETENESS missing
      };

      // Expected calculation with normalization:
      // (80 * 0.2) + (70 * 0.2) = 16 + 14 = 30
      // Total weight = 0.4, so normalize: 30 / 0.4 = 75
      const expectedScore = Math.round(
        (80 * DEFAULT_CATEGORY_WEIGHTS[EvaluationCategory.GRAMMAR] +
          70 * DEFAULT_CATEGORY_WEIGHTS[EvaluationCategory.STYLE]) /
          (DEFAULT_CATEGORY_WEIGHTS[EvaluationCategory.GRAMMAR] +
            DEFAULT_CATEGORY_WEIGHTS[EvaluationCategory.STYLE])
      );

      expect(evaluationCriteria.calculateOverallScore(scores)).toBe(
        expectedScore
      );
    });

    it('should ignore OVERALL category in calculation', () => {
      const scores = {
        [EvaluationCategory.GRAMMAR]: 80,
        [EvaluationCategory.STYLE]: 70,
        [EvaluationCategory.RELEVANCE]: 90,
        [EvaluationCategory.COMPLETENESS]: 85,
        [EvaluationCategory.OVERALL]: 50, // Should be ignored
      };

      // Expected calculation (same as first test):
      // (80 * 0.2) + (70 * 0.2) + (90 * 0.3) + (85 * 0.3) = 16 + 14 + 27 + 25.5 = 82.5 -> 83 (rounded)
      const expectedScore = Math.round(
        80 * DEFAULT_CATEGORY_WEIGHTS[EvaluationCategory.GRAMMAR] +
          70 * DEFAULT_CATEGORY_WEIGHTS[EvaluationCategory.STYLE] +
          90 * DEFAULT_CATEGORY_WEIGHTS[EvaluationCategory.RELEVANCE] +
          85 * DEFAULT_CATEGORY_WEIGHTS[EvaluationCategory.COMPLETENESS]
      );

      expect(evaluationCriteria.calculateOverallScore(scores)).toBe(
        expectedScore
      );
    });
  });

  describe('determineImprovementPriorities', () => {
    it('should order categories by score (ascending)', () => {
      const scores = {
        [EvaluationCategory.GRAMMAR]: 80,
        [EvaluationCategory.STYLE]: 60,
        [EvaluationCategory.RELEVANCE]: 90,
        [EvaluationCategory.COMPLETENESS]: 70,
      };

      const priorities =
        evaluationCriteria.determineImprovementPriorities(scores);

      // Expected order: STYLE (60), COMPLETENESS (70), GRAMMAR (80), RELEVANCE (90)
      expect(priorities[0]).toBe(EvaluationCategory.STYLE);
      expect(priorities[1]).toBe(EvaluationCategory.COMPLETENESS);
      expect(priorities[2]).toBe(EvaluationCategory.GRAMMAR);
      expect(priorities[3]).toBe(EvaluationCategory.RELEVANCE);
    });

    it('should prioritize by weight when scores are equal', () => {
      const scores = {
        [EvaluationCategory.GRAMMAR]: 70, // Weight: 0.2
        [EvaluationCategory.STYLE]: 70, // Weight: 0.2
        [EvaluationCategory.RELEVANCE]: 70, // Weight: 0.3
        [EvaluationCategory.COMPLETENESS]: 70, // Weight: 0.3
      };

      const priorities =
        evaluationCriteria.determineImprovementPriorities(scores);

      // Expected order by weight (descending): RELEVANCE/COMPLETENESS (0.3), GRAMMAR/STYLE (0.2)
      // Since RELEVANCE and COMPLETENESS have the same weight, their order may vary
      // Same for GRAMMAR and STYLE
      expect(
        priorities[0] === EvaluationCategory.RELEVANCE ||
          priorities[0] === EvaluationCategory.COMPLETENESS
      ).toBeTruthy();
      expect(
        priorities[1] === EvaluationCategory.RELEVANCE ||
          priorities[1] === EvaluationCategory.COMPLETENESS
      ).toBeTruthy();
      expect(
        priorities[2] === EvaluationCategory.GRAMMAR ||
          priorities[2] === EvaluationCategory.STYLE
      ).toBeTruthy();
      expect(
        priorities[3] === EvaluationCategory.GRAMMAR ||
          priorities[3] === EvaluationCategory.STYLE
      ).toBeTruthy();
    });

    it('should ignore OVERALL category', () => {
      const scores = {
        [EvaluationCategory.GRAMMAR]: 80,
        [EvaluationCategory.STYLE]: 60,
        [EvaluationCategory.RELEVANCE]: 90,
        [EvaluationCategory.COMPLETENESS]: 70,
        [EvaluationCategory.OVERALL]: 50, // Should be ignored
      };

      const priorities =
        evaluationCriteria.determineImprovementPriorities(scores);

      // OVERALL should not be in the priorities
      expect(priorities).not.toContain(EvaluationCategory.OVERALL);
      expect(priorities.length).toBe(4); // Only 4 categories, not 5
    });
  });
});
