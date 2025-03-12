/**
 * Feature flags configuration
 */
export interface FeatureFlags {
  useAIResumeParser: boolean;
  enableMultipleCoverLetters: boolean;
  // Add other feature flags here as needed
}

/**
 * Get feature flags from environment variables
 * @returns FeatureFlags object
 */
export const getFeatureFlags = (): FeatureFlags => ({
  useAIResumeParser: process.env.ENABLE_AI_RESUME_PARSER === 'true',
  enableMultipleCoverLetters:
    process.env.ENABLE_MULTIPLE_COVER_LETTERS === 'true',
  // Add other feature flags here as needed
});
