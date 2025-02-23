"use strict";
/**
 * Main entry point for the Agentic Email Generator
 * This module orchestrates the process of generating personalized outreach emails
 * using a system of specialized agents (Researcher, Writer, and Reviewer).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEmails = generateEmails;
const uuid_1 = require("uuid");
const researcher_1 = require("./agents/researcher");
const writer_1 = require("./agents/writer");
const reviewer_1 = require("./agents/reviewer");
const context_1 = require("./models/context");
/**
 * Generates personalized outreach emails based on provided information
 * @param user - Information about the sender
 * @param contact - Information about the recipient
 * @param company - Company information for research context
 * @param emailOptions - Email generation preferences and constraints
 * @returns Promise containing the generation record
 */
async function generateEmails(user, contact, company, emailOptions) {
    // Generate unique ID for this email generation attempt
    const generationId = (0, uuid_1.v4)();
    const startTime = new Date().toISOString();
    // Initialize shared context
    const contextManager = new context_1.ContextManager(generationId, user, contact, company);
    // Initialize agents with shared context
    const researcher = new researcher_1.ResearcherAgent(contextManager);
    const writer = new writer_1.WriterAgent(contextManager);
    const reviewer = new reviewer_1.ReviewerAgent(contextManager);
    // Update initial phase
    contextManager.updatePhase('research', 'initializing', 0);
    try {
        // Step 1: Research phase - Fetch relevant news articles
        const newsArticles = await researcher.research(contact, company);
        if (!newsArticles.length) {
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
        // Create angle based on research findings
        const angle = {
            id: (0, uuid_1.v4)(),
            title: 'Business Development Opportunity',
            body: `Reaching out regarding potential collaboration opportunities based on ${company.name}'s recent developments.`,
        };
        // Step 2: Writing phase - Generate initial email draft
        contextManager.updatePhase('writing', 'initial_draft', 0.3);
        const initialDraft = await writer.compose(user, contact, emailOptions, newsArticles);
        // Step 3: Review phase - Begin review and revision loop
        contextManager.updatePhase('review', 'initial_review', 0.6);
        let currentDraft = initialDraft.content;
        let revisionCount = 0;
        let finalDraft = null;
        let reviewResult;
        do {
            // Update subphase for each revision
            if (revisionCount > 0) {
                contextManager.updatePhase('revision', `revision_${revisionCount}`, 0.6 + revisionCount * 0.1);
            }
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
                contextManager.updatePhase('failed');
                return {
                    record: {
                        _id: generationId,
                        userId: user._id,
                        contact,
                        createdAt: startTime,
                        status: 'failed',
                        failedReason: `Failed to meet quality standards after ${revisionCount} revisions: ${reviewResult.suggestions.join(', ')}`,
                        generatedEmails: [],
                    },
                };
            }
            // Generate new draft incorporating review suggestions
            const revisedDraft = await writer.compose(user, contact, {
                ...emailOptions,
                goal: `${emailOptions.goal} (Revision ${revisionCount + 1}: ${reviewResult.suggestions[0]})`,
            }, newsArticles);
            currentDraft = revisedDraft.content;
            revisionCount++;
        } while (revisionCount < 3);
        if (!finalDraft) {
            contextManager.updatePhase('failed');
            return {
                record: {
                    _id: generationId,
                    userId: user._id,
                    contact,
                    createdAt: startTime,
                    status: 'failed',
                    failedReason: 'Failed to generate acceptable email draft after maximum revisions',
                    generatedEmails: [],
                },
            };
        }
        // Update to completion phase
        contextManager.updatePhase('complete', undefined, 1);
        // Create successful generation record
        const generatedEmail = {
            _id: (0, uuid_1.v4)(),
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
    }
    catch (error) {
        contextManager.updatePhase('failed');
        return {
            record: {
                _id: generationId,
                userId: user._id,
                contact,
                createdAt: startTime,
                status: 'failed',
                failedReason: error instanceof Error ? error.message : 'An unknown error occurred',
                generatedEmails: [],
            },
        };
    }
}
