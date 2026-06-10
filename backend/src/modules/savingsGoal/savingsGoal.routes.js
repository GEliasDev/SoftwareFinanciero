import { Router } from 'express';
import { SavingsGoalController } from './savingsGoal.controller.js';
import { authenticateToken } from '../../core/middleware/jwtMiddleware.js';

const router = Router();
router.get('/',            authenticateToken, SavingsGoalController.getAll);
router.post('/',           authenticateToken, SavingsGoalController.create);
router.get('/:id',         authenticateToken, SavingsGoalController.getById);
router.patch('/:id',       authenticateToken, SavingsGoalController.update);
router.delete('/:id',      authenticateToken, SavingsGoalController.delete);
router.post('/:id/aporte', authenticateToken, SavingsGoalController.registerAporte);
export default router;
