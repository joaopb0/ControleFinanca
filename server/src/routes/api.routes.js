import { Router } from 'express';
import multer from 'multer';
import { csvImportController } from '../controllers/csvImport.controller.js';
import userRoutes from './user.routes.js';
import classificationRuleRoutes from './classificationRule.routes.js';
import classifierRoutes from './classifier.routes.js';
import reportRoutes from './report.routes.js';

const upload = multer({ dest: 'uploads/', limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0, parts: 1 } });

const router = Router();

// Rota de status da API: /api/health
router.post('/upload-csv', upload.single('file'), csvImportController.uploadCsv);

// Rotas de recursos
router.use('/users', userRoutes);
router.use('/classification-rules', classificationRuleRoutes);
router.use('/classifier', classifierRoutes);
router.use('/reports', reportRoutes);

export default router;
