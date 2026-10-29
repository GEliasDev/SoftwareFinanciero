import { Router } from 'express';
import { GmailService } from './gmail.service.js';
import { authenticateToken } from '../../core/middleware/jwtMiddleware.js';
import logger from '../../utils/logger.js';

const router = Router();

const frontendProfile = (query) =>
    `${process.env.FRONTEND_URL || 'http://localhost:5174'}/profile?${new URLSearchParams(query)}`;

router.get('/status', authenticateToken, async (req, res, next) => {
    try { res.json(await GmailService.getStatus(req.user.id)); } catch (e) { next(e); }
});

router.get('/auth-url', authenticateToken, (req, res, next) => {
    try { res.json({ url: GmailService.getAuthUrl(req.user.id) }); } catch (e) { next(e); }
});

router.delete('/', authenticateToken, async (req, res, next) => {
    try { await GmailService.disconnect(req.user.id); res.status(204).send(); } catch (e) { next(e); }
});

// Público a propósito: lo abre el navegador al volver de Google. La identidad
// sale del `state` firmado, no de la sesión. Siempre termina redirigiendo al perfil.
router.get('/callback', async (req, res) => {
    const { code, state, error } = req.query;
    if (error || !code || !state) return res.redirect(frontendProfile({ gmail: 'error', reason: error || 'cancelado' }));
    try {
        await GmailService.handleCallback(String(code), String(state));
        res.redirect(frontendProfile({ gmail: 'ok' }));
    } catch (e) {
        logger.warn(`Gmail callback falló: ${e.message}`);
        res.redirect(frontendProfile({ gmail: 'error', reason: e.message }));
    }
});

export default router;
