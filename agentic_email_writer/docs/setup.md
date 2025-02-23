# Agentic Email Writer Setup Guide (Demo Version)

This guide provides instructions for setting up and deploying the demo version of the Agentic Email Writer service.

## Prerequisites

### Development Environment

- Node.js 18.x or later
- npm 9.x or later
- Docker 24.x or later
- Docker Compose 2.x

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

3. **Set Up Environment**

   ```bash
   # Copy example environment file
   cp .env.example .env

   # Add your API keys to .env:
   # PERPLEXITY_API_KEY=your-key
   # OPENAI_API_KEY=your-key
   ```

4. **Start Development Services**

   ```bash
   # Start MongoDB and Redis using Docker Compose
   docker-compose up -d

   # Start the development server
   npm run dev
   ```

5. **Run Tests**
   ```bash
   npm test
   ```

## Docker Compose Setup

The demo uses a simplified Docker Compose configuration with:

- MongoDB (no authentication)
- Redis (no password)
- Prometheus for metrics
- Application service

```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

## Kubernetes Deployment

### 1. Deploy Services

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Deploy core services
kubectl apply -f k8s/mongodb.yaml
kubectl apply -f k8s/redis.yaml

# Add your API keys to app-secret
kubectl create secret generic app-secret \
  --namespace=agentic-email-writer \
  --from-literal=perplexity-api-key=<your-key> \
  --from-literal=openai-api-key=<your-key>

# Deploy application
kubectl apply -f k8s/app.yaml
```

### 2. Verify Deployment

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
NODE_ENV=development
PORT=3000

# MongoDB
MONGODB_URI=mongodb://mongodb:27017/agentic_email_writer

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# API Keys (Required)
PERPLEXITY_API_KEY=your-key
OPENAI_API_KEY=your-key

# Monitoring
PROMETHEUS_PORT=9090
```

## Health Checks

Monitor service health:

```bash
# Check API health
curl http://localhost:3000/health

# Check queue health
curl http://localhost:3000/health/queue

# Check database health
curl http://localhost:3000/health/db
```

## Note

This is a demo configuration with simplified setup for easy deployment. For production use:

1. Enable proper authentication for MongoDB and Redis
2. Secure your API keys
3. Configure proper resource limits
4. Follow security best practices
