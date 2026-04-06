import { Router } from 'express';
import { SubscriptionController } from './subscription.controller.js';
import { authenticateToken } from '../../core/middleware/jwtMiddleware.js';

const router = Router();

router.post('/', authenticateToken, SubscriptionController.createSubscription);
router.get('/', authenticateToken, SubscriptionController.getAllSubscriptions);
router.get('/summary', authenticateToken, SubscriptionController.getSummary); // ✅ antes de /:id para que no lo confunda con un id
router.get('/:id', authenticateToken, SubscriptionController.getSubscriptionById);
router.patch('/:id', authenticateToken, SubscriptionController.updateSubscription);
router.delete('/:id', authenticateToken, SubscriptionController.deleteSubscription);

export default router;