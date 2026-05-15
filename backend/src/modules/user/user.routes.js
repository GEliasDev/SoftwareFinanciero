import { Router } from 'express';
import { UserController } from './user.controller.js';
import { authenticateToken } from '../../core/middleware/jwtMiddleware.js';

const router = Router();

// Rutas públicas — no requieren token
router.post('/login', UserController.login);
router.post('/', UserController.createUser);

// Rutas protegidas — requieren token
router.get('/', authenticateToken, UserController.getAllUsers);
router.get('/:id', authenticateToken, UserController.getUserById);
router.patch('/:id', authenticateToken, UserController.updateUser);
router.patch('/:id/password', authenticateToken, UserController.changePassword); // ✅ nuevo endpoint
router.delete('/:id', authenticateToken, UserController.deleteUser);

export default router;