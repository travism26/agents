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
    const response = await axios.post('http://your-domain/api/generate-email', {
      userId: 'user123',
      contact: {
        name: 'John Smith',
        title: 'CTO',
        company: {
          name: 'Tech Corp',
          industry: 'Software'
        }
      },
      preferences: {
        style: 'formal',
        cefrLevel: 'C1',
        maxLength: 300,
        tone: 'professional'
      }
    }, {
      headers: {
        'Authorization': 'Bearer your-token',
        'Content-Type': 'application/json'
      }
    });

    return response.data.jobId;
  } catch (error) {
    console.error('Error generating email:', error.response?.data || error.message);
    throw error;
  }
}
```

### 2. Checking Job Status with Exponential Backoff

```javascript
async function checkJobStatus(jobId, maxAttempts = 10) {
  let attempt = 0;
  const baseDelay = 5000; // 5 seconds

  while (attempt < maxAttempts) {
    try {
      const response = await axios.get(`http://your-domain/api/job-status/${jobId}`, {
        headers: {
          'Authorization': 'Bearer your-token'
        }
      });

      if (response.data.status === 'completed') {
        return response.data.result;
      }

      if (response.data.status === 'failed') {
        throw new Error(response.data.error.message);
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    } catch (error) {
      console.error('Error checking status:', error.response?.data || error.message);
      throw error;
    }
  }

  throw new Error('Maximum attempts reached');
}
```

## Advanced Configurations

### 1. Custom Email Style with Research Focus

```javascript
const emailConfig = {
  userId: 'user123',
  contact: {
    name: 'Sarah Johnson',
    title: 'VP of Innovation',
    company: {
      name: 'Future Tech Inc',
      industry: 'AI and Robotics'
    }
  },
  preferences: {
    style: 'formal',
    cefrLevel: 'C2',
    maxLength: 500,
    tone: 'professional',
    researchPreferences: {
      timeframe: 'last_3_months',
      focusAreas: ['AI developments', 'robotics innovations'],
      minArticles: 3,
      maxArticles: 5
    },
    contentPreferences: {
      includeTechnicalDetails: true,
      highlightInnovations: true,
      mentionCompetitors: false
    }
  }
};
```

### 2. Webhook Integration

```javascript
// Configure webhook
async function setupWebhook() {
  try {
    const response = await axios.post('http://your-domain/api/webhooks/configure', {
      url: 'https://your-service.com/webhook',
      events: ['job.completed', 'job.failed'],
      secret: 'your-webhook-secret'
    }, {
      headers: {
        'Authorization': 'Bearer your-token'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error setting up webhook:', error);
    throw error;
  }
}

// Webhook handler (Express.js example)
const crypto = require('crypto');

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = req.body;
  
  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', 'your-webhook-secret')
    .update(JSON.stringify(payload))
    .digest('hex');
    
  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }
  
  // Handle webhook event
  switch (payload.event) {
    case 'job.completed':
      handleCompletedJob(payload.data);
      break;
    case 'job.failed':
      handleFailedJob(payload.data);
      break;
  }
  
  res.status(200).send('OK');
});
```

## Integration Examples

### 1. CRM Integration (Salesforce Example)

```javascript
const jsforce = require('jsforce');

async function generateEmailsForLeads() {
  // Connect to Salesforce
  const conn = new jsforce.Connection({
    loginUrl: 'https://login.salesforce.com'
  });
  
  await conn.login('user@example.com', 'password');
  
  // Query leads
  const leads = await conn.query('SELECT Id, Name, Title, Company FROM Lead WHERE Status = \'New\'');
  
  // Generate emails for each lead
  for (const lead of leads.records) {
    try {
      const jobId = await generateBasicEmail({
        userId: 'crm-integration',
        contact: {
          name: lead.Name,
          title: lead.Title,
          company: {
            name: lead.Company,
            industry: lead.Industry
          }
        },
        preferences: {
          style: 'professional',
          cefrLevel: 'C1',
          maxLength: 400,
          tone: 'friendly'
        }
      });
      
      // Store job ID in Salesforce
      await conn.sobject('Lead').update({
        Id: lead.Id,
        Email_Generation_Job_Id__c: jobId
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
  constructor(contacts, config = {}) {
    this.contacts = contacts;
    this.limiter = new RateLimiter({
      tokensPerInterval: config.rateLimit || 100,
      interval: 'minute'
    });
    this.results = new Map();
  }

  async process() {
    const chunks = this.chunkArray(this.contacts, 10);
    
    for (const chunk of chunks) {
      await Promise.all(chunk.map(async contact => {
        await this.limiter.removeTokens(1);
        try {
          const jobId = await generateBasicEmail({
            userId: contact.userId,
            contact: contact,
            preferences: contact.preferences
          });
          this.results.set(contact.id, { status: 'pending', jobId });
        } catch (error) {
          this.results.set(contact.id, { status: 'failed', error: error.message });
        }
      }));
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
      const jobId = await generateBasicEmail(config);
      return jobId;
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
      await new Promise(resolve => setTimeout(resolve, delay));
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
  constructor(baseConfig = {}) {
    this.baseConfig = {
      style: 'professional',
      cefrLevel: 'C1',
      maxLength: 300,
      tone: 'friendly',
      ...baseConfig
    };
  }

  createConfig(contact, overrides = {}) {
    return {
      userId: contact.userId,
      contact: {
        name: contact.name,
        title: contact.title,
        company: {
          name: contact.company,
          industry: contact.industry
        }
      },
      preferences: {
        ...this.baseConfig,
        ...overrides
      }
    };
  }
}

// Usage
const configManager = new EmailGenerationConfig({
  style: 'formal',
  cefrLevel: 'C2'
});

const config = configManager.createConfig(
  {
    userId: 'user123',
    name: 'Alice Smith',
    title: 'CEO',
    company: 'Innovation Corp',
    industry: 'Technology'
  },
  {
    tone: 'professional',
    maxLength: 500
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
        new winston.transports.File({ filename: 'combined.log' })
      ]
    });
  }

  logJobStart(jobId, config) {
    this.logger.info('Email generation started', {
      jobId,
      userId: config.userId,
      company: config.contact.company.name
    });
  }

  logJobComplete(jobId, result) {
    this.logger.info('Email generation completed', {
      jobId,
      processingTime: result.metadata.totalTime
    });
  }

  logJobError(jobId, error) {
    this.logger.error('Email generation failed', {
      jobId,
      error: error.message,
      code: error.code
    });
  }
}
```

These examples demonstrate common patterns and best practices for using the Agentic Email Writer service. Adapt them to your specific needs and requirements.
