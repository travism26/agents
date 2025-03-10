# AI-Powered Resume Parsing

This document provides information about the AI-powered resume parsing feature in the Cover Letter Generation Agent.

## Overview

The AI-powered resume parsing feature uses Large Language Models (LLMs) to extract structured information from resumes in various formats (PDF, DOCX, JSON). This approach provides more accurate and detailed parsing compared to traditional rule-based parsing methods.

## Features

- **Enhanced Data Extraction**: Extracts detailed information from resumes including personal information, experience, education, skills, certifications, projects, and languages.
- **Skill Categorization**: Automatically categorizes skills by domain (e.g., Programming Languages, Frontend, Backend, DevOps) and expertise level.
- **Confidence Scoring**: Provides confidence scores for each section of the parsed resume to indicate the reliability of the extracted information.
- **Fallback Mechanism**: Automatically falls back to legacy parsing if AI parsing fails, ensuring robustness.
- **Feature Flag Control**: Can be enabled or disabled via a feature flag, allowing for gradual rollout and testing.

## How It Works

1. The resume text is extracted from the uploaded file (PDF, DOCX) or JSON input.
2. If AI parsing is enabled, the text is sent to the AI parsing service.
3. The AI parsing service uses a structured XML prompt to instruct the LLM to extract information in a consistent format.
4. The LLM response is validated and converted to the standard Resume format.
5. If AI parsing fails or is disabled, the system falls back to the legacy parsing method.

## Configuration

The AI-powered resume parsing feature is controlled by a feature flag in the environment configuration:

```
ENABLE_AI_RESUME_PARSER=true|false
```

To enable the feature, set `ENABLE_AI_RESUME_PARSER=true` in your `.env` file.

## Requirements

- An OpenAI API key is required for the AI parsing feature to work.
- The API key should be set in the environment configuration as `OPENAI_API_KEY`.

## Metrics and Monitoring

The AI parsing service tracks the following metrics:

- **Success Rate**: Percentage of successful AI parsing attempts.
- **Confidence Scores**: Average confidence scores for each section of the resume.
- **Fallback Rate**: Percentage of times the system falls back to legacy parsing.
- **Processing Time**: Time taken to parse resumes using AI vs. legacy methods.

These metrics are logged and can be used to monitor the performance of the AI parsing feature.

## Extending the Feature

The AI parsing feature can be extended in the following ways:

1. **Adding New Resume Sections**: Update the `ResumeSchema` in `resumeParser.ts` and the prompt in `AIParsingService.ts`.
2. **Supporting New LLM Providers**: Implement a new LLM client that extends the `BaseLLMClient` class.
3. **Customizing Prompts**: Modify the prompt in `AIParsingService.ts` to extract additional information or improve accuracy.

## Troubleshooting

If you encounter issues with the AI parsing feature:

1. **Check API Key**: Ensure your OpenAI API key is valid and has sufficient quota.
2. **Review Logs**: Check the logs for error messages related to AI parsing.
3. **Verify Feature Flag**: Confirm that the feature flag is correctly set in your environment.
4. **Test with Legacy Parsing**: Disable AI parsing to see if the issue persists with legacy parsing.

## Future Improvements

Planned improvements for the AI parsing feature include:

- Support for more resume formats (e.g., HTML, plain text).
- Integration with other LLM providers (e.g., Anthropic, Google).
- Fine-tuning the LLM for improved accuracy.
- Adding more detailed skill categorization and proficiency assessment.
- Implementing a feedback loop to improve parsing accuracy over time.
