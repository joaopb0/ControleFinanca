import { Router } from 'express';
import { createAuthController } from '../controllers/auth.controller.js';
import { authRateLimit } from '../middlewares/auth.js';

export function createAuthRoutes(service, config, csrf, authenticate, protectCsrf) {
  const router = Router();
  const controller = createAuthController(service, config, csrf);
  const limiter = authRateLimit();
  router.get('/csrf', controller.csrf);
  router.post('/register', protectCsrf, limiter, controller.register);
  router.post('/login', protectCsrf, limiter, controller.login);
  router.get('/me', authenticate, controller.me);
  router.post('/logout', authenticate, protectCsrf, controller.logout);
  return router;
}
