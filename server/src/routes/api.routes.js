import { Router } from 'express';
import { healthController } from '../controllers/health.controller.js';
import userRoutes from './user.routes.js';

const router = Router();

// Rota de status da API: /api/health
router.get('/health', healthController.check);

// Rotas de recursos: /api/users
router.use('/users', userRoutes);

export default router;
