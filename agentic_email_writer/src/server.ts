import express, { Express } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { emailGenerationRoutes } from './routes/emailGeneration';
import { metricsMiddleware, register } from './utils/monitoring';

export async function createServer(): Promise<Express> {
  const app = express();

  // Middleware
  app.use(metricsMiddleware);
  app.use(cors());
  app.use(express.json());

  // Metrics endpoint
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  // Health check endpoint
  app.get('/health', async (req, res) => {
    try {
      // Check MongoDB connection
      if (mongoose.connection.readyState !== 1) {
        throw new Error('MongoDB not connected');
      }

      // Check Redis connection
      const Redis = require('ioredis');
      const redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
      });

      await redis.ping();
      await redis.quit();

      res.status(200).json({ status: 'healthy' });
    } catch (error: unknown) {
      console.error('Health check failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      res.status(503).json({ status: 'unhealthy', error: errorMessage });
    }
  });

  // Routes
  app.use('/api/generate-email', emailGenerationRoutes);

  return app;
}
