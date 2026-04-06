import { Router } from 'express';
import { CreditCardController } from './creditCard.controller.js';
import { authenticateToken } from '../../core/middleware/jwtMiddleware.js';

const router = Router();

// ── Tarjeta ───────────────────────────────────────────────
router.post('/', authenticateToken, CreditCardController.createCreditCard);
router.get('/', authenticateToken, CreditCardController.getAllCreditCards);
router.get('/:id', authenticateToken, CreditCardController.getCreditCardById);
router.get('/:id/summary', authenticateToken, CreditCardController.getMonthlySummary);
router.patch('/:id', authenticateToken, CreditCardController.updateCreditCard);
router.delete('/:id', authenticateToken, CreditCardController.deleteCreditCard);

// ── Compras ───────────────────────────────────────────────
router.post('/:creditCardId/purchases', authenticateToken, CreditCardController.createPurchase);
router.get('/:creditCardId/purchases', authenticateToken, CreditCardController.getPurchasesByCard);
router.patch('/:creditCardId/purchases/:purchaseId/pay', authenticateToken, CreditCardController.registerPurchasePayment);
router.delete('/:creditCardId/purchases/:purchaseId', authenticateToken, CreditCardController.deletePurchase);

export default router;