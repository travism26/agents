# Agentic Email Writer Usage Examples

This document provides practical examples and patterns for using the Agentic Email Writer service in various scenarios.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Advanced Configurations](#advanced-configurations)
- [Integration Examples](#integration-examples)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Basic Usage

### 1. Simple Email Generation

```javascript
const axios = require('axios');

async function generateBasicEmail() {
  try {
    const response = await axios.post(
      'http://your-domain/api/generate-email',
      {
        user: {
          name: 'Alice Johnson',
          title: 'Sales Director',
          company: 'Acme Corp',
        },
        contact: {
          name: 'John Smith',
          title: 'CTO',
          company: {
            name: 'Tech Corp',
            industry: 'Software',
            website: 'https://techcorp.com',
          },
          email: 'john@techcorp.com',
          linkedIn: 'linkedin.com/in/johnsmith',
        },
        timeframe: {
          startDate: '2025-01-01T00:00:00Z',
          endDate: '2025-02-01T00:00:00Z',
        },
        options: {
          tone: 'formal',
          maxLength: 500,
          includeCta: true,
        },
      },
      {
        headers: {
          Authorization: 'Bearer your-token',
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.data.emailId;
  } catch (error) {
    console.error(
      'Error generating email:',
      error.response?.data || error.message
    );
    throw error;
  }
}
```

### 2. Checking Email Status with Exponential Backoff

```javascript
async function checkEmailStatus(emailId, maxAttempts = 10) {
  let attempt = 0;
  const baseDelay = 5000; // 5 seconds

  while (attempt < maxAttempts) {
    try {
      const response = await axios.get(
        `http://your-domain/api/status/${emailId}`,
        {
          headers: {
            Authorization: 'Bearer your-token',
          },
        }
      );

      if (response.data.data.status === 'completed') {
        // Get the final draft
        const finalDraft = await axios.get(
          `http://your-domain/api/final/${emailId}`,
          {
            headers: {
              Authorization: 'Bearer your-token',
            },
          }
        );
        return finalDraft.data.data;
      }

      if (response.data.data.status === 'failed') {
        throw new Error(response.data.data.failedReason);
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt++;
    } catch (error) {
      console.error(
        'Error checking status:',
        error.response?.data || error.message
      );
      throw error;
    }
  }

  throw new Error('Maximum attempts reached');
}
```

## Advanced Configurations

### 1. Custom Email Generation with Research Focus

```javascript
const emailConfig = {
  user: {
    name: 'Sarah Johnson',
    title: 'VP of Innovation',
    company: 'Future Tech Inc',
  },
  contact: {
    name: 'Michael Chen',
    title: 'Head of AI',
    company: {
      name: 'AI Solutions Ltd',
      industry: 'Artificial Intelligence',
      website: 'https://aisolutions.com',
    },
    email: 'michael@aisolutions.com',
    linkedIn: 'linkedin.com/in/michaelchen',
  },
  timeframe: {
    startDate: '2025-01-01T00:00:00Z',
    endDate: '2025-03-31T00:00:00Z',
  },
  options: {
    tone: 'formal',
    maxLength: 800,
    includeCta: true,
  },
};
```

## Integration Examples

### 1. CRM Integration (Salesforce Example)

```javascript
const jsforce = require('jsforce');

async function generateEmailsForLeads() {
  // Connect to Salesforce
  const conn = new jsforce.Connection({
    loginUrl: 'https://login.salesforce.com',
  });

  await conn.login('user@example.com', 'password');

  // Query leads
  const leads = await conn.query(
    "SELECT Id, Name, Title, Company, Industry FROM Lead WHERE Status = 'New'"
  );

  // Generate emails for each lead
  for (const lead of leads.records) {
    try {
      const emailId = await generateBasicEmail({
        user: {
          name: 'Sales Representative',
          title: 'Account Executive',
          company: 'Your Company',
        },
        contact: {
          name: lead.Name,
          title: lead.Title,
          company: {
            name: lead.Company,
            industry: lead.Industry,
          },
        },
        options: {
          tone: 'formal',
          maxLength: 500,
          includeCta: true,
        },
      });

      // Store email ID in Salesforce
      await conn.sobject('Lead').update({
        Id: lead.Id,
        Email_Generation_Id__c: emailId,
      });
    } catch (error) {
      console.error(`Error processing lead ${lead.Id}:`, error);
    }
  }
}
```

### 2. Batch Processing with Rate Limiting

```javascript
const { RateLimiter } = require('limiter');

class EmailGenerationBatch {
  constructor(contacts, userDetails, config = {}) {
    this.contacts = contacts;
    this.userDetails = userDetails;
    this.limiter = new RateLimiter({
      tokensPerInterval: config.rateLimit || 100,
      interval: 'minute',
    });
    this.results = new Map();
  }

  async process() {
    const chunks = this.chunkArray(this.contacts, 10);

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (contact) => {
          await this.limiter.removeTokens(1);
          try {
            const emailId = await generateBasicEmail({
              user: this.userDetails,
              contact: {
                name: contact.name,
                title: contact.title,
                company: {
                  name: contact.company,
                  industry: contact.industry,
                  website: contact.website,
                },
                email: contact.email,
                linkedIn: contact.linkedIn,
              },
              options: contact.options,
            });
            this.results.set(contact.id, { status: 'pending', emailId });
          } catch (error) {
            this.results.set(contact.id, {
              status: 'failed',
              error: error.message,
            });
          }
        })
      );
    }

    return this.results;
  }

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
```

## Error Handling

### 1. Comprehensive Error Handling

```javascript
class EmailGenerationError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = 'EmailGenerationError';
    this.code = code;
    this.details = details;
  }
}

async function generateEmailWithRetry(config, maxRetries = 3) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const emailId = await generateBasicEmail(config);
      return emailId;
    } catch (error) {
      lastError = error;

      // Don't retry on validation errors
      if (error.response?.status === 400) {
        throw new EmailGenerationError(
          'Invalid configuration',
          'VALIDATION_ERROR',
          error.response.data
        );
      }

      // Wait before retrying
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new EmailGenerationError(
    'Max retries exceeded',
    'RETRY_ERROR',
    lastError
  );
}
```

## Best Practices

### 1. Configuration Management

```javascript
class EmailGenerationConfig {
  constructor(userDetails, baseConfig = {}) {
    this.userDetails = userDetails;
    this.baseConfig = {
      tone: 'formal',
      maxLength: 500,
      includeCta: true,
      ...baseConfig,
    };
  }

  createConfig(contact, overrides = {}) {
    return {
      user: this.userDetails,
      contact: {
        name: contact.name,
        title: contact.title,
        company: {
          name: contact.company,
          industry: contact.industry,
          website: contact.website,
        },
        email: contact.email,
        linkedIn: contact.linkedIn,
      },
      options: {
        ...this.baseConfig,
        ...overrides,
      },
    };
  }
}

// Usage
const configManager = new EmailGenerationConfig(
  {
    name: 'Alice Smith',
    title: 'Sales Director',
    company: 'Innovation Corp',
  },
  {
    tone: 'formal',
    maxLength: 600,
  }
);

const config = configManager.createConfig(
  {
    name: 'Bob Wilson',
    title: 'CTO',
    company: 'Tech Solutions',
    industry: 'Software',
    website: 'https://techsolutions.com',
    email: 'bob@techsolutions.com',
  },
  {
    maxLength: 800,
  }
);
```

### 2. Logging and Monitoring

```javascript
const winston = require('winston');

class EmailGenerationLogger {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
      ],
    });
  }

  logJobStart(emailId, config) {
    this.logger.info('Email generation started', {
      emailId,
      user: config.user.name,
      company: config.contact.company.name,
    });
  }

  logJobComplete(emailId, result) {
    this.logger.info('Email generation completed', {
      emailId,
      status: result.status,
      articlesCount: result.articles.length,
    });
  }

  logJobError(emailId, error) {
    this.logger.error('Email generation failed', {
      emailId,
      error: error.message,
      code: error.code,
    });
  }
}
```

These examples demonstrate common patterns and best practices for using the Agentic Email Writer service. Adapt them to your specific needs and requirements.

## Testing in Kubernetes Environment

### 1. Local Testing with Port Forwarding

To test the service running in Kubernetes locally:

```bash
# Set up port forwarding to access the service
kubectl port-forward -n agentic-email-writer svc/agentic-email-writer 3001:3000

# Generate an email (using demo authentication)
curl -X POST http://localhost:3001/api/generate-email/generate \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-key" \
  -d '{
    "user": {
      "name": "Test User",
      "title": "Software Engineer",
      "company": "Test Company"
    },
    "contact": {
      "name": "John Smith",
      "title": "CTO",
      "company": {
        "name": "Tech Corp",
        "industry": "Software",
        "website": "https://techcorp.com"
      },
      "email": "john@techcorp.com",
      "linkedIn": "linkedin.com/in/johnsmith"
    },
    "options": {
      "tone": "formal",
      "maxLength": 500,
      "includeCta": true
    }
  }'

# Check email generation status (replace EMAIL_ID with the ID from generate response)
curl -H "x-api-key: test-key" \
  http://localhost:3001/api/generate-email/status/EMAIL_ID

# Monitor the service logs
kubectl logs -f -n agentic-email-writer deployment/agentic-email-writer --tail=50
```

The service will respond with a job ID and email ID that you can use to track the status of the email generation:

```json
{
  "message": "Email generation started",
  "data": {
    "jobId": "1",
    "emailId": "67bb4395686fa537fff8ffbf",
    "status": "pending",
    "estimatedCompletion": "2025-02-23T15:54:41.651Z"
  }
}
```

You can then check the status using the returned emailId. The status response will include details about the generation process:

```json
{
  "data": {
    "status": "pending",
    "user": {
      "name": "Test User",
      "title": "Software Engineer",
      "company": "Test Company"
    },
    "contact": {
      "name": "John Smith",
      "title": "CTO",
      "company": {
        "name": "Tech Corp",
        "industry": "Software",
        "website": "https://techcorp.com"
      },
      "email": "john@techcorp.com",
      "linkedIn": "linkedin.com/in/johnsmith"
    },
    "createdAt": "2025-02-23T15:49:41.643Z",
    "draftsCount": 0,
    "articlesCount": 0,
    "hasFinalDraft": false
  }
}
```

Note: For demo/testing purposes, the service accepts any non-empty string as the x-api-key. In production, implement proper authentication as described in the API documentation.
