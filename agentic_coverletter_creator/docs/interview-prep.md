# Interview Preparation Feature

This document describes the interview preparation feature, which extends the cover letter generator to provide tailored interview preparation materials.

## Overview

The interview preparation feature helps job seekers prepare for interviews by generating:

1. **Tailored Interview Questions**: Technical, cultural, and company-specific questions based on the job description and company research.
2. **Talking Points**: Suggestions for topics the candidate can bring up during the interview, especially for the "do you have any questions for us?" portion.
3. **Preparation Checklist**: A customized checklist of tasks to complete before the interview.
4. **Company Insights**: Key information about the company's culture, recent developments, and challenges/opportunities.

## Features

- **Technical Question Generation**: Questions based on technologies mentioned in the job description.
- **Cultural Fit Questions**: Questions based on company values and culture.
- **Company-Specific Questions**: Questions based on recent news and developments.
- **Talking Points**: Suggestions for topics to discuss during the interview.
- **Preparation Checklist**: Customized tasks to complete before the interview.
- **Caching**: Results are cached to improve performance for repeated requests.

## API Usage

### Standalone Endpoint

```http
POST /api/interview-prep
Content-Type: application/json

{
  "companyName": "Example Corp",
  "jobDescription": "We are looking for a senior software engineer with experience in React, Node.js, and AWS...",
  "options": {
    "questionCount": 10,
    "includeSuggestedAnswers": true,
    "difficultyLevel": "intermediate",
    "focusAreas": ["technical", "cultural", "company-specific"]
  }
}
```

### Response Format

```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "type": "technical",
        "content": "Can you explain how React's virtual DOM works and why it's beneficial?",
        "context": "React is a key technology mentioned in the job description",
        "difficulty": "intermediate",
        "relevance": {
          "jobRole": true,
          "companyValues": false,
          "industryTrends": true
        },
        "suggestedAnswer": "React's virtual DOM is a lightweight copy of the actual DOM...",
        "followUpQuestions": [
          "How would you optimize React performance for a large application?",
          "What are some alternatives to the virtual DOM approach?"
        ]
      }
      // More questions...
    ],
    "talkingPoints": [
      {
        "topic": "Example Corp's recent expansion into AI services",
        "context": "The company announced this initiative last month",
        "relevantNews": ["Example Corp acquires AI startup"],
        "keyStats": ["$50M investment in AI research"],
        "discussionAngles": [
          "How does the company plan to integrate AI into existing products?",
          "What kind of AI talent is the company looking to hire?"
        ]
      }
      // More talking points...
    ],
    "checklist": [
      {
        "category": "research",
        "task": "Review Example Corp's latest annual report",
        "priority": "high",
        "timeframe": "3-5 days before interview",
        "resources": ["Company investor relations website"]
      }
      // More checklist items...
    ],
    "companyInsights": {
      "cultureHighlights": [
        "Strong emphasis on work-life balance",
        "Collaborative team environment",
        "Focus on continuous learning"
      ],
      "recentDevelopments": [
        "Launched new cloud platform in Q1 2025",
        "Expanded operations to European market"
      ],
      "challengesOpportunities": [
        "Facing increased competition in cloud services",
        "Opportunity to leverage AI for product differentiation"
      ]
    }
  }
}
```

### Including with Cover Letter Generation

You can also request interview preparation materials as part of the cover letter generation process:

```http
POST /api/cover-letter
Content-Type: application/json

{
  "companyName": "Example Corp",
  "jobTitle": "Senior Software Engineer",
  "jobDescription": "...",
  "resume": { ... },
  "includeInterviewPrep": true,
  "interviewPrepOptions": {
    "questionCount": 5,
    "includeSuggestedAnswers": true
  }
}
```

## Configuration

The interview preparation feature can be configured using the following environment variables:

- `FEATURE_INTERVIEW_PREP`: Enable/disable the feature (default: false)

## Implementation Details

The interview preparation feature is implemented using the following components:

1. **InterviewPrepAgent**: Core agent responsible for generating interview preparation materials.
2. **InterviewPrepCache**: Caching mechanism to avoid redundant API calls.
3. **InterviewController**: API controller for standalone interview preparation requests.
4. **Orchestrator Integration**: Integration with the existing cover letter generation flow.

## Best Practices

1. **Be Specific**: Provide a detailed job description to get more relevant questions and talking points.
2. **Use Suggested Answers**: Enable the `includeSuggestedAnswers` option to get guidance on how to answer questions.
3. **Customize Focus Areas**: Use the `focusAreas` option to focus on specific types of questions.
4. **Prepare Early**: Use the preparation checklist to start preparing well before the interview.
