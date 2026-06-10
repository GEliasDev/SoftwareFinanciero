import { Router } from 'express';
import { PersonalDebtController } from './personalDebt.controller.js';
import { authenticateToken } from '../../core/middleware/jwtMiddleware.js';

const router = Router();
router.get('/',           authenticateToken, PersonalDebtController.getAll);
router.post('/',          authenticateToken, PersonalDebtController.create);
router.get('/:id',        authenticateToken, PersonalDebtController.getById);
router.patch('/:id',      authenticateToken, PersonalDebtController.update);
router.delete('/:id',     authenticateToken, PersonalDebtController.delete);
router.post('/:id/abono', authenticateToken, PersonalDebtController.registerAbono);
export default router;
