import { Router } from 'express';
import { BalanceService } from './balance.service.js';
import { authenticateToken } from '../../core/middleware/jwtMiddleware.js';

const router = Router();

router.get('/', authenticateToken, async (req, res, next) => {
    try { res.json(await BalanceService.list(req.user.id, req.query)); } catch (e) { next(e); }
});

router.post('/', authenticateToken, async (req, res, next) => {
    try { res.status(201).json(await BalanceService.create(req.user.id, req.body)); } catch (e) { next(e); }
});

router.post('/copiar-anterior', authenticateToken, async (req, res, next) => {
    try { res.status(201).json(await BalanceService.copiarAnterior(req.user.id, req.body)); } catch (e) { next(e); }
});

router.patch('/:id', authenticateToken, async (req, res, next) => {
    try { res.json(await BalanceService.update(Number(req.params.id), req.user.id, req.body)); } catch (e) { next(e); }
});

router.delete('/:id', authenticateToken, async (req, res, next) => {
    try { await BalanceService.delete(Number(req.params.id), req.user.id); res.status(204).send(); } catch (e) { next(e); }
});

export default router;
