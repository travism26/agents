/**
 * Main entry point for the Agentic Email Generator
 * This module orchestrates the process of generating personalized outreach emails
 * using a system of specialized agents (Researcher, Writer, and Reviewer).
 */

import { v4 as uuidv4 } from 'uuid';
import { ResearcherAgent } from './agents/researcher';
import {
  WriterAgent,
  EmailOptions as WriterEmailOptions,
} from './agents/writer';
import { ReviewerAgent, EmailContext } from './agents/reviewer';
import {
  User,
  Contact,
  Company,
  GeneratedEmailRecord,
  GeneratedEmail,
  Angle,
} from './models/models';

export interface EmailGenerationResult {
  record: GeneratedEmailRecord;
}

/**
 * Generates personalized outreach emails based on provided information
 * @param user - Information about the sender
 * @param contact - Information about the recipient
 * @param company - Company information for research context
 * @param emailOptions - Email generation preferences and constraints
 * @returns Promise containing the generation record
 */
export async function generateEmails(
  user: User,
  contact: Contact,
  company: Company,
  emailOptions: WriterEmailOptions
): Promise<EmailGenerationResult> {
  // Initialize agents
  const researcher = new ResearcherAgent();
  const writer = new WriterAgent();
  const reviewer = new ReviewerAgent();

  // Generate unique ID for this email generation attempt
  const generationId = uuidv4();
  const startTime = new Date().toISOString();

  try {
    // Step 1: Research phase - Fetch relevant news articles
    const newsArticles = await researcher.research(contact, company);

    if (!newsArticles.length) {
      return {
        record: {
          _id: generationId,
          userId: user._id,
          contact,
          createdAt: startTime,
          status: 'failed',
          failedReason: 'No relevant news articles found',
          generatedEmails: [],
        },
      };
    }

    // Create a mock angle (in production this would be selected based on research)
    const angle: Angle = {
      id: uuidv4(),
      title: 'Business Development Opportunity',
      body: `Reaching out regarding potential collaboration opportunities based on ${company.name}'s recent developments.`,
    };

    // Step 2: Generate initial email draft
    const initialDraft = await writer.compose(
      user,
      contact,
      emailOptions,
      newsArticles
    );

    // Step 3: Review and revision loop
    let currentDraft = initialDraft.content;
    let revisionCount = 0;
    let finalDraft: string | null = null;
    let reviewResult;

    do {
      reviewResult = await reviewer.review(currentDraft, {
        contact,
        articles: newsArticles,
        angle,
        revisionCount,
      });

      if (reviewResult.approved) {
        finalDraft = currentDraft;
        break;
      }

      if (revisionCount >= 3) {
        return {
          record: {
            _id: generationId,
            userId: user._id,
            contact,
            createdAt: startTime,
            status: 'failed',
            failedReason: `Failed to meet quality standards after ${revisionCount} revisions: ${reviewResult.suggestions.join(
              ', '
            )}`,
            generatedEmails: [],
          },
        };
      }

      // Generate new draft incorporating review suggestions
      const revisedDraft = await writer.compose(
        user,
        contact,
        {
          ...emailOptions,
          goal: `${emailOptions.goal} (Revision ${revisionCount + 1}: ${
            reviewResult.suggestions[0]
          })`,
        },
        newsArticles
      );

      currentDraft = revisedDraft.content;
      revisionCount++;
    } while (revisionCount < 3);

    if (!finalDraft) {
      return {
        record: {
          _id: generationId,
          userId: user._id,
          contact,
          createdAt: startTime,
          status: 'failed',
          failedReason:
            'Failed to generate acceptable email draft after maximum revisions',
          generatedEmails: [],
        },
      };
    }

    // Create successful generation record
    const generatedEmail: GeneratedEmail = {
      _id: uuidv4(),
      angle,
      newsArticles,
      generatedEmailBody: finalDraft,
    };

    return {
      record: {
        _id: generationId,
        userId: user._id,
        contact,
        createdAt: startTime,
        status: 'approved',
        generatedEmails: [generatedEmail],
      },
    };
  } catch (error) {
    return {
      record: {
        _id: generationId,
        userId: user._id,
        contact,
        createdAt: startTime,
        status: 'failed',
        failedReason:
          error instanceof Error ? error.message : 'An unknown error occurred',
        generatedEmails: [],
      },
    };
  }
}

// Export additional types for consumers
export type { WriterEmailOptions as EmailOptions };
