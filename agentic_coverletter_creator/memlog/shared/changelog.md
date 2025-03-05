# Changelog

All notable changes to the Cover Letter Generation Agent project will be documented in this file.

## [Unreleased]

### Added

- Evaluator Agent API (in progress)
- Integration with Orchestrator (planned)

## [0.8.0] - 2025-03-05

### Added

- EvaluatorAgent class with LLM-based evaluation capabilities
- Grammar and style checking functionality
- Relevance assessment for job and company fit
- Completeness verification for cover letter components
- Structured feedback generation with improvement suggestions
- FeedbackLoop class for iterative cover letter improvement
- Termination conditions based on score, improvement, and iteration count
- Comprehensive error handling and progress tracking
- Unit tests for EvaluatorAgent and FeedbackLoop classes
- Version comparison for tracking changes between iterations

## [0.7.0] - 2025-03-03

### Added

- CoverLetterController with cover letter generation endpoint
- Integration of ResearchAgent with WriterAgent for company research
- Validation for cover letter generation parameters using Zod
- Token usage tracking endpoint
- Comprehensive error handling for edge cases
- Resume data formatting for cover letter generation
- Unit tests for the CoverLetterController
- Express routes for writer endpoints

## [0.6.0] - 2025-03-02

### Added

- LLMClient interface with standardized methods for text generation
- OpenAI GPT client with comprehensive error handling and retry logic
- LLMClientFactory for managing different LLM providers
- Token usage tracking for monitoring and cost management
- Prompt template system for flexible cover letter generation
- WriterAgent class with cover letter generation capabilities
- Support for different tone preferences (Professional, Enthusiastic, Confident, Creative, Balanced)
- Comprehensive error handling for edge cases
- Mock responses for testing LLM integrations
- Extensive unit tests for all components

## [0.5.0] - 2025-03-02

### Added

- ResearchController with company research endpoint
- Cache clearing endpoint for research results
- Request validation using Zod schema
- Input sanitization for research parameters
- Comprehensive error handling for research requests
- Unit tests for the ResearchController
- Express routes for research endpoints
- API documentation with JSDoc comments

## [0.4.0] - 2025-03-02

### Added

- ResearchAgent class with comprehensive company research capabilities
- Company information search and values extraction functionality
- Job description analysis to identify key skills and qualifications
- Recent news and blog post retrieval for company updates
- Structured data output format for consistent research results
- Caching system for frequent searches with configurable TTL
- Comprehensive unit tests for all research functionality

## [0.3.0] - 2025-03-02

### Added

- API client interfaces for standardized search results
- Bing Search API client with error handling and rate limiting
- Perplexity API client for AI-powered research
- API client factory with environment variable configuration
- Mock responses for testing API integrations
- Comprehensive unit tests for all API clients

## [0.2.0] - 2025-03-01

### Added

- Express server with health check endpoint and error handling
- Request logging middleware
- Graceful server startup and shutdown procedures
- Resume parsing for PDF, DOCX, and JSON formats
- Input sanitization utilities
- Validation for job descriptions and company names
- API endpoint for cover letter generation
- Multipart form handling for file uploads
- Unit tests for input processing components
- Integration tests for the API

## [0.1.0] - 2025-03-01

### Added

- Detailed implementation blueprint with granular task breakdown
- Implementation timeline organized by sprint with clear deliverables
- Priority levels for each task group
- Testing requirements for each component
- Cover Letter Generation Agent project initialization
- Memlog system setup for Cover Letter Generation Agent
- Project structure and documentation review

## Dependencies

- Node.js 18.x
- TypeScript
- LangChain.js for LLM orchestration
- OpenAI GPT for LLM provider
- Bing Search API and Perplexity API for research
- pdf-parse and mammoth for document processing
- Zod for schema validation
