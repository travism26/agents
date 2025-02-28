# AI Rules and Guidelines

This document outlines the rules, best practices, and guidelines that AI must follow when assisting with the development of the Cover Letter Generation Agent project.

## Project Context

Cover Letter Generation Agent is an agentic system that automates the creation of personalized cover letters by leveraging AI-driven research, content drafting, and evaluation.

Key architectural features:

- Orchestrator-workers pattern with three specialized agents
- Modular architecture with clear separation of concerns
- Iterative refinement through feedback loops
- Comprehensive error handling and resilience
- Extensive testing and validation

## Tech Stack

Frontend:

- (Optional) React.js for web UI

Backend:

- TypeScript
- Node.js with Express
- LangChain.js for LLM orchestration
- OpenAI GPT for LLM provider
- Bing Search API and Perplexity API for research
- pdf-parse and mammoth for document processing
- Zod for schema validation

Data Storage:

- (Optional) Vector database for storing frequent applicant data

Infrastructure:

- Docker for containerization
- GitHub Actions for CI/CD
- AWS/GCP for deployment

## Code Style and Structure

### Directory Structure

```text
# Backend Services (Node.js/Express)
src/
├── agents/                # Agent implementations
│   ├── research/         # Research agent
│   ├── writer/           # Writer agent
│   └── evaluator/        # Evaluator agent
├── controllers/          # Request handlers
├── utils/                # Helper functions
│   ├── resumeParser.ts   # Resume parsing utilities
│   ├── inputSanitizer.ts # Input sanitization utilities
│   └── resilience.ts     # Error handling utilities
└── orchestrator.ts       # Main workflow orchestrator

# Tests
tests/
├── agents/               # Tests for agents
├── controllers/          # Tests for controllers
├── utils/                # Tests for utilities
├── integration/          # Integration tests
└── e2e/                  # End-to-end tests
```

### Naming Conventions

TypeScript:

- Classes: PascalCase (e.g., `InputSanitizer`, `ResearchAgent`)
- Interfaces: PascalCase (e.g., `CoverLetterRequest`, `EvaluationResult`)
- Types: PascalCase (e.g., `Resume`, `CompanyResearch`)
- Functions: camelCase (e.g., `sanitizeText`, `generateCoverLetter`)
- Variables: camelCase (e.g., `companyName`, `jobDescription`)
- Constants: UPPER_SNAKE_CASE (e.g., `API_KEY`, `MAX_ITERATIONS`)
- Files: camelCase.ts (e.g., `inputSanitizer.ts`, `writerAgent.ts`)
- Test files: camelCase.test.ts (e.g., `inputSanitizer.test.ts`)

### Component Structure

```typescript
// Example class structure
export class InputSanitizer {
  /**
   * Sanitizes a text input by removing HTML tags, excessive whitespace,
   * and truncating if it exceeds the maximum length.
   *
   * @param input - The text input to sanitize
   * @param maxLength - Maximum allowed length (default: 5000)
   * @returns Sanitized text
   */
  sanitizeText(input: string, maxLength: number = 5000): string {
    // Implementation
  }
}
```

## 1. Memlog System

### Directory Structure

The memlog system follows a hierarchical structure to optimize organization and token usage:

```text
memlog/
├── active/                 # Active tasks and current status
│   ├── project-one.md
│   ├── project-two.md
│   └── ...
├── archived/               # Archived completed tasks by project
│   ├── project-one/
│   │   ├── 2024-Q1.md
│   │   └── 2024-Q2.md
│   ├── project-two/
│   │   └── 2024-Q1.md
│   └── ...
├── shared/                 # Shared tracking files
│   ├── changelog.md
│   ├── stability_checklist.md
│   └── url_debug_checklist.md
└── index.md                # Master index of all projects and their status
```

### Key Principles

- **Selective Loading**: Only load the index file and relevant active task files to minimize token usage
- **Regular Archiving**: Move completed tasks to archive files organized by project and time period
- **Standardized Format**: Follow consistent formatting for all task files
- **Cross-Referencing**: Use links between files rather than duplicating information

### Required Actions

1. **Before Starting Work**:

   - Check the index file (`memlog/index.md`) for project status overview
   - Load the relevant active task file for the specific project
   - Verify and update shared tracking files as needed

2. **During Task Execution**:

   - Update the active task file with progress, status changes, and new information
   - Add detailed timestamps for all updates
   - Cross-reference related tasks in other projects when applicable

3. **After Task Completion**:

   - Mark tasks as completed in the active file
   - Consider if completed tasks should be archived (based on age and relevance)
   - Update the index file to reflect current project status

4. **For New Projects**:
   - Create a new active task file following the standardized format
   - Add the project to the index file
   - Set up initial task structure and priorities

### File Maintenance

- Keep active files focused on current and upcoming tasks
- Maintain only the last 2 weeks of updates in active files
- Archive completed tasks quarterly or when files become too large
- Ensure all files follow the standardized format for consistency

## 2. Task Breakdown and Execution

- Break down tasks into clear, numbered steps
- Document both actions and reasoning
- Verify step completion before proceeding
- Document errors and recovery steps
- Maintain task dependencies and relationships

Example task breakdown:

```
1. Implement Resume Parsing
   1.1. Create ResumeParser class with methods for different file formats
   1.2. Implement PDF parsing using pdf-parse library
   1.3. Implement DOCX parsing using mammoth library
   1.4. Implement JSON parsing with schema validation
   1.5. Write unit tests for each parsing method
```

## 3. Credential Management

- Document credential requirements for all external APIs (OpenAI, Bing Search, Perplexity)
- Guide credential acquisition process with clear instructions
- Test credential validity before proceeding with implementation
- Use secure storage methods (environment variables) for all API keys
- Implement credential refresh procedures for tokens with expiration
- Never store credentials in code or version control

Example credential requirements:

```
Required API Keys:
- OPENAI_API_KEY: For LLM operations (Writer and Evaluator agents)
- BING_API_KEY: For company research (Research agent)
- PERPLEXITY_API_KEY: For enhanced company insights (Research agent)
```

## 4. Error Handling and Reporting

Implementation requirements:

- Detailed error messages with context about what operation failed and why
- Timestamp logging for all errors to aid in debugging
- Error recovery procedures including retry mechanisms with exponential backoff
- Error pattern tracking to identify recurring issues
- Escalation protocols for critical errors
- System-wide error handling consistency

Example error handling pattern:

```typescript
export class RetryStrategy {
  private maxRetries: number;
  private baseDelay: number;

  constructor(maxRetries: number = 3, baseDelay: number = 1000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.maxRetries) {
          // Exponential backoff with jitter
          const delay =
            this.baseDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
          console.log(`Retry attempt ${attempt + 1} after ${delay}ms`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}
```

## 5. Third-Party Services Integration

Checklist for each integration:

- [ ] Verify setup requirements and API documentation
- [ ] Check necessary permissions and rate limits
- [ ] Test service connections with sample requests
- [ ] Document version requirements and compatibility
- [ ] Prepare contingency plans for service outages
- [ ] Monitor service health and implement fallbacks

Key integrations:

1. **OpenAI GPT API**

   - Used for: Writer and Evaluator agents
   - Fallback: Cached templates for common scenarios

2. **Bing Search API**

   - Used for: Research agent (company information)
   - Fallback: Alternative search APIs or cached data

3. **Perplexity API**
   - Used for: Research agent (enhanced insights)
   - Fallback: Proceed with Bing Search data only

## 6. Testing and Quality Assurance

Required test types:

- Unit tests for business logic (all utility functions and agent methods)
- Integration tests for agent workflows
- End-to-end tests for the complete cover letter generation process
- Error handling tests with simulated failures
- Performance tests for response time and resource usage
- Security tests for input validation and sanitization

Documentation:

- Maintain test coverage metrics (target: >80% for core functionality)
- Document test procedures for manual verification
- Update stability checklist after significant changes

Example test structure:

```typescript
describe('InputSanitizer', () => {
  let sanitizer: InputSanitizer;

  beforeEach(() => {
    sanitizer = new InputSanitizer();
  });

  describe('sanitizeText', () => {
    it('should remove HTML tags from text', () => {
      const input = '<p>This is a <strong>test</strong></p>';
      const expected = 'This is a test';
      expect(sanitizer.sanitizeText(input)).toBe(expected);
    });

    // Additional test cases...
  });
});
```

## 7. Security Best Practices

Required implementations:

- Input validation and sanitization for all user inputs
- Schema validation using Zod for structured data
- Secure handling of resume data and personal information
- Rate limiting for API endpoints
- Proper error handling without exposing sensitive information
- Regular dependency vulnerability scanning
- Secure API key management

Example input sanitization:

```typescript
export class InputSanitizer {
  sanitizeText(input: string, maxLength: number = 5000): string {
    if (!input) {
      return '';
    }

    // Remove HTML tags
    let sanitized = input.replace(/<[^>]*>?/gm, '');

    // Remove excessive whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Truncate if too long
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }
}
```

## 8. Performance Optimization

Focus areas:

- API response time optimization (target: <500ms for cover letter generation)
- Efficient LLM prompt design to minimize token usage
- Caching strategies for research data and common queries
- Asynchronous processing for non-blocking operations
- Resource usage monitoring for LLM API calls
- Load testing for concurrent request handling

Performance metrics to track:

- End-to-end cover letter generation time
- Individual agent processing times
- API call latency and success rates
- Token usage per request

## 9. Git Usage

Commit Message Prefixes:

- "fix:" for bug fixes
- "feat:" for new features
- "perf:" for performance improvements
- "docs:" for documentation changes
- "style:" for formatting changes
- "refactor:" for code refactoring
- "test:" for adding missing tests
- "chore:" for maintenance tasks

Rules:

- Use lowercase for commit messages
- Keep summary line under 50 characters
- Include detailed description for complex changes
- Reference issue numbers when applicable

Example commit messages:

```
feat: implement research agent with Bing Search integration

- Add BingSearchClient class for API communication
- Implement company information extraction
- Add unit tests for search result parsing
```

## 10. Documentation

Required documentation:

- README.md with project overview and setup instructions
- API documentation for all endpoints
- JSDoc comments for all classes, methods, and functions
- Architecture diagrams showing agent interactions
- Changelog maintenance for version history
- Environment setup guide with API key requirements
- Troubleshooting guides for common issues

Example JSDoc:

```typescript
/**
 * Sanitizes a text input by removing HTML tags, excessive whitespace,
 * and truncating if it exceeds the maximum length.
 *
 * @param input - The text input to sanitize
 * @param maxLength - Maximum allowed length (default: 5000)
 * @returns Sanitized text
 */
sanitizeText(input: string, maxLength: number = 5000): string {
  // Implementation
}
```

Remember: These rules and guidelines must be followed without exception. Always refer back to this document when making decisions or providing assistance during the development process.
