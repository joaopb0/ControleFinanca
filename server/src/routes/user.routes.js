import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';

const router = Router();

// Rotas de Usuários: /api/users
router.get('/', userController.getAll);
router.get('/:id', userController.getById);
router.post('/', userController.create);
router.delete('/:id', userController.delete);

export default router;
