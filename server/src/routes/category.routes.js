import { Router } from 'express';
import { categoryController } from '../controllers/category.controller.js';

const router = Router();
router.get('/', categoryController.list);
router.post('/', categoryController.create);
router.put('/preferences', categoryController.savePreference);
router.get('/preferences', categoryController.listPreferences);
router.put('/preferences/:id', categoryController.updatePreference);
router.delete('/preferences/:id', categoryController.removePreference);
// A descrição fica no corpo para não aparecer nas URLs e nos logs de acesso.
router.post('/preferences/lookup', categoryController.getPreference);
router.put('/:id', categoryController.update);
router.delete('/:id', categoryController.remove);
export default router;
