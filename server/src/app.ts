import cors from 'cors';
import express from 'express';
import { config } from './config.js';

// Building the app separately from listen() lets tests drive it with supertest
// without opening a real port.
export function createApp() {
  const app = express();

  app.use(cors({ origin: config.CORS_ORIGIN }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  return app;
}
