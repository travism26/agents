# AI Rules and Guidelines for Agentic Email Generator

This document outlines the rules, best practices, and guidelines that AI must follow when assisting with the development of the Agentic Email Generator project.

## Project Context

The Agentic Email Generator is a TypeScript-based system that uses a multi-agent architecture to generate professional emails. The system employs three specialized AI agents working in collaboration:

- Researcher Agent: Gathers and analyzes relevant information
- Writer Agent: Composes email content based on research
- Reviewer Agent: Performs quality control and suggests improvements

## Tech Stack

- Core: TypeScript, Node.js
- AI/ML: LangChain, OpenAI
- Testing: Jest
- Utilities: UUID, Axios, Dotenv

## Architecture

### Agent System

The project uses a three-agent architecture with a sophisticated context management system:

```typescript
// Agent Types
type AgentType = 'researcher' | 'writer' | 'reviewer';

// Phase Flow
type Phase =
  | 'research'
  | 'writing'
  | 'review'
  | 'revision'
  | 'complete'
  | 'failed';
```

### Context Management

The system maintains a shared context that enables:

- Inter-agent communication
- State management
- Decision tracking
- Performance monitoring
- Error handling and recovery

## Code Style and Structure

### Directory Structure

```plaintext
src/
├── agents/           # Agent implementations
│   ├── base.ts      # Base agent functionality
│   ├── researcher.ts # Research agent
│   ├── writer.ts    # Writing agent
│   └── reviewer.ts  # Review agent
├── models/          # Data models and types
│   ├── context.ts  # Context management
│   └── models.ts   # Core data models
├── config/         # Configuration
│   └── langchain.ts # LangChain setup
└── tests/          # Test suites
```

### TypeScript Guidelines

1. Use strict TypeScript configuration
2. Define interfaces for all data structures
3. Use proper type definitions:

```typescript
interface IGeneratedEmail {
  _id: string;
  angle: Angle;
  newsArticles: NewsArticle[];
  generatedEmailBody: string;
}

interface NewsArticle {
  id: string;
  title: string;
  url: string;
  publishedAt: string;
  summary: string;
  source: string;
  companyName: string;
  tags: string[];
}
```

## Development Guidelines

### 1. Context Management

- Always use the ContextManager for state management
- Log all significant operations using the appropriate log level
- Maintain proper phase transitions
- Handle errors with recovery attempts

Example:

```typescript
protected log(
  level: LogLevel,
  message: string,
  metadata: Record<string, any> = {},
  error?: Error
): void {
  // Implementation
}
```

### 2. Agent Implementation

- Extend BaseAgent for new agent implementations
- Implement proper error handling with retries
- Use the handoff system for agent transitions
- Validate all handoff data

Example:

```typescript
protected async handleError<T>(
  operation: () => Promise<T>,
  fallbackStrategy?: () => Promise<T>
): Promise<T> {
  // Implementation
}
```

### 3. Error Handling

- Use the error handling system in BaseAgent
- Implement fallback strategies where appropriate
- Log all errors with proper context
- Track recovery attempts

### 4. Testing Requirements

- Write comprehensive tests for all agents
- Test error handling and recovery
- Verify context management
- Test agent handoffs
- Mock external services appropriately

### 5. Performance Considerations

- Monitor and log agent performance metrics
- Track operation timing
- Implement proper error recovery
- Handle rate limiting for external services

## Agent Collaboration Rules

### 1. Research Agent

- Gather relevant information
- Score article relevance
- Determine email angle
- Hand off to Writer with research findings

### 2. Writer Agent

- Use research findings to compose email
- Consider contact and company context
- Implement multiple draft versions
- Hand off to Reviewer with draft

### 3. Reviewer Agent

- Evaluate email quality
- Suggest improvements
- Track revision history
- Approve or request revisions

## Logging Guidelines

Use appropriate log levels:

- DEBUG: Detailed information for debugging
- INFO: General operational information
- WARN: Warning messages for potential issues
- ERROR: Error conditions requiring attention

Example:

```typescript
this.log('INFO', 'Starting email generation', {
  contact: contact.name,
  company: company.name,
});
```

## Git Practices

Commit messages should be prefixed with:

- "agent:" for agent-related changes
- "context:" for context system changes
- "model:" for data model changes
- "test:" for test additions/modifications
- "config:" for configuration changes

## Documentation Requirements

- Document all agent capabilities
- Maintain clear interface definitions
- Document error handling strategies
- Keep context management documentation updated
- Document testing approaches

Remember: This system relies heavily on proper context management and agent collaboration. Always ensure proper handoffs, error handling, and logging are implemented in any modifications or additions to the system.
