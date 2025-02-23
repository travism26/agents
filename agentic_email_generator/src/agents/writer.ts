/**
 * Writer Agent
 * Responsible for generating personalized email content based on
 * research findings and specified parameters.
 */

import { User, Contact, NewsArticle } from '../models/models';
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
    generationStrategy?: string;
    personalizationFactors?: string[];
    styleAdherence?: {
      formalityScore: number;
      toneAlignment: number;
      clarity: number;
    };
  };
}

/**
 * WriterAgent class with autonomous email generation capabilities
 */
export class WriterAgent {
  private context: {
    user?: User;
    contact?: Contact;
    previousEmails?: EmailDraft[];
    stylePreferences?: Record<string, any>;
    effectivePatterns?: Record<string, number>;
  };

  constructor() {
    this.context = {};
  }

  /**
   * Analyzes articles to determine the most compelling narrative
   */
  private async analyzeArticles(
    articles: NewsArticle[],
    goal: string
  ): Promise<{ narrative: string; selectedArticles: string[] }> {
    const prompt = `As an expert email writer, analyze these news articles and create a compelling narrative that supports the email goal.

Goal: ${goal}

Articles:
${articles
  .map(
    (article) => `
Title: ${article.title}
Summary: ${article.summary}
Category: ${article.tags[0]}
`
  )
  .join('\n')}

Consider:
1. Relevance to the goal
2. Recency and impact
3. Narrative flow
4. Supporting evidence

Provide a JSON response with:
- narrative: A brief strategy for incorporating these articles
- selectedArticles: Array of article titles to reference`;

    const response = await llm.invoke([
      { role: 'system', content: 'You are an expert email strategist.' },
      { role: 'user', content: prompt },
    ]);

    const result = JSON.parse(response.content.toString());
    const selectedArticles = articles
      .filter((article) => result.selectedArticles.includes(article.title))
      .map((article) => article.id);

    return {
      narrative: result.narrative,
      selectedArticles,
    };
  }

  /**
   * Generates personalized content based on contact and context
   */
  private async generatePersonalizedContent(
    contact: Contact,
    goal: string,
    style: string,
    narrative: string
  ): Promise<string> {
    const prompt = `Create highly personalized email content for this contact.

Contact Information:
- Name: ${contact.name}
- Title: ${contact.title}
- Company: ${contact.company}

Goal: ${goal}
Style: ${style}
Narrative Strategy: ${narrative}

Previous Interactions: ${this.summarizePreviousInteractions()}

Consider:
1. Professional context
2. Industry relevance
3. Potential value proposition
4. Natural conversation flow

Generate email content that feels personal and purposeful.`;

    const response = await llm.invoke([
      { role: 'system', content: 'You are an expert email writer.' },
      { role: 'user', content: prompt },
    ]);

    return response.content.toString();
  }

  /**
   * Summarizes previous interactions for context
   */
  private summarizePreviousInteractions(): string {
    if (!this.context.previousEmails?.length) {
      return 'No previous interactions recorded';
    }

    return `Previous emails: ${this.context.previousEmails.length}
Common themes: ${this.analyzeCommonThemes()}
Effective patterns: ${this.summarizeEffectivePatterns()}`;
  }

  /**
   * Analyzes common themes in previous emails
   */
  private analyzeCommonThemes(): string {
    if (!this.context.previousEmails?.length) {
      return 'No themes established';
    }

    // Analyze themes from previous emails
    const themes = this.context.previousEmails
      .map((email) => email.metadata.targetGoals)
      .flat();

    const themeCount = themes.reduce((acc, theme) => {
      acc[theme] = (acc[theme] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(themeCount)
      .sort(([, a], [, b]) => b - a)
      .map(([theme, count]) => `${theme} (${count}x)`)
      .join(', ');
  }

  /**
   * Summarizes patterns that have been effective
   */
  private summarizeEffectivePatterns(): string {
    if (!this.context.effectivePatterns) {
      return 'No established patterns';
    }

    return Object.entries(this.context.effectivePatterns)
      .sort(([, a], [, b]) => b - a)
      .map(([pattern, score]) => `${pattern} (${score.toFixed(1)})`)
      .join(', ');
  }

  /**
   * Generates an email draft using autonomous decision making
   */
  async compose(
    user: User,
    contact: Contact,
    emailOptions: EmailOptions,
    newsArticles: NewsArticle[]
  ): Promise<EmailDraft> {
    // Update agent's context
    this.context.user = user;
    this.context.contact = contact;

    // Analyze articles and determine narrative strategy
    const { narrative, selectedArticles } = await this.analyzeArticles(
      newsArticles,
      emailOptions.goal
    );

    // Generate personalized content
    const content = await this.generatePersonalizedContent(
      contact,
      emailOptions.goal,
      emailOptions.style,
      narrative
    );

    // Calculate word count
    const wordCount = content.split(/\s+/).length;

    // Generate subject line
    const subject = await this.generateSubjectLine(
      emailOptions.goal,
      narrative,
      emailOptions.tone
    );

    // Create metadata
    const metadata = {
      tone: emailOptions.tone,
      wordCount,
      targetGoals: [emailOptions.goal],
      includedArticles: selectedArticles,
      generationStrategy: narrative,
      personalizationFactors: [
        'role-based-context',
        'industry-alignment',
        'news-integration',
      ],
      styleAdherence: {
        formalityScore: emailOptions.style === 'formal' ? 0.9 : 0.7,
        toneAlignment: 0.85,
        clarity: 0.9,
      },
    };

    // Store draft in context
    const draft = { content, subject, metadata };
    this.context.previousEmails = [
      ...(this.context.previousEmails || []),
      draft,
    ];

    return draft;
  }

  /**
   * Generates an engaging subject line
   */
  private async generateSubjectLine(
    goal: string,
    narrative: string,
    tone: string
  ): Promise<string> {
    const prompt = `Create an engaging email subject line.

Goal: ${goal}
Narrative: ${narrative}
Tone: ${tone}

Requirements:
1. Clear and concise
2. Engaging but professional
3. Aligned with email goal
4. No clickbait

Return only the subject line text.`;

    const response = await llm.invoke([
      { role: 'system', content: 'You are an expert email writer.' },
      { role: 'user', content: prompt },
    ]);

    return response.content.toString().trim();
  }
}
