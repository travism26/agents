import { jest } from '@jest/globals';

// Mock Prometheus client
jest.mock('prom-client', () => {
  const mockGet = jest.fn().mockReturnValue(
    Promise.resolve({
      values: [
        {
          value: 1,
          labels: { status: 'success' },
          timestamp: Date.now(),
        },
      ],
    })
  );

  const mockMetric = {
    inc: jest.fn(),
    set: jest.fn(),
    observe: jest.fn(),
    get: mockGet,
  };

  const mockRegistry = {
    metrics: jest.fn().mockReturnValue(Promise.resolve('mock_metric 1')),
    contentType: 'text/plain; version=0.0.4; charset=utf-8',
  };

  return {
    Counter: jest.fn(() => mockMetric),
    Histogram: jest.fn(() => mockMetric),
    Gauge: jest.fn(() => mockMetric),
    Registry: jest.fn(() => mockRegistry),
  };
});
