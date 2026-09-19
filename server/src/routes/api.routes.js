import { Router } from 'express';
import { healthController } from '../controllers/health.controller.js';
import userRoutes from './user.routes.js';
import classificationRuleRoutes from './classificationRule.routes.js';
import classifierRoutes from './classifier.routes.js';
import reportRoutes from './report.routes.js';

const router = Router();

// Rota de status da API: /api/health
router.get('/health', healthController.check);

// Rotas de recursos
router.use('/users', userRoutes);
router.use('/classification-rules', classificationRuleRoutes);
router.use('/classifier', classifierRoutes);
router.use('/reports', reportRoutes);

export default router;
