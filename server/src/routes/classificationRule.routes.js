import { Router } from 'express';
import { classificationRuleController } from '../controllers/classificationRule.controller.js';

const router = Router();

router.get('/', classificationRuleController.getAll);
router.get('/:id', classificationRuleController.getById);
router.post('/', classificationRuleController.create);
router.put('/:id', classificationRuleController.update);
router.delete('/:id', classificationRuleController.delete);
router.post('/reset', classificationRuleController.resetDefaults);

export default router;
