/**
 * Writer Agent
 * Responsible for generating personalized email content based on
 * research findings and specified parameters.
 */

import { User, Contact, NewsArticle } from '../models/models';

export interface EmailOptions {
  goal: string;
  style: 'formal' | 'casual' | 'professional';
  tone: 'friendly' | 'direct' | 'enthusiastic';
  maxLength?: number;
  includeSalutation?: boolean;
  includeSignature?: boolean;
}

export interface EmailDraft {
  content: string;
  subject?: string;
  metadata: {
    tone: string;
    wordCount: number;
    targetGoals: string[];
    includedArticles: string[]; // IDs of referenced articles
  };
}

/**
 * Generates a personalized salutation based on contact information
 */
function generateSalutation(contact: Contact): string {
  return `Dear ${contact.name},\n\n`;
}

/**
 * Generates a professional signature based on user information
 */
function generateSignature(user: User): string {
  return `\n\nBest regards,\n${user.name}\n${user.title}\n${user.company}`;
}

/**
 * Extracts relevant details from news articles based on email goals
 */
function extractRelevantDetails(
  articles: NewsArticle[],
  goal: string
): string[] {
  return articles
    .map((article) => {
      // Extract key points based on the goal
      const keyPoints = [];

      if (
        goal.toLowerCase().includes('partnership') &&
        article.tags.includes('partnerships_investments')
      ) {
        keyPoints.push(`recent partnership announcement: ${article.title}`);
      }

      if (
        goal.toLowerCase().includes('innovation') &&
        article.tags.includes('developments_innovations')
      ) {
        keyPoints.push(`recent innovation: ${article.title}`);
      }

      if (
        goal.toLowerCase().includes('leadership') &&
        article.tags.includes('leadership_strategy')
      ) {
        keyPoints.push(`leadership update: ${article.title}`);
      }

      return keyPoints;
    })
    .flat();
}

/**
 * Generates an initial email draft using provided information and news articles
 */
export async function generateEmailDraft(
  user: User,
  contact: Contact,
  emailOptions: EmailOptions,
  newsArticles: NewsArticle[]
): Promise<EmailDraft> {
  let content = '';
  const includedArticles: string[] = [];

  // Add salutation if requested
  if (emailOptions.includeSalutation !== false) {
    content += generateSalutation(contact);
  }

  // Extract relevant details from news articles
  const relevantPoints = extractRelevantDetails(
    newsArticles,
    emailOptions.goal
  );

  // Generate personalized opening
  content += `I hope this email finds you well. `;

  // Add context based on the goal
  content += `I'm reaching out regarding ${emailOptions.goal}. `;

  // Integrate news references
  if (relevantPoints.length > 0) {
    content += `I noticed ${relevantPoints[0]}. `;
    includedArticles.push(newsArticles[0].id);

    if (relevantPoints.length > 1) {
      content += `Additionally, ${relevantPoints[1]}. `;
      includedArticles.push(newsArticles[1].id);
    }
  }

  // Add personalized connection
  content += `Given your role as ${contact.title} at ${contact.company}, `;
  content += `I believe there could be valuable opportunities for collaboration. `;

  // Add call to action
  content += `Would you be interested in discussing this further? `;

  // Add signature if requested
  if (emailOptions.includeSignature !== false) {
    content += generateSignature(user);
  }

  // Calculate word count
  const wordCount = content.split(/\s+/).length;

  // Truncate if exceeds maxLength
  if (emailOptions.maxLength && wordCount > emailOptions.maxLength) {
    const words = content.split(/\s+/);
    content = words.slice(0, emailOptions.maxLength).join(' ');
  }

  return {
    content,
    subject: `Regarding ${emailOptions.goal}`,
    metadata: {
      tone: emailOptions.tone,
      wordCount,
      targetGoals: [emailOptions.goal],
      includedArticles,
    },
  };
}

// Export the WriterAgent class for backward compatibility
export class WriterAgent {
  async compose(
    user: User,
    contact: Contact,
    emailOptions: EmailOptions,
    newsArticles: NewsArticle[]
  ): Promise<EmailDraft> {
    return generateEmailDraft(user, contact, emailOptions, newsArticles);
  }
}
