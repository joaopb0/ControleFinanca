import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { doubleCsrf } from 'csrf-csrf';
import { createHmac } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import apiRoutes from './routes/api.routes.js';
import { createAuthRoutes } from './routes/auth.routes.js';
import { healthController } from './controllers/health.controller.js';
import { getAuthConfig } from './config/auth.js';
import { createAuthService, httpError } from './services/auth.service.js';
import { requireAuthentication } from './middlewares/auth.js';
import { requestLogger } from './middlewares/logger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { isDatabaseAvailable } from './config/database.js';

export function createApp() {
  const config = getAuthConfig();
  const app = express();
  app.disable('x-powered-by');
  // Render termina TLS no proxy imediatamente anterior à API.
  if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.set('query parser', 'simple');
  mkdirSync('uploads', { recursive: true });
  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.origins.includes(origin)) return callback(null, true);
      callback(httpError(403, 'Origem não autorizada.'));
    },
    credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  }));
  app.use(express.json({ limit: '2mb', inflate: false }));
  app.use(cookieParser());
  app.use(requestLogger);
  app.use('/api', (req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    next();
  });
  const csrf = doubleCsrf({
    getSecret: () => createHmac('sha256', config.secret).update('controlefinanca-csrf').digest('hex'),
    getSessionIdentifier: (req) => req.cookies[config.sessionCookie] || '',
    cookieName: config.csrfCookie,
    cookieOptions: { ...config.cookieOptions, maxAge: config.ttl * 1000 },
    errorConfig: { statusCode: 403, message: 'Token CSRF inválido. Atualize a página e tente novamente.', code: 'EBADCSRFTOKEN' },
  });
  const protectCsrf = (req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !config.origins.includes(req.get('Origin'))) {
      return next(httpError(403, 'Origem ausente ou não autorizada.'));
    }
    csrf.doubleCsrfProtection(req, res, next);
  };
  const service = createAuthService(config);
  const authenticate = requireAuthentication(service, config);
  app.get('/api/health', healthController.check);
  // Autenticação nunca depende de fallback, em nenhum ambiente.
  app.use('/api', async (req, res, next) => {
    if (!await isDatabaseAvailable()) return next(httpError(503, 'Banco de dados indisponível.'));
    next();
  });
  app.use('/api/auth', createAuthRoutes(service, config, csrf, authenticate, protectCsrf));
  app.use('/api', authenticate, protectCsrf, apiRoutes);
  app.use('/api', (req, res, next) => next(httpError(404, 'Rota da API não encontrada.')));
  app.get('/', (req, res) => res.json({ name: 'ControleFinanca API', version: '1.0.0', health: '/api/health' }));
  app.use(errorHandler);
  return app;
}
