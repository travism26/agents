/**
 * Core data models for the Agentic Email Generator system.
 * This file contains TypeScript interfaces that define the structure of all
 * major entities in the system.
 */
/**
 * Represents a user of the system who generates emails
 */
export interface User {
    _id: string;
    name: string;
    title: string;
    company: string;
}
/**
 * Represents a contact who will receive the generated email
 */
export interface Contact {
    _id: string;
    name: string;
    title: string;
    company: string;
}
/**
 * Represents a company entity with flexible details storage
 */
export interface Company {
    _id: string;
    name: string;
    details: Record<string, any>;
}
/**
 * Represents a news article used in email generation
 */
export interface NewsArticle {
    id: string;
    title: string;
    url: string;
    publishedAt: string;
    summary: string;
    source: string;
    companyName: string;
    tags: string[];
}
/**
 * Represents an angle or approach for email content
 */
export interface Angle {
    id: string;
    title: string;
    body: string;
}
/**
 * Represents a single generated email with its components
 */
export interface GeneratedEmail {
    _id: string;
    angle: Angle;
    newsArticles: NewsArticle[];
    generatedEmailBody: string;
}
/**
 * Represents a complete record of an email generation attempt
 * including status and all generated variations
 */
export interface GeneratedEmailRecord {
    _id: string;
    userId: string;
    contact: Contact;
    createdAt: string;
    status: 'approved' | 'failed';
    failedReason?: string;
    generatedEmails: GeneratedEmail[];
}
