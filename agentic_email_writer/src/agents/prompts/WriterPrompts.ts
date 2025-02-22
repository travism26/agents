/**
 * Prompt templates for the Writer Agent
 */

interface PromptVariables {
  companyName: string;
  contactName: string;
  contactTitle: string;
  senderName: string;
  senderTitle: string;
  senderCompany: string;
  articles: Array<{
    title: string;
    summary: string;
  }>;
  style?: {
    tone?: 'formal' | 'casual' | 'friendly';
    length?: 'concise' | 'standard' | 'detailed';
    emphasis?: 'business' | 'technical' | 'personal';
  };
}

/**
 * System prompt template for setting the agent's role and capabilities
 */
const systemPromptTemplate = `You are an expert business email writer with extensive experience in crafting personalized, professional emails. Your task is to write emails that:
1. Are professionally formatted and error-free
2. Incorporate relevant news and information naturally
3. Maintain appropriate tone and style
4. Create genuine connection opportunities
5. Follow business email best practices

Focus on creating value-driven content that demonstrates industry knowledge while maintaining a professional and engaging tone.`;

/**
 * Base template for email generation
 */
const baseEmailTemplate = (vars: PromptVariables): string => {
  const styleGuide = vars.style
    ? `
Style Guide:
- Tone: ${vars.style.tone || 'formal'}
- Length: ${vars.style.length || 'standard'}
- Emphasis: ${vars.style.emphasis || 'business'}`
    : '';

  const articleSummaries = vars.articles
    .map(
      (article) => `- ${article.title}
  Summary: ${article.summary}`
    )
    .join('\n');

  return `Write a professional email to ${vars.contactName}, ${vars.contactTitle} at ${vars.companyName}.

Context:
- Sender: ${vars.senderName}, ${vars.senderTitle} at ${vars.senderCompany}
- Recipient: ${vars.contactName}, ${vars.contactTitle} at ${vars.companyName}

Relevant News and Information:
${articleSummaries}
${styleGuide}

Requirements:
1. Create a compelling subject line
2. Naturally incorporate relevant news/information
3. Maintain professional tone while building rapport
4. Include a clear value proposition or purpose
5. End with a specific call to action

Format the response as a JSON object with 'subject' and 'body' fields.`;
};

/**
 * Template for follow-up emails
 */
const followUpTemplate = (vars: PromptVariables): string => {
  const articleHighlights = vars.articles
    .map((article) => `- ${article.title}`)
    .join('\n');

  return `Write a follow-up email to ${vars.contactName} at ${vars.companyName}.

Context:
- Previous interaction established
- New relevant developments to discuss

Recent Developments:
${articleHighlights}

Requirements:
1. Reference previous interaction (generically)
2. Share new relevant insights
3. Maintain relationship momentum
4. Include clear next steps

Format the response as a JSON object with 'subject' and 'body' fields.`;
};

/**
 * Template for revision requests
 */
const revisionTemplate = (
  originalEmail: { subject: string; body: string },
  feedback: string,
  vars: PromptVariables
): string => `Revise the following email based on the provided feedback.

Original Email:
Subject: ${originalEmail.subject}
Body: ${originalEmail.body}

Feedback:
${feedback}

Style Requirements:
${
  vars.style
    ? `- Tone: ${vars.style.tone}
- Length: ${vars.style.length}
- Emphasis: ${vars.style.emphasis}`
    : 'Maintain professional standards'
}

Format the response as a JSON object with 'subject' and 'body' fields.`;

export const WriterPrompts = {
  system: systemPromptTemplate,
  baseEmail: baseEmailTemplate,
  followUp: followUpTemplate,
  revision: revisionTemplate,
};

export type { PromptVariables };
