import cookieParser from 'cookie-parser';
import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ApiError, errorHandler } from './lib/errors.js';
import { loadUser } from './middleware/auth.js';
import { router } from './routes/index.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use('/api', loadUser, router);

  // ADR-0008: in production the same process serves the built SPA.
  const webDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist');
  if (existsSync(webDist)) {
    app.use(express.static(webDist));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(webDist, 'index.html')));
  }

  app.use('/api', (_req, _res, next) => next(new ApiError('NOT_FOUND', 'Resource not found')));
  app.use(errorHandler);
  return app;
}
