import { Router } from 'express';
import { ActivityLogController } from './activityLog.controller.js';
import { authenticateToken } from '../../core/middleware/jwtMiddleware.js';

const router = Router();
router.use(authenticateToken);
router.get('/', ActivityLogController.getRecent);

export default router;
