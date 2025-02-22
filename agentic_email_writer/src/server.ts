import express, { Express } from 'express';
import cors from 'cors';
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

  // Routes
  app.use('/api/generate-email', emailGenerationRoutes);

  return app;
}
