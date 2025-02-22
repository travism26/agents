import promBundle from 'express-prom-bundle';
import { Counter, Histogram, Registry, Gauge } from 'prom-client';

// Create a new registry
export const register = new Registry();

// Email Generation Metrics
export const emailGenerationCounter = new Counter({
  name: 'email_generation_total',
  help: 'Total number of email generation attempts',
  labelNames: ['status'],
  registers: [register],
});

export const emailProcessingTime = new Histogram({
  name: 'email_processing_duration_seconds',
  help: 'Time spent processing emails',
  labelNames: ['phase'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 20, 30, 60],
  registers: [register],
});

// Research Quality Metrics
export const researchQualityGauge = new Gauge({
  name: 'research_quality_score',
  help: 'Quality score of research results',
  labelNames: ['type'],
  registers: [register],
});

// Queue Performance Metrics
export const queueSizeGauge = new Gauge({
  name: 'queue_size',
  help: 'Current size of processing queues',
  labelNames: ['queue_name'],
  registers: [register],
});

export const queueLatencyHistogram = new Histogram({
  name: 'queue_processing_latency_seconds',
  help: 'Processing latency for queue jobs',
  labelNames: ['queue_name'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// API Usage Metrics
export const apiRequestCounter = new Counter({
  name: 'api_requests_total',
  help: 'Total number of API requests',
  labelNames: ['endpoint', 'status'],
  registers: [register],
});

export const apiLatencyHistogram = new Histogram({
  name: 'api_request_duration_seconds',
  help: 'API request latency',
  labelNames: ['endpoint'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

// Resource Usage Metrics
export const resourceUsageGauge = new Gauge({
  name: 'resource_usage',
  help: 'System resource usage metrics',
  labelNames: ['resource_type'],
  registers: [register],
});

// Create middleware
export const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  promRegistry: register,
  normalizePath: [['^/api/.*', '/api/#']],
});

// Helper functions for tracking metrics
export const trackEmailGeneration = (status: 'success' | 'failure') => {
  emailGenerationCounter.inc({ status });
};

export const trackProcessingPhase = (
  phase: 'research' | 'writing' | 'review',
  durationSeconds: number
) => {
  emailProcessingTime.observe({ phase }, durationSeconds);
};

export const updateResearchQuality = (
  type: 'relevance' | 'freshness' | 'depth',
  score: number
) => {
  researchQualityGauge.set({ type }, score);
};

export const updateQueueSize = (queueName: string, size: number) => {
  queueSizeGauge.set({ queue_name: queueName }, size);
};

export const trackQueueLatency = (
  queueName: string,
  durationSeconds: number
) => {
  queueLatencyHistogram.observe({ queue_name: queueName }, durationSeconds);
};

export const trackApiRequest = (endpoint: string, status: number) => {
  apiRequestCounter.inc({ endpoint, status: status.toString() });
};

export const trackApiLatency = (endpoint: string, durationSeconds: number) => {
  apiLatencyHistogram.observe({ endpoint }, durationSeconds);
};

export const updateResourceUsage = (
  resourceType: 'memory' | 'cpu' | 'disk',
  value: number
) => {
  resourceUsageGauge.set({ resource_type: resourceType }, value);
};
