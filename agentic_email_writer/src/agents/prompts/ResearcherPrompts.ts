/**
 * Prompt templates for the Researcher Agent
 */

interface PromptVariables {
  companyName: string;
  contactName: string;
  contactTitle: string;
  timeframeMonths: number;
  industry?: string;
  focusAreas?: string[];
}

/**
 * Base template for company research
 */
const baseResearchTemplate = (vars: PromptVariables): string =>
  `
Find recent news articles and business updates about ${
    vars.companyName
  }, particularly focusing on:
1. Major business developments and strategic initiatives
2. Industry trends affecting the company
3. Recent achievements or milestones
4. Leadership changes or organizational updates

Consider the recipient is ${vars.contactName}, ${vars.contactTitle} at ${
    vars.companyName
  }.
Focus on articles from reputable business sources within the last ${
    vars.timeframeMonths
  } months.
${
  vars.industry
    ? `Pay special attention to developments in the ${vars.industry} industry.`
    : ''
}
${
  vars.focusAreas
    ? `\nSpecific areas of interest:\n${vars.focusAreas
        .map((area) => `- ${area}`)
        .join('\n')}`
    : ''
}
`.trim();

/**
 * Template for research focusing on industry trends
 */
const industryTrendsTemplate = (vars: PromptVariables): string =>
  `
Research recent industry trends and market developments affecting ${
    vars.companyName
  }, with focus on:
1. Market dynamics and competitive landscape
2. Technological innovations and disruptions
3. Regulatory changes and compliance updates
4. Economic factors impacting the industry

Consider the recipient is ${vars.contactName}, ${vars.contactTitle} at ${
    vars.companyName
  }.
Focus on high-quality sources from the last ${vars.timeframeMonths} months.
${vars.industry ? `Industry context: ${vars.industry}` : ''}
`.trim();

/**
 * Template for research focusing on company achievements
 */
const companyAchievementsTemplate = (vars: PromptVariables): string =>
  `
Find recent achievements and positive developments at ${
    vars.companyName
  }, including:
1. Business growth and expansion
2. Awards and recognition
3. Innovation and product launches
4. Corporate social responsibility initiatives

The information will be shared with ${vars.contactName}, ${
    vars.contactTitle
  } at the company.
Focus on verifiable achievements from the last ${vars.timeframeMonths} months.
${
  vars.focusAreas
    ? `\nHighlight achievements in:\n${vars.focusAreas
        .map((area) => `- ${area}`)
        .join('\n')}`
    : ''
}
`.trim();

/**
 * Template for research focusing on leadership and organizational changes
 */
const leadershipChangesTemplate = (vars: PromptVariables): string =>
  `
Research recent leadership and organizational changes at ${vars.companyName}, covering:
1. Executive appointments and departures
2. Board member changes
3. Organizational restructuring
4. Strategic vision and direction changes

This research is for ${vars.contactName}, ${vars.contactTitle} at ${vars.companyName}.
Focus on verified changes from the last ${vars.timeframeMonths} months.
`.trim();

/**
 * Combines multiple templates based on research focus
 */
const combineTemplates = (
  vars: PromptVariables,
  templates: Array<(vars: PromptVariables) => string>
): string => {
  const combinedPrompt = templates
    .map((template) => template(vars))
    .join('\n\n');
  return `${combinedPrompt}\n\nPlease ensure all articles are from reputable sources and relevant to the specified timeframe.`;
};

export const ResearcherPrompts = {
  baseResearch: baseResearchTemplate,
  industryTrends: industryTrendsTemplate,
  companyAchievements: companyAchievementsTemplate,
  leadershipChanges: leadershipChangesTemplate,
  combine: combineTemplates,
};

export type { PromptVariables };
