import { Router } from 'express';
import { emailGenerationRoutes } from './emailGeneration';
import { errorHandler } from './middleware';
import express from 'express';
import { Request, Response, NextFunction } from 'express';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
router.use('/email', emailGenerationRoutes);

// Create and configure Express app
export function createApp() {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Add request logging in development
  if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
      console.log(`${req.method} ${req.path}`);
      next();
    });
  }

  // CORS headers
  app.use((req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, x-api-key'
    );
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // API routes
  app.use('/api', router);

  // Error handling
  app.use(
    (err: Error, req: Request, res: Response, next: NextFunction): void => {
      errorHandler(err, req, res, next);
    }
  );

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: {
        message: 'Not Found',
        details: `No route found for ${req.method} ${req.path}`,
      },
    });
  });

  return app;
}

export { router as apiRouter };
