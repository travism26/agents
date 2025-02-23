# Agentic Email Generator

A TypeScript module that generates personalized outreach emails using AI agents for research, writing, and review.

## Installation

```bash
npm install agentic-email-generator
```

## Configuration

1. Create a `.env` file in your project root (use `.env.example` as a template):

```env
OPENAI_API_KEY=your_api_key_here
NEWS_API_KEY=your_news_api_key_here
```

## Usage

```typescript
import { generateEmails, EmailOptions } from 'agentic-email-generator';
import { User, Contact, Company } from 'agentic-email-generator/models';

// Define the sender
const user: User = {
  _id: 'user123',
  name: 'John Doe',
  title: 'Sales Manager',
  company: 'Example Corp',
};

// Define the recipient
const contact: Contact = {
  _id: 'contact456',
  name: 'Jane Smith',
  title: 'CEO',
  company: 'Target Corp',
};

// Define the target company
const company: Company = {
  _id: 'company789',
  name: 'Target Corp',
  details: {
    industry: 'Technology',
    size: 'Enterprise',
    region: 'North America',
  },
};

// Configure email generation options
const options: EmailOptions = {
  goal: 'explore partnership opportunities',
  style: 'professional',
  tone: 'friendly',
  maxLength: 300,
  includeSalutation: true,
  includeSignature: true,
};

// Generate personalized email
try {
  const result = await generateEmails(user, contact, company, options);

  if (result.record.status === 'approved') {
    console.log(
      'Generated Email:',
      result.record.generatedEmails[0].generatedEmailBody
    );
  } else {
    console.error('Generation failed:', result.record.failedReason);
  }
} catch (error) {
  console.error('Error:', error);
}
```

## Testing

The module includes both unit tests and integration tests.

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test tests/index.test.ts
```

### Test Structure

- `tests/models.test.ts` - Data model validation tests
- `tests/researcher.test.ts` - News research functionality tests
- `tests/writer.test.ts` - Email composition tests
- `tests/reviewer.test.ts` - Quality review tests
- `tests/index.test.ts` - Integration tests

## Features

- **Research Agent**: Fetches and analyzes recent news articles about the target company
- **Writer Agent**: Generates personalized email drafts incorporating relevant news
- **Reviewer Agent**: Ensures quality and suggests improvements
- **Automatic Revision**: Supports up to 3 revision rounds for quality improvement
- **Metadata Tracking**: Includes generation IDs, timestamps, and status tracking

## Error Handling

The module handles various error scenarios:

- No relevant news articles found
- Failed quality checks after maximum revisions
- Invalid input data
- API failures
- Network issues

All errors are properly logged and included in the generation record.

## Types

Key TypeScript interfaces are exported for use in your application:

```typescript
import {
  User,
  Contact,
  Company,
  EmailOptions,
  GeneratedEmailRecord,
  GeneratedEmail,
} from 'agentic-email-generator/models';
```

## License

MIT
