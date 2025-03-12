# Multiple Cover Letter Generation Feature

## Current Sprint: Sprint 2

Start Date: 2025-03-12
End Date: 2025-03-26

## Feature Description

Enhance the Cover Letter Generation Agent to support generating multiple cover letters with different approaches and styles. This feature will allow users to receive two distinct cover letters for the same job application, including support for using a custom template that has previously been successful.

## Task Breakdown

### 1. Interface and Type Definitions [Priority: High]

Status: Completed

- [x] 1.1 Create `CoverLetterApproach` enum in WriterAgent.ts
- [x] 1.2 Define `MultiCoverLetterOptions` interface extending existing `CoverLetterOptions`
- [x] 1.3 Update `CoverLetterResult` interface to include approach information
- [x] 1.4 Create `MultiCoverLetterResult` type for API responses
- [x] 1.5 Update OrchestratorTypes.ts to support multiple cover letter generation
- [x] 1.6 Update Zod validation schema in coverLetterController.ts

### 2. WriterAgent Enhancement [Priority: High]

Status: Completed

- [x] 2.1 Create `generateMultipleCoverLetters` method in WriterAgent class
- [x] 2.2 Implement approach-specific prompt creation methods:
  - [x] 2.2.1 Create `createPromptForApproach` method
  - [x] 2.2.2 Implement `createAchievementFocusedPrompt` method
  - [x] 2.2.3 Implement `createCompanyCultureMatchPrompt` method
  - [x] 2.2.4 Implement `createSkillsHighlightPrompt` method
  - [x] 2.2.5 Implement `createRequirementsTablePrompt` method
  - [x] 2.2.6 Implement `createCustomTemplatePrompt` method
- [x] 2.3 Add parallel processing support for generating multiple cover letters
- [x] 2.4 Implement error handling for multiple generation
- [x] 2.5 Update token usage tracking to account for multiple generations

### 3. Controller Updates [Priority: Medium]

Status: Completed

- [x] 3.1 Update `coverLetterGenerationSchema` in coverLetterController.ts to include new fields:
  - [x] 3.1.1 Add `generateMultiple` boolean field
  - [x] 3.1.2 Add `customTemplate` string field
  - [x] 3.1.3 Add `approaches` array field
- [x] 3.2 Modify `generateCoverLetter` method to handle multiple cover letter generation
- [x] 3.3 Update response formatting for multiple cover letters
- [x] 3.4 Implement validation for custom template input
- [x] 3.5 Add error handling for multiple cover letter generation

### 4. Orchestrator Integration [Priority: Medium]

Status: Completed

- [x] 4.1 Update Orchestrator.ts to support multiple cover letter generation
- [x] 4.2 Modify OrchestratorState.ts to track multiple drafts
- [x] 4.3 Update progress tracking for multiple cover letter generation
- [x] 4.4 Implement parallel evaluation of multiple cover letters (optional)

### 5. Feature Flag Implementation [Priority: Medium]

Status: Completed

- [x] 5.1 Add `enableMultipleCoverLetters` feature flag to featureFlags.ts
- [x] 5.2 Update getFeatureFlags function to include the new flag
- [x] 5.3 Add the flag to .env.example with documentation
- [x] 5.4 Implement conditional logic in controller based on feature flag

### 6. Testing [Priority: High]

Status: In Progress

- [ ] 6.1 Write unit tests for new WriterAgent methods
- [ ] 6.2 Create test cases for different cover letter approaches
- [ ] 6.3 Write integration tests for multiple cover letter generation
- [ ] 6.4 Test custom template functionality
- [ ] 6.5 Create test fixtures for multiple cover letter generation
- [ ] 6.6 Update existing tests to accommodate new functionality
- [x] 6.7 Fix generateMultiple parameter handling in form data requests (2025-03-12)

### 7. Documentation [Priority: Medium]

Status: In Progress

- [ ] 7.1 Update API documentation with new endpoints/parameters
- [ ] 7.2 Document the different cover letter approaches
- [ ] 7.3 Create examples of using the multiple cover letter feature
- [x] 7.4 Update README.md with new feature information
- [ ] 7.5 Document custom template format and requirements
- [x] 7.6 Create form-data API usage guide (2025-03-12)

## Implementation Details

### CoverLetterApproach Enum

```typescript
export enum CoverLetterApproach {
  STANDARD = 'STANDARD', // Default approach
  ACHIEVEMENT_FOCUSED = 'ACHIEVEMENT_FOCUSED',
  COMPANY_CULTURE_MATCH = 'COMPANY_CULTURE_MATCH',
  SKILLS_HIGHLIGHT = 'SKILLS_HIGHLIGHT',
  REQUIREMENTS_TABLE = 'REQUIREMENTS_TABLE', // Template with requirements-qualifications table
  CUSTOM_TEMPLATE = 'CUSTOM_TEMPLATE', // For user's successful template
}
```

### MultiCoverLetterOptions Interface

```typescript
export interface MultiCoverLetterOptions extends CoverLetterOptions {
  variations: {
    count: number;
    approaches: CoverLetterApproach[];
  };
  customTemplate?: string; // Optional custom template text
}
```

### Requirements Table Approach

The REQUIREMENTS_TABLE approach creates a cover letter with a three-part structure:

1. **Introduction**: A brief introduction expressing interest in the position and highlighting key personal traits
2. **Requirements-Qualifications Table**: A two-column table that maps job requirements to the candidate's qualifications
3. **Closing**: A paragraph that sells why the candidate is a good fit, addressing any potential gaps and highlighting continuous learning

Example structure:

```
Dear Hiring Manager,

[Introduction paragraph with position interest and personal traits]

Your Requirements | My Qualifications
------------------|------------------
[Requirement 1]   | [Qualification 1]
[Requirement 2]   | [Qualification 2]
...               | ...

[Closing paragraph emphasizing fit and addressing any gaps]

Sincerely,
[Candidate Name]
```

This approach is particularly effective for technical positions as it clearly demonstrates how the candidate meets each specific job requirement.

### API Request Example

```json
{
  "companyName": "Example Inc",
  "jobTitle": "Senior Developer",
  "jobDescription": "We are looking for a senior developer...",
  "tonePreference": "PROFESSIONAL",
  "generateMultiple": true,
  "approaches": ["REQUIREMENTS_TABLE", "ACHIEVEMENT_FOCUSED"],
  "customTemplate": "Dear Hiring Manager,\n\nI am writing to express my interest in...",
  "resume": { ... }
}
```

### API Response Example

```json
{
  "success": true,
  "data": {
    "coverLetters": [
      {
        "coverLetter": "...",
        "approach": "REQUIREMENTS_TABLE",
        "metadata": { ... }
      },
      {
        "coverLetter": "...",
        "approach": "ACHIEVEMENT_FOCUSED",
        "metadata": { ... }
      }
    ],
    "companyResearchUsed": true
  }
}
```

## Dependencies

- WriterAgent.ts
- coverLetterController.ts
- Orchestrator.ts
- OrchestratorState.ts
- featureFlags.ts

## Estimated Effort

- Interface and Type Definitions: 0.5 day
- WriterAgent Enhancement: 1 day
- Controller Updates: 0.5 day
- Orchestrator Integration: 0.5 day
- Feature Flag Implementation: 0.25 day
- Testing: 1 day
- Documentation: 0.5 day

Total: ~4.25 days

## Next Steps

1. Begin with Interface and Type Definitions (1.1-1.6)
2. Implement WriterAgent enhancements (2.1-2.5)
3. Update the controller (3.1-3.5)
4. Integrate with Orchestrator (4.1-4.4)
5. Implement feature flag (5.1-5.4)
6. Write tests (6.1-6.6)
7. Update documentation (7.1-7.5)
