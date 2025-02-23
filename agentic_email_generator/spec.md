Draft a detailed, step-by-step blueprint for building this project. Then, once you have a solid plan, break it down into small, iterative chunks that build on each other. Look at these chunks and then go another round to break it into small steps. Review the results and make sure that the steps are small enough to be implemented safely with strong testing, but big enough to move the project forward. Iterate until you feel that the steps are right sized for this project.

From here you should have the foundation to provide a series of prompts for a code-generation LLM that will implement each step in a test-driven manner. Prioritize best practices, incremental progress, and early testing, ensuring no big jumps in complexity at any stage. Make sure that each prompt builds on the previous prompts, and ends with wiring things together. There should be no hanging or orphaned code that isn't integrated into a previous step.

Make sure and separate each prompt section. Use markdown. Each prompt should be tagged as text using code tags. The goal is to output prompts, but context, etc is important as well.

Agentic Outreach Email Generation Service – Developer Specification

1. Overview
   This service is a Node.js module (written in TypeScript or JavaScript) that generates personalized outreach emails based on provided user and contact data. It gathers recent news about the contact’s company, derives outreach angles, and generates multiple unique emails that integrate these news details. The service is designed to be integrated inline within a larger application.

Function Signature Example:

javascript
Copy
const emails = await generateEmails(userObject, contactObject, emailOptions, optionalArgs);
Required Parameters:

userObject: Contains details of the user initiating the process.
contactObject: Contains details of the contact (name, title, company).
emailOptions: Contains all configuration details for generating emails (including angles, email goal, number of emails to generate, writing instructions, and style guidelines).
Optional Parameter:

optionalArgs: Additional overrides or parameters (e.g., API key overrides for LLM providers). 2. Functional Requirements
Input Data:

User Object: Contains fields like name, title, and associated company.
Contact Object: Contains fields like name, title, and company (which is also linked to a Company record).
Email Options:
Specifies the email goal (e.g., sale, retention).
Contains settings for generating angles, writing style, and tone.
Configurable options include the number of emails to generate (default: 3).
Optional Args: May include API key overrides or additional configuration parameters.
News Fetching:

Use the Perplexity API to fetch news articles related to the contact’s company.
Dynamically generate a prompt by replacing placeholders (company, person, industry) with actual data.
Consider only articles published in the last 6 months.
Prioritize articles based on the following business activities (in order):
Major partnerships and investments
Company developments and innovations
Leadership changes and strategic initiatives
Notable achievements and milestones
Failure Mode: If no relevant news articles are found, the function should mark the process as failed and return an appropriate status without any generated emails.
Email Generation Process:

Multiple Angles: Derive several distinct angles (e.g., “Growing Partnership”) from the news articles.
Integration: Each generated email must:
Incorporate references to the fetched news articles (woven naturally into the email content).
Include personalized details from both the user and the contact.
Be unique (no email templates; every email is generated dynamically).
Quality Control:
Implement a multi-stage pipeline with the following agents:
Researcher: Gathers and formats news articles.
Writer: Generates an initial draft of the email based on the specified goal.
Reviewer: Checks the draft against quality criteria and, if necessary, triggers a revision loop.
Revision Loop: Allow up to 3 rounds (by default, configurable via emailOptions or optionalArgs).
If quality checks (based on provided writing instructions and style guidelines) are not met after maximum rounds, the process is marked as failed with a detailed failure reason.
Output:

The service returns an object representing the generated email records, including:
Metadata (e.g., unique ID, creation timestamp, status).
An array of generated emails, each containing:
An angle object (with id, title, and descriptive guidelines).
Embedded newsArticles (with details like id, title, URL, publishedAt, summary, source, companyName, and tags).
The generatedEmailBody. 3. Architecture and Technology Choices
3.1 Implementation Language & Environment
Language: TypeScript (preferred for type safety) or JavaScript.
Runtime: Node.js.
Integration: The service is implemented as a module to be imported and used inline within a larger application.
3.2 Data Handling and Persistence
In-Memory Processing:
For inline processing, data is handled in memory during execution.
Persistent Storage (Optional):
Although the service itself is an inline module, integration with a MongoDB database is recommended for saving user, contact, company, and generated email records if persistence is required by the host application.
Data Models:
User, Contact, Company: As described in the data model section below.
GeneratedEmails: Contains the generated email details along with embedded news articles and status.
3.3 Asynchronous Processing
Internal Asynchronous Pipeline:
The service uses asynchronous functions (with async/await) to process the three pipeline stages:
Researcher, Writer, and Reviewer stages are executed sequentially in an asynchronous fashion.
Optional Revision Loop:
Managed internally with promise-based retries (up to a configurable maximum of 3 rounds).
3.4 External Integrations
Perplexity API:
Used for fetching relevant news articles.
The prompt is dynamically generated by replacing placeholders with data from the contactObject and associated Company details.
LLM Providers:
Default: OpenAI.
Optional: Anthropic (if an API key override is provided in optionalArgs).
Configuration:
API keys and sensitive configurations are stored in a .env file.
Overrides can be passed via optionalArgs. 4. Data Models
4.1 User Model
typescript
Copy
interface User {
\_id: string;
name: string;
title: string;
company: string; // Identifier or detailed company info
}
4.2 Contact Model
typescript
Copy
interface Contact {
\_id: string;
name: string;
title: string;
company: string; // Links to a Company record
}
4.3 Company Model
typescript
Copy
interface Company {
\_id: string;
name: string;
details: Record<string, any>; // All company-related details
}
4.4 GeneratedEmails Model
typescript
Copy
interface GeneratedEmailRecord {
\_id: string;
userId: string;
contact: Contact;
createdAt: Date;
status: 'approved' | 'failed';
failedReason?: string;
generatedEmails: GeneratedEmail[];
}

interface GeneratedEmail {
\_id: string;
angle: {
id: string;
title: string;
body: string; // Descriptive text/guidelines for the angle
};
newsArticles: NewsArticle[];
generatedEmailBody: string;
}

interface NewsArticle {
id: string;
title: string;
url: string;
publishedAt: Date;
summary: string;
source: string;
companyName: string;
tags: string[]; // E.g., ['Major partnerships and investments']
} 5. Pipeline Workflow
5.1 Agents
Researcher:

Fetches news articles from the Perplexity API.
Dynamically replaces prompt placeholders with values from contactObject and related company data.
Filters articles to those published in the last 6 months.
Prioritizes and categorizes articles based on:
Major partnerships and investments
Company developments and innovations
Leadership changes and strategic initiatives
Notable achievements and milestones
Embeds the retrieved news articles in the generated emails record.
Writer:

Uses the fetched news and the specified email goal (from emailOptions) to generate an initial email draft.
Integrates personalized details (from both userObject and contactObject) and news references into the email body.
Adheres to provided or default writing instructions and style guidelines.
Reviewer:

Validates the email draft against quality criteria using the following default instructions:
xml
Copy
<WritingInstructions>
<Instruction>Write the content at a B1/B2 CEFR level or a Flesch-Kincaid Grade Level of 9.</Instruction>
<Instruction>Use clear, simple, and precise language.</Instruction>
<Instruction>Avoid complex vocabulary and jargon, but ensure grammar and spelling are perfect.</Instruction>
</WritingInstructions>
<StyleGuidelines>
<Approved>
<Item>Keep tone casual and natural</Item>
<Item>Use simple transitions</Item>
</Approved>
<Prohibited>
<Category name="Phrases">
<Item>Buzzwords (innovative, synergy, collaboration)</Item>
<Item>"great to connect" or "mutual connection"</Item>
<Item>Phrases starting with "I noticed..." or "I see that..."</Item>
</Category>
<Category name="Topics">
<Item>LinkedIn or profile viewing mentions</Item>
<Item>How you like connecting or networking</Item>
</Category>
<Category name="Words">
<Item>Exciting</Item>
<Item>Interesting</Item>
<Item>Unnecessary positive qualifiers (great, awesome, wonderful)</Item>
</Category>
<Category name="Transitions">
<Item>"By the way"</Item>
</Category>
</Prohibited>
</StyleGuidelines>
If the draft fails quality checks, triggers a revision loop (up to 3 rounds by default) to regenerate or refine the email.
If the email still fails after maximum rounds, the service marks the process as failed and includes an appropriate failure reason.
5.2 Orchestration
Inline Asynchronous Execution:
The generateEmails function internally orchestrates the pipeline using asynchronous functions (via async/await).
The workflow executes sequentially:
Researcher → 2. Writer → 3. Reviewer (with potential revision loops).
Estimated Time Remaining:
The function may optionally return a heuristic estimate of time remaining based on the current stage and pending tasks as part of a detailed status report in error or progress logs. 6. Error Handling
Stage-Level Error Handling:
Each pipeline stage includes error catching and automatic retries if within the allowed revision rounds.
Detailed error messages are captured in the generated email record.
Failure Conditions:
If no relevant news articles are found.
If the revision loop exceeds the maximum allowed rounds (default: 3).
In either case, the process is marked as failed and a failure reason is provided in the output. 7. Testing Plan
7.1 Unit Testing
Agent Functions:
Write unit tests for each agent (Researcher, Writer, Reviewer) to verify correct processing and integration.
Utility Functions:
Test prompt generation, dynamic placeholder replacement, news article categorization, and revision loop logic.
7.2 Integration Testing
Full Pipeline Simulation:
Simulate calls to generateEmails with various valid and invalid inputs.
Verify transitions through Researcher, Writer, and Reviewer stages, including revision loops.
Ensure that generated emails include proper news integration, angles, and personalized details.
7.3 Error Scenario Testing
No News Articles Found:
Test that the function returns a failed status if no relevant articles are retrieved.
Exceeding Revision Rounds:
Validate that the process is marked as failed if the quality checks are not met after the maximum number of revisions.
7.4 Performance Testing
Asynchronous Behavior:
Test that the inline asynchronous orchestration performs efficiently within the host application.
Scalability Considerations:
Although the service is inline, test for performance under concurrent calls if the larger application invokes multiple instances simultaneously. 8. Deployment and Integration
Module Integration:
The service is implemented as a Node.js module that can be imported into a larger application.
Configuration (API keys, etc.) is managed via a .env file.
Usage:
Call the function generateEmails(userObject, contactObject, emailOptions, optionalArgs) to trigger the process.
The function returns a promise that resolves to an object containing either the generated emails (with metadata) or an error/failure status.
