# Overall Project Blueprint

1. Project Setup and Dependencies

Initialize a Node.js project (preferably TypeScript).
Install essential dependencies: Express (for REST endpoints), Mongoose (for MongoDB), Bull and Redis (for job queue), dotenv, and any testing libraries (e.g., Jest, Supertest).
Set up a basic folder structure:

```bash
/src
  /models
  /agents
  /routes
  /queues
  /utils
  /tests
.env
package.json
tsconfig.json
```

2. Data Modeling

- Create Mongoose schemas for the User, Contact, Company, and GeneratedEmails (with nested GeneratedEmail and NewsArticle).
- Write unit tests to ensure correct creation and persistence of these models.

3. Asynchronous Job Queue Setup

- Configure Bull with Redis to manage jobs.
- Create separate queues for each agent: Researcher, Writer, and Reviewer.
- Write integration tests to ensure jobs are enqueued, processed, and correctly update the database.

4. Agent Development

- Researcher Agent:
  - Fetches news articles using the dynamic perplexity API.
  - Replace placeholders in prompts with actual values.
  - Filter for articles from the last 6 months and prioritize based on business activities.
- Writer Agent:
  - Uses fetched articles and the provided email goal to generate initial drafts via language models (OpenAI/Anthropic).
- Reviewer Agent:
  - Validates the draft against quality criteria.
  - Implements revision loops (up to a configurable maximum).
- Write unit tests for each agent's functionality.

5. API Endpoints and Authentication

- Set up Express server with TypeScript support.
- Create RESTful API endpoints for each agent.
- Job Submission Endpoint: Receives a contact, user, email goal, and optional overrides.
- Job Polling Endpoint: Returns detailed progress including current stage, revision rounds, errors, and estimated time remaining.
- Implement API key authentication using values from .env.
- Write integration tests to cover successful submissions and proper progress reporting.

6. Wiring It All Together

- Ensure each agent job updates the corresponding MongoDB records with metadata, logs, and performance metrics.
- Implement monitoring hooks (e.g., Prometheus integration) for tracking execution times and error counts.
- Write end-to-end tests simulating a complete job from submission to final email generation or failure.

Below are the iterative prompts for a code-generation LLM. Each prompt is formatted in markdown and wrapped in code blocks tagged as text.

# Prompt 1: Project Initialization & Basic Setup

```text
# Prompt 1: Project Initialization & Basic Setup

You are to set up a new Node.js project with TypeScript support for the Agentic Outreach Email Generation System. Please perform the following steps:

1. Initialize a new Node.js project with `npm init` and set up TypeScript (including creating a `tsconfig.json`).
2. Install the following dependencies:
   - Express (for building REST endpoints)
   - Mongoose (for MongoDB integration)
   - Bull and Redis (for asynchronous job queue management)
   - dotenv (for managing environment variables)
   - A testing framework (e.g., Jest and Supertest)
3. Create a basic folder structure:
   - `/src/models` for Mongoose schemas.
   - `/src/agents` for the Researcher, Writer, and Reviewer agent implementations.
   - `/src/routes` for the REST API endpoints.
   - `/src/queues` for configuring and initializing Bull queues.
   - `/src/utils` for helper functions.
   - `/src/tests` for unit and integration tests.
4. Create a basic `.env` file with placeholder entries for API keys, Redis credentials, and MongoDB connection string.
5. Provide initial sample code that sets up an Express server and connects to MongoDB, reading configurations from the `.env` file.

End your output by ensuring that the basic server and configuration are wired together correctly and that tests can later be added.

Please provide the complete prompt for this step.
```

# Prompt 2: Data Modeling with Mongoose

```text
# Prompt 2: Data Modeling with Mongoose

Extend the project by defining Mongoose schemas and models for the following entities:
- **User:** Contains fields such as `_id`, `name`, `title`, and `company`.
- **Contact:** Contains fields such as `_id`, `name`, `title`, and `company` (reference or embedded company details).
- **Company:** Contains fields such as `_id`, `name`, and a generic `details` object.
- **GeneratedEmails:** Contains fields such as `_id`, `userId`, `contact`, `createdAt`, `status`, optional `failedReason`, and an array of `GeneratedEmail` objects.
  - **GeneratedEmail:** Contains an `angle` (with `id`, `title`, and `body`), an array of `NewsArticle` objects, and `generatedEmailBody`.
  - **NewsArticle:** Contains fields such as `id`, `title`, `url`, `publishedAt`, `summary`, `source`, `companyName`, and an array of `tags`.

Please also include a couple of simple unit tests using your testing framework to verify that these models can be created, saved, and retrieved from the MongoDB database.

End the prompt with clear instructions on how to run the tests and validate the models.
```

# Prompt 3: Asynchronous Processing Setup with Bull and Redis

```text
# Prompt 3: Asynchronous Processing Setup with Bull and Redis

Create the configuration for the asynchronous job processing using Bull and Redis. Please perform the following tasks:
1. Initialize and configure Bull queues for the three agents: **Researcher**, **Writer**, and **Reviewer**.
2. Implement a simple worker for each queue that logs the job details when processing a job.
3. Ensure that the queues and workers can be started as part of the application and that the job processing is asynchronous.
4. Write integration tests to enqueue a test job and verify that the worker processes it correctly.
5. Provide sample code for enqueuing a job and then polling for its result or processing status.

Ensure that the setup is modular, allowing for easy extension in later prompts.
```

# Prompt 4: Implementing the Agent Pipeline – Researcher Agent

```text
# Prompt 4: Implementing the Agent Pipeline – Researcher Agent

Develop the first agent of the asynchronous pipeline: the **Researcher** agent. Please follow these steps:
1. Create a base Agent interface or abstract class that other agents can extend.
2. Implement the Researcher agent:
   - It should fetch news articles from the Perplexity API.
   - Use a dynamic prompt where placeholders such as `{company}`, `{person}`, and `{industry}` are replaced with actual values from the job data.
   - Filter the fetched news to include only articles from the last 6 months and prioritize those matching business activities (e.g., major partnerships, leadership changes, etc.).
   - Save the relevant articles into the `GeneratedEmails` record.
3. Write unit tests for:
   - The dynamic prompt replacement logic.
   - The filtering of news articles by publication date and business activity.
4. Ensure that the agent can be executed as a job from the Bull queue and that it updates the job record in MongoDB correctly.

Provide the complete prompt for implementing and testing the Researcher agent.
```

# Prompt 5: Implementing the Writer and Reviewer Agents

```text
# Prompt 5: Implementing the Writer and Reviewer Agents

Now extend the agent pipeline with the following two agents:

1. **Writer Agent:**
   - Generate an initial email draft based on the user’s provided email goal (e.g., sale, retention).
   - Integrate the news articles fetched by the Researcher into the email content.
   - Use default writing instructions and style guidelines, with support for optional overrides.
   - Save the generated draft in the `GeneratedEmails` record.

2. **Reviewer Agent:**
   - Validate the generated email draft using the provided quality control criteria:
     - Check for clarity (B1/B2 CEFR level or Flesch-Kincaid Grade Level of 9).
     - Enforce style guidelines (e.g., tone, prohibited phrases).
   - If the draft fails, trigger a revision loop. Allow up to a configurable maximum of 3 rounds.
   - If the maximum revision rounds are reached and the email still fails, mark the job as failed with a detailed failure reason.
   - Update the `GeneratedEmails` record with the final approved email or the failure status.

3. Write unit tests for:
   - The email draft generation logic in the Writer agent.
   - The quality control and revision loop in the Reviewer agent.

Ensure that both agents are set up to run as part of the Bull queue processing, and that they correctly integrate with the rest of the pipeline.

Provide the complete prompt with detailed instructions and sample test cases.
```

# Prompt 6: API Endpoints and Integration Testing

```text
# Prompt 6: API Endpoints and Integration Testing

Implement the REST API for the Agentic Outreach Email Generation System. Please perform the following steps:
1. **Job Submission Endpoint (POST /api/generate-email):**
   - Accept a JSON payload containing:
     - `contact`: { name, title, company }
     - `user`: { name, title, company }
     - `emailGoal`: a string (e.g., “sale”, “retention”)
     - Optional overrides: custom writing instructions, style guidelines, number of emails, API key for LLM selection.
   - Validate the input and enforce API key authentication (the API key is stored in the `.env` file, but can also be passed in the request).
   - On successful validation, create a new job record in MongoDB and enqueue the job in the Bull queue.
   - Return a JSON payload with a unique `jobId` for tracking.

2. **Job Polling Endpoint (GET /api/job-status/:jobId):**
   - Retrieve and return detailed job progress, including:
     - Current stage (Researcher, Writer, Reviewer).
     - Revision rounds completed (with details).
     - Any error messages.
     - Estimated time remaining.
     - Overall job status (pending, approved, failed).

3. Write integration tests to ensure:
   - Jobs are created successfully with valid input.
   - Polling returns accurate and updated job progress.
   - API key authentication works as expected.

Conclude by ensuring that these endpoints “wire together” the previously implemented asynchronous pipeline, and that testing confirms the full integration of the components.
```

# Prompt 7: Final Integration, Monitoring, and Error Handling

```text
# Prompt 7: Final Integration, Monitoring, and Error Handling

Now, complete the project by integrating all components, and adding monitoring and enhanced error handling:
1. **Wiring Components:**
   - Ensure that the agent pipeline (Researcher, Writer, Reviewer) is fully integrated.
   - Confirm that each agent properly updates the `GeneratedEmails` record in MongoDB with metadata, logs, and performance metrics.
   - Connect the job submission and polling endpoints to trigger and track the complete workflow.

2. **Monitoring and Metrics:**
   - Integrate Prometheus (or a similar tool) to capture per-stage metrics such as execution times, error counts, and revision round counts.
   - Log these metrics alongside each GeneratedEmails record.

3. **Enhanced Error Handling:**
   - Ensure that each agent has robust error handling. If an agent fails, it should log detailed error information in MongoDB and attempt automatic retries (respecting the revision loop limits).
   - If the maximum allowed revision rounds are exceeded, mark the job as failed with a clear failure reason.
   - Provide clear logging and metrics for troubleshooting.

4. **End-to-End Integration Testing:**
   - Write and run integration tests that simulate a complete job from submission through to final email generation or failure.
   - Validate that all components work together seamlessly and that error scenarios are handled gracefully.

End your prompt with clear instructions that the entire system is now integrated, tested, and ready for deployment, ensuring that no piece of functionality is left orphaned.

Please provide the complete final prompt.
```
