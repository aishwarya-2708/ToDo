import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import helmet from 'helmet';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/authRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { csrfProtection, verifyOrigin } from './middleware/security.js';
import { errorHandler, notFound } from './middleware/errors.js';

export function createApp() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  if (process.env.NODE_ENV === 'production' && !process.env.CLIENT_ORIGIN && !process.env.RENDER_EXTERNAL_URL) throw new Error('CLIENT_ORIGIN is required in production');
  const app = express();
  app.disable('x-powered-by');
  if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.use(helmet());
  app.use(express.json({ limit: '20kb' }));
  const maxAge = Number(process.env.SESSION_DAYS || 7) * 24 * 60 * 60 * 1000;
  const sessionStore = MongoStore.create({ mongoUrl: process.env.MONGODB_URI, ttl: maxAge / 1000, autoRemove: 'native' });
  app.locals.sessionStore = sessionStore;
  app.use(session({
    name: process.env.SESSION_NAME || 'taskmate.sid', secret: process.env.SESSION_SECRET,
    resave: false, saveUninitialized: false, rolling: true,
    store: sessionStore,
    cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge, path: '/' }
  }));
  app.use('/api', verifyOrigin, csrfProtection);
  app.get('/api/health', (_req, res) => res.json({ data: { status: 'ok' } }));
  app.use('/api/auth', authRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const clientDist = path.join(projectRoot, 'client', 'dist');
  if (fs.existsSync(path.join(clientDist, 'index.html'))) {
    app.use(express.static(clientDist, { index: false, maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));
    app.get('*', (req, res, next) => {
      if (req.path === '/api' || req.path.startsWith('/api/') || !req.accepts('html')) return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
