import { Router } from 'express';
import { CardInboxService } from './cardInbox.service.js';
import { authenticateToken } from '../../core/middleware/jwtMiddleware.js';

const router = Router();

router.get('/', authenticateToken, async (req, res, next) => {
    try {
        const status = ['pendiente', 'aprobado', 'descartado'].includes(req.query.status) ? req.query.status : 'pendiente';
        res.json(await CardInboxService.list(req.user.id, status));
    } catch (e) { next(e); }
});

// Lectura manual ("Sincronizar ahora"); el job lo hace solo cada 15 min.
router.post('/sync', authenticateToken, async (req, res, next) => {
    try { res.json(await CardInboxService.syncUser(req.user.id)); } catch (e) { next(e); }
});

router.post('/:id/approve', authenticateToken, async (req, res, next) => {
    try { res.json(await CardInboxService.approve(req.user.id, Number(req.params.id), req.body)); } catch (e) { next(e); }
});

router.post('/:id/discard', authenticateToken, async (req, res, next) => {
    try { res.json(await CardInboxService.discard(req.user.id, Number(req.params.id))); } catch (e) { next(e); }
});

export default router;
