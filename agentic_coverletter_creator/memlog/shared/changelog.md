# Changelog

All notable changes to the Cover Letter Generation Agent project will be documented in this file.

## [Unreleased]

### Added

- Company Research Implementation (in progress)
- Research Agent API (planned)

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
