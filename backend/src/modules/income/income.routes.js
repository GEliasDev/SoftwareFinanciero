import { Router } from 'express';
import { IncomeController } from './income.controller.js';
import { authenticateToken } from '../../core/middleware/jwtMiddleware.js';

const router = Router();
router.get('/',      authenticateToken, IncomeController.getAll);
router.post('/',     authenticateToken, IncomeController.create);
router.get('/:id',   authenticateToken, IncomeController.getById);
router.patch('/:id', authenticateToken, IncomeController.update);
router.delete('/:id',authenticateToken, IncomeController.delete);
export default router;
