/**
 * Feature flags configuration
 */
export interface FeatureFlags {
  useAIResumeParser: boolean;
  enableMultipleCoverLetters: boolean;
  enableInterviewPrep: boolean;
  // Add other feature flags here as needed
}

/**
 * Default options for interview preparation
 */
export const defaultInterviewPrepOptions = {
  questionCount: 10,
  includeSuggestedAnswers: true,
  difficultyLevel: 'mixed' as 'basic' | 'intermediate' | 'advanced' | 'mixed',
  focusAreas: ['technical', 'cultural', 'company-specific'] as (
    | 'technical'
    | 'cultural'
    | 'company-specific'
  )[],
};

/**
 * Get feature flags from environment variables
 * @returns FeatureFlags object
 */
export const getFeatureFlags = (): FeatureFlags => ({
  useAIResumeParser: process.env.ENABLE_AI_RESUME_PARSER === 'true',
  enableMultipleCoverLetters:
    process.env.ENABLE_MULTIPLE_COVER_LETTERS === 'true',
  enableInterviewPrep: process.env.FEATURE_INTERVIEW_PREP === 'true',
  // Add other feature flags here as needed
});
