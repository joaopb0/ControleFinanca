import { Router } from 'express';
import { historyController } from '../controllers/history.controller.js';

const router = Router();
router.get('/', historyController.list);
router.get('/report', historyController.report);
router.get('/report/csv', historyController.exportReportCSV);
router.get('/report/pdf', historyController.exportReportPDF);
router.get('/export/csv', historyController.exportCSV);
router.post('/preview', historyController.preview);
router.post('/contributions', historyController.save);
router.delete('/months/:month', historyController.removeMonth);
router.delete('/', historyController.removeAll);
export default router;
