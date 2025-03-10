/**
 * Feature flags configuration
 */
export interface FeatureFlags {
  useAIResumeParser: boolean;
  // Add other feature flags here as needed
}

/**
 * Get feature flags from environment variables
 * @returns FeatureFlags object
 */
export const getFeatureFlags = (): FeatureFlags => ({
  useAIResumeParser: process.env.ENABLE_AI_RESUME_PARSER === 'true',
  // Add other feature flags here as needed
});
