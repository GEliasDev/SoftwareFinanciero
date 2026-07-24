import cron from 'node-cron';
import { ReminderService } from '../modules/reminder/reminder.service.js';
import { PushSubscriptionService } from '../modules/pushSubscription/pushSubscription.service.js';
import { generateCuotaManejoCharges } from './cuotaManejoJob.js';
import { generateSubscriptionCharges } from './subscriptionChargeJob.js';

export const startReminderJob = () => {
    cron.schedule('0 8 * * *', async () => {
        console.log(`[ReminderJob] Ejecutando — ${new Date().toISOString()}`);

        try {
            const pending = await ReminderService.getPendingReminders();
            console.log(`[ReminderJob] ${pending.length} recordatorio(s) pendiente(s)`);

            for (const reminder of pending) {
                try {
                    if (PushSubscriptionService.isEnabled()) {
                        await PushSubscriptionService.sendToUser(
                            reminder.userId,
                            `Pago próximo: ${reminder.nombre}`,
                            `Vence el ${new Date(reminder.proximaFechaPago).toLocaleDateString('es-CO')}`,
                            '/reminders',
                        );
                    }
                    await ReminderService.markAsSentAndReschedule(reminder.id);
                } catch (err) {
                    console.error(`[ReminderJob] Error en recordatorio ${reminder.id}:`, err.message);
                }
            }
        } catch (err) {
            console.error('[ReminderJob] Error general:', err.message);
        }

        try {
            await generateCuotaManejoCharges();
        } catch (err) {
            console.error('[CuotaManejoJob] Error:', err.message);
        }

        try {
            await generateSubscriptionCharges();
        } catch (err) {
            console.error('[SubscriptionChargeJob] Error:', err.message);
        }
    });

    console.log('[ReminderJob] Cron job de recordatorios iniciado — 8:00 AM diario');
};