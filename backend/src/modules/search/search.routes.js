import { Router } from 'express';
import { SearchController } from './search.controller.js';
import { authenticateToken } from '../../core/middleware/jwtMiddleware.js';

const router = Router();
router.use(authenticateToken);
router.get('/', SearchController.search);

export default router;
