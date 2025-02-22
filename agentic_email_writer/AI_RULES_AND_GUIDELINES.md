# AI Rules and Guidelines for Agentic Email Writer Development

This document outlines the rules, best practices, and guidelines that AI must follow when assisting with the development of the Agentic Email Writer microservice.

## Project Context

The Agentic Email Writer is a sophisticated microservice that leverages multiple AI agents to research, compose, and review professional emails. Key features include:

- Multi-agent architecture for specialized tasks
- Research-driven email content generation
- Automated quality control and review
- Queue-based job processing
- Business context-aware content generation
- Performance monitoring and metrics collection

Key architectural features:

- Three-agent system: Researcher, Writer, and Reviewer
- Queue-based processing with Bull/Redis
- MongoDB for data persistence
- Express.js REST API
- Prometheus monitoring integration

## Tech Stack

- Core: Node.js, TypeScript
- Database: MongoDB with Mongoose
- Queue System: Bull with Redis
- API: Express.js
- Testing: Jest & Supertest
- Monitoring: Prometheus
- AI Integration: Perplexity API, Language Models

## Code Style and Structure

### Directory Structure

```plaintext
src/
├── agents/           # AI agent implementations
│   ├── researcher/   # Research agent components
│   ├── writer/       # Email writing agent components
│   └── reviewer/     # Quality control agent components
├── models/           # Mongoose schemas
│   ├── user.ts
│   ├── contact.ts
│   ├── company.ts
│   └── generated-emails.ts
├── queues/           # Bull queue configurations
│   ├── researcher.ts
│   ├── writer.ts
│   └── reviewer.ts
├── routes/           # API endpoints
├── utils/            # Shared utilities
└── tests/           # Test suites
```

### Naming Conventions

TypeScript:

- Use PascalCase for class names and interfaces
- Use camelCase for methods and variables
- Use kebab-case for file names
- Suffix test files with .test.ts
- Prefix interfaces with 'I' (e.g., IUser, IGeneratedEmail)

### TypeScript Usage

- Strict TypeScript configuration required
- Define interfaces for all data structures
- Use proper type definitions:

```typescript
interface IGeneratedEmail {
  id: string;
  userId: string;
  contact: IContact;
  content: string;
  status:
    | 'pending'
    | 'researching'
    | 'writing'
    | 'reviewing'
    | 'completed'
    | 'failed';
  createdAt: Date;
  articles: INewsArticle[];
  metadata: {
    researchTime: number;
    writingTime: number;
    reviewTime: number;
    revisionCount: number;
  };
}

interface INewsArticle {
  title: string;
  url: string;
  publishedDate: Date;
  relevanceScore: number;
  summary: string;
}
```

### Agent Implementation

- Implement clear separation between agent responsibilities
- Use proper error handling and retries
- Implement comprehensive logging
- Handle rate limiting for external APIs
- Document agent capabilities and limitations

Example:

```typescript
interface IAgentConfig {
  maxRetries: number;
  timeout: number;
  rateLimitDelay: number;
}

abstract class BaseAgent {
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: IAgentConfig
  ): Promise<T> {
    // Implementation
  }
}
```

## 1. Memlog System

- Maintain 'memlog' folder for system state tracking
- Track in memlog/email-generation.tasks.log:
  - Research operations
  - Email generation attempts
  - Review cycles
  - Agent performance metrics
- Additional tracking files:
  - agent_performance.md: Track agent metrics
  - api_usage.md: Track external API usage
  - error_patterns.md: Track common failures

## 2. Task Breakdown and Execution

- Break down email generation into phases:
  1. Research phase
  2. Writing phase
  3. Review phase
- Validate inputs before processing
- Track job progress through queue system
- Implement proper error handling between phases
- Document phase transitions

## 3. Email Security and Privacy

- Implement proper data sanitization
- Handle business-sensitive information appropriately
- Follow email security best practices:
  - Content filtering
  - Link validation
  - Personal data handling
- Implement rate limiting
- Track and log access patterns
- Handle data retention policies

## 4. Error Handling and Reporting

- Implement comprehensive error handling for:
  - API failures
  - Queue processing errors
  - Database operations
  - Agent processing failures
- Log errors with context
- Implement proper retry mechanisms
- Track error patterns for improvement

## 5. Queue Management

- Implement proper queue configuration
- Handle job priorities
- Configure proper timeouts
- Implement job cleanup
- Monitor queue health
- Track processing metrics

## 6. Testing and Quality Assurance

- Write comprehensive tests:
  - Unit tests for agents
  - Integration tests for queues
  - API endpoint tests
  - End-to-end email generation tests
- Validate email content quality
- Test error scenarios
- Monitor performance metrics

## 7. Performance Optimization

- Optimize queue processing
- Implement caching where appropriate
- Monitor agent performance
- Track API usage efficiency
- Optimize database queries
- Monitor memory usage

## 8. Git Usage

Commit Message Prefixes:

- "agent:" for agent-related changes
- "queue:" for queue system changes
- "api:" for API endpoint changes
- "model:" for database model changes
- "test:" for test additions/modifications
- "perf:" for performance improvements
- "docs:" for documentation

Rules:

- Use descriptive commit messages
- Reference issue numbers
- Document agent modifications carefully
- Track API integration changes

## 9. Documentation

- Maintain clear README
- Document agent capabilities
- Document API endpoints
- Keep queue configuration documented
- Update error handling procedures
- Document monitoring setup
- Track performance metrics

## 10. Monitoring and Metrics

- Track key metrics:
  - Email generation success rate
  - Research quality metrics
  - Processing time per phase
  - Queue performance
  - API usage statistics
- Configure Prometheus alerts
- Monitor system health
- Track resource usage

Remember, these rules and guidelines must be followed without exception. Always refer back to this document when making decisions or providing assistance during the development process.
