/**
 * Main entry point for the Agentic Email Generator
 * This module orchestrates the process of generating personalized outreach emails
 * using a system of specialized agents (Researcher, Writer, and Reviewer).
 */
import { EmailOptions as WriterEmailOptions } from './agents/writer';
import { User, Contact, Company, GeneratedEmailRecord } from './models/models';
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
export declare function generateEmails(user: User, contact: Contact, company: Company, emailOptions: WriterEmailOptions): Promise<EmailGenerationResult>;
export type { WriterEmailOptions as EmailOptions };
