import { Router } from 'express';
import { NetWorthController } from './netWorth.controller.js';
import { authenticateToken } from '../../core/middleware/jwtMiddleware.js';

const router = Router();
router.use(authenticateToken);
router.get('/', NetWorthController.getHistory);

export default router;
