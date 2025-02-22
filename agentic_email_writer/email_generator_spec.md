Implementation Environment
Language & Framework:
The system will be implemented as a Node.js application.
Code can be written in either JavaScript or TypeScript (with a preference for TypeScript for type safety).
Data Models and Relationships
User Collection

Fields: name, title, company, etc.
Relationship: Each user is associated with a single company.
Contact Collection

Fields: name, title, company
Relationship: Each contact is associated with a company.
Company Collection

Fields: Contains all details about the company.
Relationship: Both users and contacts link to a company.
GeneratedEmails Collection

Fields:
_id: Unique record identifier
userId: ID of the user who initiated the process
contact: Embedded object with contact details
createdAt: Timestamp
status: "approved" or "failed"
failedReason: Populated if the process fails
generatedEmails: An array where each element includes:
_id: Unique email identifier
angle: Object containing:
id
title (e.g., "Growing Partnership")
body (descriptive text/guidelines for the angle)
newsArticles: Array of embedded news article objects (each with id, title, url, publishedAt, summary, source, companyName, and tags based on BusinessActivities)
generatedEmailBody: The full generated email content
News Article Integration
Fetching News:

Use the perplexity API with a prompt where placeholders (company, person, industry) are dynamically replaced with actual contact and company details.
Timeframe: Consistently search for articles from the last 6 months.
Business Activities Priority:
Major partnerships and investments
Company developments and innovations
Leadership changes and strategic initiatives
Notable achievements and milestones
Storing News:

Embed the news articles directly within each generatedEmails record.
Each article will include: id, title, url, publishedAt, summary, source, companyName, and an array of tags (if an article matches multiple categories).
Failure Condition:

If no relevant news articles are found, mark the process as failed and do not return any generated emails.
Email Generation Pipeline
Agents & Workflow:

Researcher:
Fetches and formats news articles.
Writer:
Generates an initial email draft using the fetched news and guided by the email goal (e.g., sales, retention).
Reviewer:
Reviews the draft against quality criteria.
Revision Loop:
Up to a default of 3 rounds (with an option to override).
If the email still fails after the max rounds, mark the record as failed with an appropriate status and failure reason.
Quality Criteria (Default Instructions):

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
These defaults apply to all stages (both initial drafts and revision rounds) unless the user provides custom instructions.
Asynchronous Pipeline and Scalability
Job Queue:

Use Bull with Redis to manage asynchronous processing and ensure horizontal scaling.
Orchestration:
Each stage (Researcher, Writer, Reviewer) is executed as a separate asynchronous task.
Retries:
In case a stage fails unexpectedly, it will automatically retry (if within the allowed revision rounds).
Detailed error information will be logged in the MongoDB record.
Performance Monitoring:

Prometheus Integration:
Track key metrics such as per-stage execution timestamps, performance metrics, and error events for the pipeline.
These metrics are also stored within the MongoDB record for analysis.
Estimated Time Remaining:
Provide a heuristic estimation based on the current stage and pending tasks in the progress update.
API Design and Security
REST API Endpoint:

POST Request:
Accepts parameters including:
contact (with name, title, company)
user (with name, title, company)
email goal (e.g., sale, retention)
Optional overrides (for writing instructions, style guidelines, number of emails to generate, etc.)
Returns a job ID for polling the status and retrieving results.
Job Polling Endpoint:

Provides a detailed progress update:
Current pipeline stage (Researcher, Writer, Reviewer)
Number of revision rounds completed
Error messages, if any
Estimated time remaining (heuristic based on current stage and pending tasks)
Authentication:

Use an API key (stored in a .env file) to secure the endpoints.
The system allows passing the API key as a parameter; otherwise, it defaults to the one in the environment variables.
LLM Integration
Provider Selection:
Default to OpenAI.
Optionally allow switching to Anthropic if an appropriate API key is provided.
API Keys:
Stored securely in the .env file.
Error Handling and Finalization
Failure Handling:
If any stage exceeds the maximum allowed revision rounds without passing quality checks, mark the process as failed with a detailed failure reason.
If no relevant news articles are found, mark the job as failed.
Final Output:
Only the final approved version of generated emails is stored and returned, along with a summary status.
Detailed logs and performance metrics are stored for analysis and monitoring via Prometheus.