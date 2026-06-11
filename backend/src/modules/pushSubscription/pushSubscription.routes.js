import { Router } from 'express';
import { PushSubscriptionController } from './pushSubscription.controller.js';
import { authenticateToken } from '../../core/middleware/jwtMiddleware.js';

const router = Router();

router.get('/vapid-key', PushSubscriptionController.getVapidKey);
router.use(authenticateToken);
router.post('/subscribe',   PushSubscriptionController.subscribe);
router.post('/unsubscribe', PushSubscriptionController.unsubscribe);

export default router;
