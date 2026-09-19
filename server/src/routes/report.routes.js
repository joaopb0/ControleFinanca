import { Router } from 'express';
import { reportController } from '../controllers/report.controller.js';

const router = Router();

router.post('/summary', reportController.getSummary);
router.post('/export/csv', reportController.exportCSV);
router.post('/export/pdf', reportController.exportPDF);

export default router;
