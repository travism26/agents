import { jest } from '@jest/globals';
import { Job } from 'bull';

// Create a mock job factory
const createMockJob = (data: any): Partial<Job> => ({
  id: 'mock-job-id',
  data,
});

// Mock Bull constructor
jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => ({
    add: jest
      .fn()
      .mockImplementation((data: any) => Promise.resolve(createMockJob(data))),
    process: jest.fn(),
    on: jest.fn(),
    close: jest.fn().mockReturnValue(Promise.resolve()),
    isReady: jest.fn().mockReturnValue(Promise.resolve(true)),
  }));
});

// Export mock queue for test assertions
export const mockQueue = {
  add: jest
    .fn()
    .mockImplementation((data: any) => Promise.resolve(createMockJob(data))),
  process: jest.fn(),
  on: jest.fn(),
  close: jest.fn().mockReturnValue(Promise.resolve()),
  isReady: jest.fn().mockReturnValue(Promise.resolve(true)),
};
