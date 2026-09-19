import { Router } from 'express';
import { classifierController } from '../controllers/classifier.controller.js';

const router = Router();

router.post('/classify', classifierController.classify);
router.post('/test', classifierController.testMatch);

export default router;
