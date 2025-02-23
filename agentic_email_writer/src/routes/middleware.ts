import { Request, Response, NextFunction } from 'express';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        details: err.details,
      },
    });
  }

  // Handle mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: {
        message: 'Validation Error',
        details: err.message,
      },
    });
  }

  // Handle mongoose cast errors (invalid IDs)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: {
        message: 'Invalid ID format',
        details: err.message,
      },
    });
  }

  // Default error response
  return res.status(500).json({
    error: {
      message: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    },
  });
};

// Async handler wrapper to avoid try-catch blocks in routes
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validate request body against a schema
export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      throw new ApiError(400, 'Validation Error', error.details);
    }
    next();
  };
};

// Demo authentication middleware
// NOTE: This is a simplified version for demonstration purposes only.
// In production, implement proper authentication with secure API key validation.
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // For demo purposes, accept any non-empty string as API key
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    throw new ApiError(
      401,
      'API key is required. For demo, use any non-empty string as key.'
    );
  }
  next();
};
