# Agentic Email Writer API Documentation

## Overview

The Agentic Email Writer API provides endpoints for generating personalized business emails using AI agents. The service employs a multi-agent system for research, writing, and quality control.

## Base URL

```
http://your-domain/api
```

## Authentication

All API requests require authentication using a Bearer token in the Authorization header:

```
Authorization: Bearer <your-token>
```

## Rate Limiting

- 100 requests per minute per API key
- 1000 requests per day per API key

## Endpoints

### Generate Email

Initiates the email generation process.

```http
POST /generate-email
```

#### Request Body

```json
{
  "userId": "string",
  "contact": {
    "name": "string",
    "title": "string",
    "company": {
      "name": "string",
      "industry": "string"
    }
  },
  "preferences": {
    "style": "formal" | "casual" | "friendly",
    "cefrLevel": "B1" | "B2" | "C1" | "C2",
    "maxLength": number,
    "tone": "professional" | "enthusiastic" | "direct"
  }
}
```

#### Response

```json
{
  "jobId": "string",
  "status": "pending",
  "estimatedCompletionTime": "string (ISO 8601)"
}
```

#### Status Codes

- 201: Job created successfully
- 400: Invalid request body
- 401: Unauthorized
- 429: Rate limit exceeded
- 500: Internal server error

### Check Job Status

Retrieves the status of an email generation job.

```http
GET /job-status/:jobId
```

#### Response

```json
{
  "jobId": "string",
  "status": "pending" | "researching" | "writing" | "reviewing" | "completed" | "failed",
  "progress": {
    "currentPhase": "string",
    "percentComplete": number,
    "estimatedTimeRemaining": "string"
  },
  "result": {
    "email": {
      "subject": "string",
      "body": "string",
      "metadata": {
        "researchTime": number,
        "writingTime": number,
        "reviewTime": number,
        "revisionCount": number
      }
    },
    "sources": [{
      "title": "string",
      "url": "string",
      "publishedDate": "string",
      "relevanceScore": number
    }]
  },
  "error": {
    "code": "string",
    "message": "string",
    "details": "string"
  }
}
```

#### Status Codes

- 200: Success
- 404: Job not found
- 401: Unauthorized
- 500: Internal server error

## Error Codes

| Code | Description |
|------|-------------|
| AUTH_001 | Invalid authentication token |
| AUTH_002 | Token expired |
| AUTH_003 | Insufficient permissions |
| RATE_001 | Rate limit exceeded |
| RATE_002 | Daily limit exceeded |
| JOB_001 | Invalid job ID |
| JOB_002 | Job processing failed |
| VAL_001 | Invalid request parameters |
| VAL_002 | Missing required fields |
| SYS_001 | Internal system error |

## Webhooks

You can configure webhooks to receive notifications about job status changes:

```http
POST /webhooks/configure
```

```json
{
  "url": "string",
  "events": ["job.completed", "job.failed"],
  "secret": "string"
}
```

## Best Practices

1. **Polling Frequency**: When checking job status, implement exponential backoff starting at 5 seconds.
2. **Error Handling**: Always check the error field in responses for detailed error information.
3. **Rate Limiting**: Implement client-side rate limiting to prevent hitting API limits.
4. **Webhook Security**: Always verify webhook signatures using your secret key.

## Examples

### Generate Email Request

```curl
curl -X POST https://your-domain/api/generate-email \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "contact": {
      "name": "John Smith",
      "title": "CTO",
      "company": {
        "name": "Tech Corp",
        "industry": "Software"
      }
    },
    "preferences": {
      "style": "formal",
      "cefrLevel": "C1",
      "maxLength": 300,
      "tone": "professional"
    }
  }'
```

### Check Job Status

```curl
curl https://your-domain/api/job-status/job123 \
  -H "Authorization: Bearer your-token"
```

## SDK Support

Official SDKs are available for:

- Node.js
- Python
- Java
- Go

## Support

For API support, contact:
- Email: api-support@your-domain
- Documentation Issues: GitHub Issues
- Status Page: status.your-domain
