# Agentic Email Writer Troubleshooting Guide

This guide helps you diagnose and resolve common issues you might encounter while using the Agentic Email Writer service.

## Table of Contents
- [Common Issues](#common-issues)
- [Error Codes](#error-codes)
- [Performance Issues](#performance-issues)
- [Monitoring and Debugging](#monitoring-and-debugging)
- [Contact Support](#contact-support)

## Common Issues

### Authentication Issues

#### Problem: Invalid Token
```
{
  "error": {
    "code": "AUTH_001",
    "message": "Invalid authentication token"
  }
}
```

**Solutions:**
1. Verify token format and expiration
2. Ensure token is included in Authorization header
3. Check if token has been revoked
4. Generate a new token if necessary

#### Problem: Token Expired
```
{
  "error": {
    "code": "AUTH_002",
    "message": "Token expired"
  }
}
```

**Solutions:**
1. Request a new token
2. Implement token refresh logic
3. Check token expiration before making requests

### API Rate Limiting

#### Problem: Rate Limit Exceeded
```
{
  "error": {
    "code": "RATE_001",
    "message": "Rate limit exceeded"
  }
}
```

**Solutions:**
1. Implement exponential backoff
2. Use batch processing for multiple requests
3. Monitor rate limit headers
4. Optimize request patterns

### Job Processing Issues

#### Problem: Job Timeout
```
{
  "error": {
    "code": "JOB_003",
    "message": "Job processing timeout"
  }
}
```

**Solutions:**
1. Check system resources
2. Verify external API availability
3. Adjust timeout settings
4. Monitor job queue health

#### Problem: Research Phase Failed
```
{
  "error": {
    "code": "JOB_101",
    "message": "Research phase failed: No relevant articles found"
  }
}
```

**Solutions:**
1. Verify company information
2. Adjust research timeframe
3. Check Perplexity API status
4. Broaden search criteria

## Error Codes

### Authentication Errors (AUTH_XXX)

| Code | Description | Solution |
|------|-------------|----------|
| AUTH_001 | Invalid token | Verify token format and authorization header |
| AUTH_002 | Token expired | Request new token |
| AUTH_003 | Insufficient permissions | Check required permissions |

### Rate Limiting Errors (RATE_XXX)

| Code | Description | Solution |
|------|-------------|----------|
| RATE_001 | Rate limit exceeded | Implement backoff strategy |
| RATE_002 | Daily limit exceeded | Wait for limit reset |
| RATE_003 | Concurrent requests limit | Reduce parallel requests |

### Job Processing Errors (JOB_XXX)

| Code | Description | Solution |
|------|-------------|----------|
| JOB_001 | Invalid job ID | Verify job ID format |
| JOB_002 | Job processing failed | Check error details |
| JOB_003 | Job timeout | Adjust timeout settings |
| JOB_101 | Research phase failed | Check research parameters |
| JOB_102 | Writing phase failed | Verify input data |
| JOB_103 | Review phase failed | Check quality requirements |

### Validation Errors (VAL_XXX)

| Code | Description | Solution |
|------|-------------|----------|
| VAL_001 | Invalid parameters | Check request format |
| VAL_002 | Missing required fields | Include all required fields |
| VAL_003 | Invalid CEFR level | Use supported CEFR level |

## Performance Issues

### Slow Response Times

**Symptoms:**
- API requests take longer than usual
- Job processing times increase
- Queue backlog grows

**Solutions:**
1. Check system metrics:
   ```bash
   curl http://your-domain/metrics | grep api_request_duration_seconds
   ```

2. Monitor resource usage:
   ```bash
   kubectl top pods -n agentic-email-writer
   ```

3. Check queue health:
   ```bash
   curl http://your-domain/health/queue
   ```

### Memory Issues

**Symptoms:**
- Pod restarts
- Out of memory errors
- Degraded performance

**Solutions:**
1. Check container logs:
   ```bash
   kubectl logs deployment/agentic-email-writer -n agentic-email-writer
   ```

2. Monitor memory usage:
   ```bash
   kubectl describe pod -n agentic-email-writer
   ```

3. Adjust resource limits:
   ```yaml
   resources:
     requests:
       memory: "1Gi"
     limits:
       memory: "2Gi"
   ```

## Monitoring and Debugging

### Enable Debug Logging

1. Set environment variable:
   ```env
   LOG_LEVEL=debug
   ```

2. Check detailed logs:
   ```bash
   kubectl logs -f deployment/agentic-email-writer -n agentic-email-writer
   ```

### Monitor Queue Health

1. Check queue metrics:
   ```bash
   curl http://your-domain/metrics | grep queue_
   ```

2. View active jobs:
   ```bash
   curl http://your-domain/api/queue/status
   ```

### Check System Health

1. API health:
   ```bash
   curl http://your-domain/health
   ```

2. Database health:
   ```bash
   curl http://your-domain/health/db
   ```

3. Queue health:
   ```bash
   curl http://your-domain/health/queue
   ```

## Contact Support

If you cannot resolve an issue using this guide:

1. Gather relevant information:
   - Error messages and codes
   - Job IDs
   - System logs
   - API response data
   - Metrics data

2. Contact support:
   - Email: support@your-domain
   - Include all gathered information
   - Describe steps to reproduce
   - Provide environment details

3. Emergency support:
   - Phone: +1-XXX-XXX-XXXX
   - Available 24/7 for production issues

### Support Tiers

| Tier | Response Time | Coverage | Contact Method |
|------|--------------|----------|----------------|
| Standard | 24 hours | 9-5 M-F | Email |
| Premium | 4 hours | 24/7 | Email, Phone |
| Enterprise | 1 hour | 24/7 | Email, Phone, Slack |

### Before Contacting Support

1. Check this troubleshooting guide
2. Review recent system status updates
3. Search knowledge base
4. Check service status page
5. Gather all relevant information

### Support Ticket Template

```markdown
## Issue Description
[Detailed description of the problem]

## Error Details
- Error Code: [if applicable]
- Error Message: [exact message]
- Job ID: [if applicable]

## Environment
- Environment: [production/staging/development]
- Service Version: [version number]
- Client Library: [if applicable]

## Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Additional Information
- Logs: [relevant log excerpts]
- Screenshots: [if applicable]
- Metrics: [relevant metrics]
