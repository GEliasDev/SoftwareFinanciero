import { Router } from 'express';
import { CreditCardController } from './creditCard.controller.js';
import { authenticateToken } from '../../core/middleware/jwtMiddleware.js';

const router = Router();

// ── Tarjeta ───────────────────────────────────────────────
router.get('/overview', authenticateToken, CreditCardController.getOverview);
router.post('/', authenticateToken, CreditCardController.createCreditCard);
router.get('/', authenticateToken, CreditCardController.getAllCreditCards);
router.get('/:id', authenticateToken, CreditCardController.getCreditCardById);
router.get('/:id/summary', authenticateToken, CreditCardController.getMonthlySummary);
router.get('/:id/upcoming-payments', authenticateToken, CreditCardController.getUpcomingPayments);
router.get('/:id/purchase-stats', authenticateToken, CreditCardController.getPurchaseStats);
router.patch('/:id', authenticateToken, CreditCardController.updateCreditCard);
router.delete('/:id', authenticateToken, CreditCardController.deleteCreditCard);

// ── Compras ───────────────────────────────────────────────
router.post('/:creditCardId/purchases', authenticateToken, CreditCardController.createPurchase);
router.get('/:creditCardId/purchases', authenticateToken, CreditCardController.getPurchasesByCard);
router.get('/:creditCardId/purchases/:purchaseId', authenticateToken, CreditCardController.getPurchaseById);
router.patch('/:creditCardId/purchases/:purchaseId/pay', authenticateToken, CreditCardController.registerPurchasePayment);
router.patch('/:creditCardId/purchases/:purchaseId/undo-pay', authenticateToken, CreditCardController.undoPurchasePayment);
router.patch('/:creditCardId/purchases/:purchaseId/abono', authenticateToken, CreditCardController.registerAbono);
router.patch('/:creditCardId/purchases/:purchaseId', authenticateToken, CreditCardController.updatePurchase);
router.delete('/:creditCardId/purchases/:purchaseId', authenticateToken, CreditCardController.deletePurchase);

export default router;