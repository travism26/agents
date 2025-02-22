import request from 'supertest';
import { createServer } from '../server';
import { Express } from 'express';
import {
  trackEmailGeneration,
  trackProcessingPhase,
  updateResearchQuality,
  updateQueueSize,
  trackQueueLatency,
  trackApiRequest,
  trackApiLatency,
  updateResourceUsage,
} from '../utils/monitoring';

describe('Monitoring Integration Tests', () => {
  let app: Express;

  beforeEach(async () => {
    app = await createServer();
  });

  describe('Metrics Endpoint', () => {
    it('should expose metrics endpoint', async () => {
      const response = await request(app).get('/metrics');
      expect(response.status).toBe(200);
      expect(response.type).toBe('text/plain');
      expect(response.text).toContain('email_generation_total');
      expect(response.text).toContain('queue_size');
      expect(response.text).toContain('api_requests_total');
    });

    it('should track email generation metrics', async () => {
      // Record some test metrics
      trackEmailGeneration('success');
      trackEmailGeneration('failure');
      trackProcessingPhase('research', 1.5);

      const response = await request(app).get('/metrics');
      expect(response.text).toContain(
        'email_generation_total{status="success"} 1'
      );
      expect(response.text).toContain(
        'email_generation_total{status="failure"} 1'
      );
      expect(response.text).toContain(
        'email_processing_duration_seconds_bucket'
      );
    });

    it('should track research quality metrics', async () => {
      updateResearchQuality('relevance', 0.85);
      updateResearchQuality('freshness', 0.95);

      const response = await request(app).get('/metrics');
      expect(response.text).toContain(
        'research_quality_score{type="relevance"} 0.85'
      );
      expect(response.text).toContain(
        'research_quality_score{type="freshness"} 0.95'
      );
    });

    it('should track queue performance metrics', async () => {
      updateQueueSize('researcher', 5);
      trackQueueLatency('writer', 2.5);

      const response = await request(app).get('/metrics');
      expect(response.text).toContain('queue_size{queue_name="researcher"} 5');
      expect(response.text).toContain(
        'queue_processing_latency_seconds_bucket'
      );
    });

    it('should track API metrics', async () => {
      trackApiRequest('/api/generate-email', 200);
      trackApiLatency('/api/generate-email', 0.5);

      const response = await request(app).get('/metrics');
      expect(response.text).toContain(
        'api_requests_total{endpoint="/api/generate-email",status="200"} 1'
      );
      expect(response.text).toContain('api_request_duration_seconds_bucket');
    });

    it('should track resource usage metrics', async () => {
      updateResourceUsage('memory', 512);
      updateResourceUsage('cpu', 45);

      const response = await request(app).get('/metrics');
      expect(response.text).toContain(
        'resource_usage{resource_type="memory"} 512'
      );
      expect(response.text).toContain('resource_usage{resource_type="cpu"} 45');
    });
  });

  describe('Middleware Integration', () => {
    it('should automatically track HTTP metrics', async () => {
      // Make a test request to trigger middleware metrics
      await request(app).post('/api/generate-email').send({});

      const response = await request(app).get('/metrics');
      expect(response.text).toContain('http_request_duration_seconds');
      expect(response.text).toContain('method="POST"');
      expect(response.text).toContain('path="/api/#"');
    });
  });
});
