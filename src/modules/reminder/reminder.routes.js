import { Router } from 'express';
import { ReminderController } from './reminder.controller.js';
import { authenticateToken } from '../../core/middleware/jwtMiddleware.js';

const router = Router();

router.post('/', authenticateToken, ReminderController.createReminder);
router.get('/', authenticateToken, ReminderController.getAllReminders);
router.get('/:id', authenticateToken, ReminderController.getReminderById);
router.patch('/:id', authenticateToken, ReminderController.updateReminder);
router.delete('/:id', authenticateToken, ReminderController.deleteReminder);

// Endpoint para registrar la suscripción Web Push desde el frontend
router.post('/push-subscription', authenticateToken, ReminderController.savePushSubscription);

export default router;