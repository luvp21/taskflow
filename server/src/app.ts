import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { chaos } from './middleware/chaos.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { tasksRouter } from './routes/tasks.routes.js';

interface AppOptions {
  chaosEnabled?: boolean;
  random?: () => number;
}

// Building the app separately from listen() lets tests drive it with supertest
// without opening a real port. Options exist so tests can switch chaos on.
export function createApp({ chaosEnabled = config.CHAOS_ENABLED, random }: AppOptions = {}) {
  const app = express();

  app.use(cors({ origin: config.CORS_ORIGIN }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api', chaos(chaosEnabled, random));
  app.use('/api/tasks', tasksRouter);

  // Order matters: unmatched requests fall through to 404, and the error handler
  // must be registered last so every thrown error reaches it.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
