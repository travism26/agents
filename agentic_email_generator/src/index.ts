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
import { ContextManager } from './models/context';
import {
  User,
  Contact,
  Company,
  GeneratedEmailRecord,
  GeneratedEmail,
  Angle,
} from './models/models';
import util from 'util';

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
  // Generate unique ID for this email generation attempt
  const generationId = uuidv4();
  const startTime = new Date().toISOString();

  // Initialize shared context
  const contextManager = new ContextManager(
    generationId,
    user,
    contact,
    company
  );

  // Initialize agents with shared context
  const researcher = new ResearcherAgent(contextManager);
  const writer = new WriterAgent(contextManager);
  const reviewer = new ReviewerAgent(contextManager);

  // Update initial phase
  console.log('Initializing research phase');
  contextManager.updatePhase('research', 'initializing', 0);

  try {
    // Step 1: Research phase - Fetch relevant news articles
    console.log('Fetching news articles');
    const newsArticles = await researcher.research(contact, company);
    console.log('Research completed');
    if (!newsArticles.length) {
      console.log('No relevant news articles found');
      contextManager.updatePhase('failed');
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

    // Step 2: Writing phase - Generate initial email draft
    // Note: Angle is now created by the researcher agent
    console.log('Generating initial draft');
    contextManager.updatePhase('writing', 'initial_draft', 0.3);
    // Give time for phase update and ensure handoff is processed
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify handoff from researcher to writer
    const handoffs = contextManager.getContext().collaboration.handoffs;
    const lastHandoff = handoffs[handoffs.length - 1];
    if (
      !lastHandoff ||
      lastHandoff.from !== 'researcher' ||
      lastHandoff.to !== 'writer'
    ) {
      throw new Error(
        'Invalid handoff chain - expected handoff from researcher to writer'
      );
    }

    const initialDraft = await writer.compose(
      user,
      contact,
      emailOptions,
      newsArticles
    );
    console.log('Initial draft generated');

    // Step 3: Review phase - Begin review and revision loop
    console.log('Starting review phase');
    let currentDraft = initialDraft.content;
    let revisionCount = 0;
    let finalDraft: string | null = null;
    let reviewResult;

    do {
      // Get research findings at start of loop
      const researchFindings =
        contextManager.getContext().memory.researchFindings;
      if (!researchFindings) {
        throw new Error('Research findings not found in context');
      }

      // Reset context for new revision cycle
      if (revisionCount > 0) {
        console.log('Resetting context for revision cycle', revisionCount);

        // Clear existing handoffs and reset phase
        contextManager.clearHandoffs();
        await contextManager.updatePhase('research', 'initializing', 0);

        // Re-establish researcher to writer handoff with original research
        await researcher.handoffToAgent(
          'writer',
          'Research completed successfully',
          {
            articles: researchFindings.articles,
            angle: researchFindings.angle,
          }
        );

        // Transition to writing phase
        contextManager.updatePhase('writing', 'revision', 0.3);

        // Verify context is ready for next revision
        const updatedContext = contextManager.getContext();
        console.log('Context reset complete', {
          phase: updatedContext.state.phase,
          handoffCount: updatedContext.collaboration.handoffs.length,
        });

        // Small delay to ensure state propagation
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (revisionCount === 0) {
        console.log('Reviewing initial draft');
      } else {
        console.log(`Reviewing revision ${revisionCount}`);
      }

      // Perform review
      reviewResult = await reviewer.review(currentDraft, {
        contact,
        articles: newsArticles,
        angle: researchFindings.angle,
        revisionCount,
      });

      if (reviewResult.approved) {
        console.log('Draft approved');
        finalDraft = currentDraft;
        break;
      }

      if (revisionCount >= 3) {
        console.log('Maximum revision attempts reached');
        break;
      }

      // Generate new draft incorporating review suggestions
      console.log('Generating revised draft');
      try {
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
      } catch (error) {
        console.error('Failed to generate revision:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        throw new Error(
          `Revision ${revisionCount + 1} failed: ${errorMessage}`
        );
      }
    } while (revisionCount < 3);

    console.log('mtravis - 4:');
    if (!finalDraft) {
      console.log('Failed to generate acceptable email draft');
      contextManager.updatePhase('failed');
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

    // Update to completion phase
    console.log('Updating to completion phase');
    contextManager.updatePhase('complete', undefined, 1);
    console.log('Completion phase updated');

    // Create successful generation record
    // Get angle from research findings for the final record
    const researchFindings =
      contextManager.getContext().memory.researchFindings;
    if (!researchFindings) {
      throw new Error('Research findings not found in context');
    }

    const generatedEmail: GeneratedEmail = {
      _id: uuidv4(),
      angle: researchFindings.angle,
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
    console.error('Error occurred during email generation', error);
    contextManager.updatePhase('failed');
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
