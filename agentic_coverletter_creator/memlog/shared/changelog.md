# Changelog

All notable changes to the Cover Letter Generation Agent project will be documented in this file.

## [Unreleased]

### Added

- Evaluator Agent API (in progress)
- Integration with Orchestrator (planned)

## [0.8.4] - 2025-03-10

### Added

- AI-powered resume parsing with feature flag system
- AIParsingService for extracting structured data from resumes using LLMs
- Feature flag infrastructure for enabling/disabling AI parsing
- Enhanced resume data schema to support more detailed information
- Structured XML prompts for consistent LLM responses
- Confidence scoring for parsed resume sections
- Fallback mechanism to legacy parsing when AI parsing fails
- Unit tests for AI parsing service

### Changed

- Updated ResumeParser to support both AI and legacy parsing methods
- Modified CoverLetterController to initialize ResumeParser with feature flags
- Updated environment configuration to include feature flags

## [0.8.3] - 2025-03-10

### Fixed

- Fixed Perplexity API integration error (404 status code)
- Updated PerplexityClient to use the correct '/chat/completions' endpoint instead of '/query'
- Updated request body format to match the latest Perplexity API requirements
- Implemented proper response parsing for the new API format
- Added URL extraction from API responses to capture referenced sources
- Improved error handling for API responses

## [0.8.2] - 2025-03-10

### Fixed

- Enhanced DOCX file support in Cover Letter Generator
- Improved file format detection for DOCX files in coverLetterController
- Added support for alternative DOCX MIME types (application/msword, application/vnd.ms-word.document.macroEnabled.12)
- Implemented fallback detection for DOCX files with incorrect MIME types
- Added detailed logging for file upload processing to aid debugging
- Improved error messages for unsupported file formats

## [0.8.1] - 2025-03-05

### Changed

- Standardized all prompts to use XML format across the application
- Updated EvaluatorAgent prompts for grammar, style, relevance, completeness, and summary generation
- Updated EvaluationCriteria prompts for all evaluation categories
- Updated FeedbackLoop prompt for cover letter improvement
- Ensured consistent XML structure with purpose, content, and requirements sections
- Improved readability and maintainability of prompt templates

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
