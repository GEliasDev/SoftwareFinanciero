import { Router } from 'express';
import { BankCreditController } from './bankCredit.controller.js';
import { authenticateToken } from '../../core/middleware/jwtMiddleware.js';

const router = Router();

router.post('/', authenticateToken, BankCreditController.createBankCredit);
router.get('/', authenticateToken, BankCreditController.getAllBankCredits);
router.get('/:id', authenticateToken, BankCreditController.getBankCreditById);
router.patch('/:id', authenticateToken, BankCreditController.updateBankCredit);
router.patch('/:id/pay', authenticateToken, BankCreditController.registerPayment); // ✅ registrar cuota pagada
router.delete('/:id', authenticateToken, BankCreditController.deleteBankCredit);

export default router;