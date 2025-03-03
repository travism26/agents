import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import multer from 'multer';
import logger from './utils/logger';
import { CoverLetterController } from './controllers/coverLetterController';
import { ResearchController } from './controllers/researchController';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Configure middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Initialize controllers
const coverLetterController = new CoverLetterController();
const researchController = new ResearchController();

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Define routes
app.post(
  '/api/generate-cover-letter',
  upload.single('resume'),
  (req: Request, res: Response) =>
    coverLetterController.generateCoverLetter(req, res)
);

// Writer routes
app.get('/api/writer/token-usage', (req: Request, res: Response) =>
  coverLetterController.getTokenUsage(req, res)
);

// Research routes
app.post('/api/research/company', (req: Request, res: Response) =>
  researchController.researchCompany(req, res)
);

app.post('/api/research/clear-cache', (req: Request, res: Response) =>
  researchController.clearCache(req, res)
);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? undefined : err.message,
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
const server = app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });

  // Force close after 10s
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
});

export default app;
