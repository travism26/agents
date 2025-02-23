# Agentic Email Writer Setup Guide

This guide provides comprehensive instructions for setting up and deploying the Agentic Email Writer service in both development and production environments.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Production Deployment](#production-deployment)
- [Environment Configuration](#environment-configuration)
- [Monitoring Setup](#monitoring-setup)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Development Environment
- Node.js 18.x or later
- npm 9.x or later
- Docker 24.x or later
- Docker Compose 2.x
- MongoDB 6.0 or later
- Redis 7.0 or later

### Production Environment
- Kubernetes 1.25 or later
- Helm 3.x
- kubectl CLI tool
- Access to a container registry

## Local Development Setup

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd agentic-email-writer
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Local Environment**
   ```bash
   # Copy example environment file
   cp .env.example .env
   
   # Edit .env with your configuration
   nano .env
   ```

4. **Start Development Services**
   ```bash
   # Start MongoDB and Redis using Docker Compose
   docker-compose up -d mongodb redis
   
   # Start the development server
   npm run dev
   ```

5. **Run Tests**
   ```bash
   # Run unit tests
   npm test
   
   # Run integration tests
   npm run test:integration
   
   # Run e2e tests
   npm run test:e2e
   ```

## Production Deployment

### 1. Build and Push Docker Image

```bash
# Build the image
docker build -t your-registry/agentic-email-writer:version .

# Push to registry
docker push your-registry/agentic-email-writer:version
```

### 2. Configure Kubernetes Resources

1. **Create Namespace and Base Resources**
   ```bash
   kubectl apply -f k8s/namespace.yaml
   ```

2. **Set Up Secrets**
   ```bash
   # Create secrets for MongoDB
   kubectl create secret generic mongodb-secret \
     --namespace=agentic-email-writer \
     --from-literal=username=admin \
     --from-literal=password=<your-password>

   # Create secrets for Redis
   kubectl create secret generic redis-secret \
     --namespace=agentic-email-writer \
     --from-literal=password=<your-password>

   # Create secrets for application
   kubectl create secret generic app-secret \
     --namespace=agentic-email-writer \
     --from-literal=perplexity-api-key=<your-key> \
     --from-literal=openai-api-key=<your-key>
   ```

3. **Deploy Core Services**
   ```bash
   kubectl apply -f k8s/mongodb.yaml
   kubectl apply -f k8s/redis.yaml
   kubectl apply -f k8s/app.yaml
   ```

4. **Deploy Monitoring Stack**
   ```bash
   kubectl apply -f k8s/monitoring.yaml
   ```

### 3. Verify Deployment

```bash
# Check pod status
kubectl get pods -n agentic-email-writer

# Check services
kubectl get services -n agentic-email-writer

# Check logs
kubectl logs -f deployment/agentic-email-writer -n agentic-email-writer
```

## Environment Configuration

### Required Environment Variables

```env
# Application
NODE_ENV=production
PORT=3000

# MongoDB
MONGODB_URI=mongodb://username:password@host:27017/database

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password

# API Keys
PERPLEXITY_API_KEY=your-key
OPENAI_API_KEY=your-key

# Monitoring
PROMETHEUS_PORT=9090
```

### Optional Environment Variables

```env
# Queue Configuration
QUEUE_PREFIX=agentic
MAX_CONCURRENT_JOBS=5
JOB_TIMEOUT=300000

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Performance
MAX_MEMORY_USAGE=2048
GARBAGE_COLLECTION_INTERVAL=3600000
```

## Monitoring Setup

### Prometheus Metrics

The service exposes metrics at `/metrics` endpoint. Key metrics include:

- `email_generation_total`: Total number of emails generated
- `email_generation_duration_seconds`: Email generation duration
- `queue_job_duration_seconds`: Job processing duration
- `api_request_duration_seconds`: API endpoint latency
- `error_total`: Total number of errors by type

### Grafana Dashboards

1. Access Grafana UI at `http://<your-domain>/grafana`
2. Default login: admin/admin
3. Import provided dashboards from `k8s/monitoring/dashboards/`

## Troubleshooting

### Common Issues

1. **MongoDB Connection Issues**
   - Check MongoDB credentials
   - Verify network connectivity
   - Check MongoDB logs: `kubectl logs -f statefulset/mongodb -n agentic-email-writer`

2. **Redis Connection Issues**
   - Verify Redis password
   - Check Redis service status
   - Check Redis logs: `kubectl logs -f statefulset/redis -n agentic-email-writer`

3. **API Errors**
   - Verify API keys are correctly set
   - Check application logs
   - Monitor rate limits

### Debug Mode

Enable debug logging:
```env
LOG_LEVEL=debug
```

### Health Checks

Monitor service health:
```bash
# Check API health
curl http://localhost:3000/health

# Check queue health
curl http://localhost:3000/health/queue

# Check database health
curl http://localhost:3000/health/db
```

### Support

For additional support:
1. Check the logs using `kubectl logs`
2. Review Prometheus metrics
3. Contact the development team
4. Submit issues on GitHub

## Security Notes

1. Always change default passwords
2. Regularly rotate API keys
3. Keep MongoDB and Redis versions updated
4. Monitor security advisories
5. Follow Kubernetes security best practices
