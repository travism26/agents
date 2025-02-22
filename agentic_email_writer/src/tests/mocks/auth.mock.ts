import { jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { Schema } from 'joi';

// Mock authentication middleware
jest.mock('../../routes/middleware', () => ({
  authenticate: jest.fn((_req: Request, _res: Response, next: NextFunction) =>
    next()
  ),
  validateRequest: jest.fn(
    (_schema: Schema) => (_req: Request, _res: Response, next: NextFunction) =>
      next()
  ),
  asyncHandler: jest.fn((fn: Function) => fn),
}));
