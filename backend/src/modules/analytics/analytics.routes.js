import { Router } from 'express';
import { AnalyticsController } from './analytics.controller.js';
import { authenticateToken } from '../../core/middleware/jwtMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/summary',        AnalyticsController.getSummary);
router.get('/monthly-trend',  AnalyticsController.getMonthlyTrend);
router.get('/distribution',   AnalyticsController.getDistribution);

export default router;
