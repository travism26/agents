# URL Debug Checklist

This document tracks endpoint and URL validations across all components of the system.

## API Endpoints

| Endpoint                     | Method | Status | Last Tested | Notes                                      |
| ---------------------------- | ------ | ------ | ----------- | ------------------------------------------ |
| `/api/generate-cover-letter` | POST   | 🔍     | 2025-02-28  | Cover letter generation endpoint (planned) |
| `/api/health`                | GET    | 🔍     | 2025-02-28  | Health check endpoint (planned)            |

## Frontend Routes

| Route     | Status | Last Tested | Notes   |
| --------- | ------ | ----------- | ------- |
| `EXAMPLE` | ✅     | YYYY-MM-DD  | EXAMPLE |

## Health Check Endpoints

| Service          | Endpoint  | Status | Last Tested | Notes               |
| ---------------- | --------- | ------ | ----------- | ------------------- |
| Cover Letter API | `/health` | 🔍     | 2025-02-28  | Not yet implemented |

## External Service Integrations

| Service         | Endpoint                                     | Status | Last Tested | Notes                           |
| --------------- | -------------------------------------------- | ------ | ----------- | ------------------------------- |
| OpenAI API      | `https://api.openai.com/v1/chat/completions` | 🔍     | 2025-02-28  | Required for Cover Letter Agent |
| Bing Search API | `https://api.bing.microsoft.com/v7.0/search` | 🔍     | 2025-02-28  | Required for Research Agent     |
| Perplexity API  | `https://api.perplexity.ai/search`           | 🔍     | 2025-02-28  | Required for Research Agent     |

## Webhook Endpoints

| Webhook                   | Method | Status | Last Tested | Notes            |
| ------------------------- | ------ | ------ | ----------- | ---------------- |
| `/api/v1/example/webhook` | POST   | ✅     | YYYY-MM-DD  | EXAMPLE WEB HOOK |

## Authentication and Authorization

| Test Case               | Status | Last Tested | Notes        |
| ----------------------- | ------ | ----------- | ------------ |
| Valid credentials login | ✅     | YYYY-MM-DD  | EXAMPLE AUTH |

## Performance Testing

| Endpoint             | Response Time | Last Tested | Notes               |
| -------------------- | ------------- | ----------- | ------------------- |
| `/api/v1/auth/login` | 120ms         | YYYY-MM-DD  | EXAMPLE PERFORMANCE |

## Known Issues

| Issue                                   | Status | Affected Endpoints       | Priority | Notes                             |
| --------------------------------------- | ------ | ------------------------ | -------- | --------------------------------- |
| Occasional timeout on large log queries | 🔍     | `/api/v1/logs`           | Medium   | Investigating query optimization  |
| Rate limiting too aggressive            | 🔍     | All endpoints            | Low      | Considering adjusting rate limits |
| Intermittent 503 errors                 | 🔍     | `/api/v1/metrics/system` | High     | Investigating service stability   |

## Recent Changes

| Date | Change | Affected Endpoints | Validation Status |
