import { Router } from 'express';
import { CreditController } from './credit.controller.js';
import { authenticateToken } from '../../core/middleware/jwtMiddleware.js';

const router = Router();

router.post('/', authenticateToken, CreditController.createCredit);
router.get('/', authenticateToken, CreditController.getAllCredits);
router.get('/:id', authenticateToken, CreditController.getCreditById);
router.patch('/:id', authenticateToken, CreditController.updateCredit);
router.delete('/:id', authenticateToken, CreditController.deleteCredit);

export default router;
