import { Router } from 'express';
import { UserController } from './user.controller.js';
import { authenticateToken } from '../../core/middleware/jwtMiddleware.js';
import { authRateLimit } from '../../middlewares/authRateLimit.js';

const router = Router();

// Rutas públicas — no requieren token. login/forgot/reset llevan un límite
// de intentos propio, más estricto que el genérico de toda la API.
router.post('/login', authRateLimit, UserController.login);
router.post('/refresh-token', authRateLimit, UserController.refreshToken);
router.post('/2fa/login-verify', authRateLimit, UserController.verifyTwoFactorLogin);
router.post('/', UserController.createUser);
router.post('/forgot-password', authRateLimit, UserController.forgotPassword);
router.post('/reset-password', authRateLimit, UserController.resetPasswordByToken);

// Rutas protegidas — requieren token
// Antes de '/:id' a propósito: si no, Express intentaría matchear "export"
// como si fuera un :id.
router.get('/export', authenticateToken, UserController.exportData);
router.get('/', authenticateToken, UserController.getAllUsers);
router.get('/:id', authenticateToken, UserController.getUserById);
router.patch('/:id', authenticateToken, UserController.updateUser);
router.patch('/:id/password', authenticateToken, UserController.changePassword); // ✅ nuevo endpoint
router.delete('/:id', authenticateToken, UserController.deleteUser);

// 2FA opcional — setup/confirm/disable requieren sesión activa (no se puede
// activar 2FA en una cuenta que no es la tuya).
router.post('/2fa/setup', authenticateToken, UserController.setupTwoFactor);
router.post('/2fa/confirm', authenticateToken, UserController.confirmTwoFactor);
router.post('/2fa/disable', authenticateToken, UserController.disableTwoFactor);

export default router;