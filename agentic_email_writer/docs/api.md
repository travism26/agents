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
  "user": {
    "name": "string",
    "title": "string",
    "company": "string"
  },
  "contact": {
    "name": "string",
    "title": "string",
    "company": {
      "name": "string",
      "industry": "string (optional)",
      "website": "string (optional)"
    },
    "email": "string (optional)",
    "linkedIn": "string (optional)"
  },
  "timeframe": {
    "startDate": "string (ISO 8601, optional)",
    "endDate": "string (ISO 8601, optional)"
  },
  "options": {
    "tone": "formal" | "casual" | "friendly",
    "maxLength": "number (100-2000)",
    "includeCta": "boolean"
  }
}
```

#### Response

```json
{
  "message": "Email generation started",
  "data": {
    "jobId": "string",
    "emailId": "string",
    "status": "pending",
    "estimatedCompletion": "string (ISO 8601)"
  }
}
```

#### Status Codes

- 202: Email generation started
- 400: Invalid request body
- 401: Unauthorized
- 429: Rate limit exceeded
- 500: Internal server error

### Get Email Status

Retrieves the status of an email generation process.

```http
GET /status/:emailId
```

#### Response

```json
{
  "data": {
    "status": "pending" | "researching" | "writing" | "reviewing" | "completed" | "failed",
    "user": {
      "name": "string",
      "title": "string",
      "company": "string"
    },
    "contact": {
      "name": "string",
      "title": "string",
      "company": {
        "name": "string",
        "industry": "string",
        "website": "string"
      },
      "email": "string",
      "linkedIn": "string"
    },
    "createdAt": "string (ISO 8601)",
    "completedAt": "string (ISO 8601)",
    "failedReason": "string",
    "draftsCount": "number",
    "articlesCount": "number",
    "hasFinalDraft": "boolean"
  }
}
```

### Get Final Email Draft

Retrieves the final email draft if available.

```http
GET /final/:emailId
```

#### Response

```json
{
  "data": {
    "status": "completed",
    "user": {
      "name": "string",
      "title": "string",
      "company": "string"
    },
    "contact": {
      "name": "string",
      "title": "string",
      "company": {
        "name": "string",
        "industry": "string",
        "website": "string"
      },
      "email": "string",
      "linkedIn": "string"
    },
    "finalDraft": {
      "subject": "string",
      "body": "string",
      "version": "number",
      "createdAt": "string (ISO 8601)",
      "reviewStatus": "approved"
    },
    "articles": [{
      "title": "string",
      "url": "string",
      "publishedDate": "string (ISO 8601)",
      "summary": "string",
      "relevanceScore": "number (0-1)"
    }]
  }
}
```

#### Status Codes

- 200: Success
- 404: Email not found or final draft not available
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
| VAL_001 | Invalid request parameters |
| VAL_002 | Missing required fields |
| SYS_001 | Internal system error |

## Best Practices

1. **Polling Frequency**: When checking email status, implement exponential backoff starting at 5 seconds.
2. **Error Handling**: Always check the error field in responses for detailed error information.
3. **Rate Limiting**: Implement client-side rate limiting to prevent hitting API limits.

## Examples

### Generate Email Request

```curl
curl -X POST https://your-domain/api/generate-email \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "user": {
      "name": "John Smith",
      "title": "Sales Director",
      "company": "Acme Corp"
    },
    "contact": {
      "name": "Jane Doe",
      "title": "CTO",
      "company": {
        "name": "Tech Corp",
        "industry": "Software",
        "website": "https://techcorp.com"
      },
      "email": "jane@techcorp.com",
      "linkedIn": "linkedin.com/in/janedoe"
    },
    "options": {
      "tone": "formal",
      "maxLength": 500,
      "includeCta": true
    }
  }'
```

### Check Email Status

```curl
curl https://your-domain/api/status/email123 \
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
