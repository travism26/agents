Overall Blueprint
Project Setup & Scaffolding

Initialize a Node.js project using TypeScript (or JavaScript if preferred).
Configure the project (package.json, tsconfig.json, .env) and set up a basic module structure.
Create the main function signature (generateEmails) that will serve as the pipeline entry point.
Data Models & Interfaces

Define TypeScript interfaces for the key data types: User, Contact, Company, and GeneratedEmailRecord (including nested types like GeneratedEmail and NewsArticle).
Create basic model files and include unit tests to validate these models.
Implement the Researcher Agent

Build a function to query the Perplexity API for news related to the contact’s company.
Include logic to substitute placeholders in the prompt and filter articles from the last 6 months, prioritizing them by business relevance.
Write tests to simulate API responses and verify the filtering and categorization.
Implement the Writer Agent

Develop a function that takes the news articles, user details, and contact information along with email options to generate an initial email draft.
Ensure personalized details and news integration.
Create unit tests to validate that the email draft incorporates the right information and adheres to the guidelines.
Implement the Reviewer Agent

Create a function to check the quality of the generated email draft against the provided writing instructions and style guidelines.
Include a revision loop that triggers up to 3 rounds if the draft fails validation.
Write tests to simulate both passing and failing scenarios.
Orchestrate the Pipeline in generateEmails

Integrate the Researcher, Writer, and Reviewer agents in an asynchronous pipeline.
Wire in error handling for cases like “no news articles found” or “exceeding revision rounds.”
Develop integration tests that simulate the full workflow from input to final generated email output.
Final Integration & Deployment

Combine all components into the Node.js module with proper configuration management (.env).
Ensure the entire service is testable, and provide instructions for running unit, integration, and error scenario tests.
Prepare usage examples and documentation for inline integration in a larger application.

# Prompt 1: Project Setup & Scaffolding

```text
# Prompt 1: Project Setup & Scaffolding

We are building an Agentic Outreach Email Generation Service as a Node.js module using TypeScript. Please perform the following steps:

1. Initialize a new Node.js project with TypeScript.
2. Create and configure the following files:
   - package.json (include necessary dependencies such as TypeScript, dotenv, etc.)
   - tsconfig.json (with a basic configuration for Node.js and TypeScript)
   - A .env file placeholder for future API keys and configuration.
3. Create a project folder structure with at least:
   - src/ (for source code)
   - src/index.ts (which will export the main function `generateEmails`)
   - src/models/ (for the data models/interfaces)
   - src/agents/ (for the Researcher, Writer, and Reviewer agents)
   - tests/ (for unit and integration tests)
4. In src/index.ts, define the basic skeleton of the function:

   async function generateEmails(userObject, contactObject, emailOptions, optionalArgs) {
       // placeholder for orchestration of agents
       return { status: 'pending', emails: [] };
   }

   Export the generateEmails function.
5. End with wiring this basic function so that the module can be imported in another file.

Include basic comments explaining each step. Ensure that the scaffolding is ready for integration with subsequent steps and is testable (e.g., include a basic test file that imports generateEmails and verifies that it returns a pending status).

Please generate the full prompt instructions and the corresponding code files as needed.

```

# Prompt 2: Define Data Models & Interfaces

```text
# Prompt 2: Define Data Models & Interfaces

Next, we need to create the data models for the project. Please perform the following tasks:

1. In the src/models/ directory, create a file (e.g., models.ts) that defines the following TypeScript interfaces:
   - User (with properties: _id, name, title, company)
   - Contact (with properties: _id, name, title, company)
   - Company (with properties: _id, name, details as a generic object)
   - GeneratedEmailRecord, which includes:
     - _id, userId, contact (of type Contact), createdAt, status (as a string: 'approved' | 'failed'), an optional failedReason,
     - generatedEmails: an array of GeneratedEmail objects.
   - GeneratedEmail (with properties: _id, angle, newsArticles, generatedEmailBody)
   - Angle (embedded in GeneratedEmail, with properties: id, title, body)
   - NewsArticle (with properties: id, title, url, publishedAt, summary, source, companyName, tags as an array of strings)
2. Include detailed inline comments describing each interface and its role.
3. Create a basic unit test file in the tests/ directory to import these models and validate that sample objects conform to the defined interfaces.

Make sure to wire these models into the overall module by exporting them from models.ts so that other parts of the application can import them.

```

# Prompt 3: Implement the Researcher Agent

```text
# Prompt 3: Implement the Researcher Agent

Implement the Researcher agent responsible for fetching news articles from the Perplexity API. Please complete the following steps:

1. Create a file in src/agents/ called researcher.ts.
2. Write a function (e.g., async function fetchNewsArticles(contact: Contact, company: Company): Promise<NewsArticle[]>)
   that:
   - Dynamically builds a query by replacing placeholders (e.g., company, person, industry) with data from the provided contact and company.
   - Calls the Perplexity API (simulate the API call for now) to fetch news articles.
   - Filters the results to include only articles published in the last 6 months.
   - Categorizes and prioritizes articles based on the following criteria in order: Major partnerships and investments, Company developments and innovations, Leadership changes and strategic initiatives, Notable achievements and milestones.
3. Write clear comments to explain the logic.
4. Create unit tests in tests/ to simulate API responses (using mocks) and verify that:
   - Articles older than 6 months are filtered out.
   - The articles are categorized correctly.
5. End the implementation by exporting the fetchNewsArticles function so that it can be used in the orchestration pipeline.

Ensure that the code is modular, testable, and wired for integration with subsequent agents.

```

# Prompt 4: Implement the Writer Agent

```text
# Prompt 4: Implement the Writer Agent

Now, implement the Writer agent that generates an initial email draft using the fetched news and provided data. Please follow these steps:

1. Create a file in src/agents/ called writer.ts.
2. Write a function (e.g., async function generateEmailDraft(user: User, contact: Contact, emailOptions: any, newsArticles: NewsArticle[]): Promise<string>) that:
   - Accepts the user, contact, emailOptions, and the array of news articles.
   - Integrates personalized details (from user and contact) and seamlessly weaves in references to the news articles.
   - Adheres to the provided email goal and writing style guidelines included in emailOptions.
   - Generates and returns an initial email draft as a string.
3. Add inline comments that explain how personalized details and news integration are handled.
4. Write unit tests to:
   - Confirm that the email draft includes the personalized details from both user and contact.
   - Verify that at least one reference to a news article is integrated into the draft.
5. Ensure the function is exported and ready to be used in the pipeline.

End with wiring this agent so that it can be invoked from the main orchestration function.

```

# Prompt 5: Implement the Reviewer Agent

```text
# Prompt 5: Implement the Reviewer Agent

Next, develop the Reviewer agent to validate the quality of the generated email draft. Please complete the following steps:

1. Create a file in src/agents/ called reviewer.ts.
2. Write a function (e.g., async function reviewEmailDraft(emailDraft: string, emailOptions: any): Promise<{ valid: boolean, message?: string }>) that:
   - Checks the email draft against the provided quality criteria, including the writing instructions and style guidelines.
   - Returns an object indicating whether the draft is valid. If not valid, include a message stating the reason.
3. Incorporate a mechanism that could be used in a revision loop (for instance, a counter or a flag indicating if a re-generation is needed).
4. Write unit tests to simulate both passing and failing scenarios for a given email draft.
5. Export the reviewEmailDraft function for integration into the orchestration pipeline.

Ensure this agent is designed to support up to 3 rounds of revisions if the email draft fails the quality check.

```

# Prompt 6: Orchestrate the Pipeline in generateEmails

```text
# Prompt 6: Orchestrate the Pipeline in generateEmails

Integrate the Researcher, Writer, and Reviewer agents into the main orchestration function. Please implement the following:

1. In src/index.ts (or another orchestrator file), update the generateEmails function to:
   - Call the Researcher agent (fetchNewsArticles) using the provided contact and company details (the company details should be retrieved or passed in based on the contact's company field).
   - If no relevant news articles are found, mark the process as failed and return an appropriate status.
   - Otherwise, pass the fetched news articles along with user, contact, and emailOptions to the Writer agent (generateEmailDraft) to generate an initial email draft.
   - Call the Reviewer agent (reviewEmailDraft) to validate the draft.
   - Implement a revision loop that allows up to 3 rounds of revisions if the email draft does not meet the quality standards. If it fails after maximum rounds, mark the process as failed with a detailed failure reason.
2. Capture metadata such as unique IDs, timestamps, and status.
3. Assemble the final GeneratedEmailRecord object including:
   - The used angle details, embedded news articles, and the generatedEmailBody.
4. Write integration tests in tests/ that simulate:
   - A successful generation process with valid inputs.
   - Error scenarios such as no news articles and exceeding revision rounds.
5. Ensure proper asynchronous error handling and logging throughout the process.

Make sure to wire all components together so that generateEmails returns a fully integrated result or a clear failure message.

```

# Prompt 7: Integration Testing & Final Assembly

```text
# Prompt 7: Integration Testing & Final Assembly

Finally, consolidate and finalize the module ensuring that all components are fully integrated and tested. Please perform the following:

1. Create comprehensive integration tests in the tests/ directory that:
   - Import the generateEmails function.
   - Simulate a complete workflow with valid user, contact, and emailOptions objects.
   - Validate that the final output includes the metadata, generated emails with embedded news articles, and correct status.
   - Test failure cases, such as when no news articles are fetched or when revision rounds are exceeded.
2. Update the README (or create a documentation file) with usage instructions for:
   - Importing the module.
   - Setting up configuration via .env.
   - Running unit and integration tests.
3. Ensure that all code (models, agents, orchestration) is properly wired and that there are no orphaned or hanging code segments.
4. Double-check that each step follows best practices in error handling, asynchronous processing, and incremental progress with test-driven development.
5. End by summarizing the integration and providing sample code that shows how another application might import and use the generateEmails function.

Please generate the final integration prompts and ensure that every component is properly connected, documented, and testable.
```
