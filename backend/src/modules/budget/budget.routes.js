import { Router } from 'express';
import { BudgetController } from './budget.controller.js';
import { authenticateToken } from '../../core/middleware/jwtMiddleware.js';

const router = Router();
router.use(authenticateToken);

router.get('/',                          BudgetController.getMonth);
router.get('/months',                    BudgetController.getAvailableMonths);
router.post('/categories',               BudgetController.upsertCategory);
router.delete('/categories/:id',         BudgetController.deleteCategory);
router.post('/expenses',                 BudgetController.addExpense);
router.delete('/expenses/:id',           BudgetController.deleteExpense);

export default router;
