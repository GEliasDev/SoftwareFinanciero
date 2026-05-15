import cron from 'node-cron';
import { ReminderService } from '../modules/reminder/reminder.service.js';

/**
 * Cron job que se ejecuta todos los días a las 8:00 AM
 * Busca recordatorios pendientes y los envía vía Web Push
 */
export const startReminderJob = () => {
    cron.schedule('0 8 * * *', async () => {
        console.log(`[ReminderJob] Ejecutando — ${new Date().toISOString()}`);

        try {
            const pending = await ReminderService.getPendingReminders();
            console.log(`[ReminderJob] ${pending.length} recordatorio(s) pendiente(s)`);

            for (const reminder of pending) {
                try {
                    // Web Push se conectará aquí cuando el frontend esté listo
                    // Por ahora solo logueamos el recordatorio
                    console.log(`[ReminderJob] Recordatorio listo para enviar:`, {
                        usuario: reminder.userId,
                        deuda: reminder.nombre,
                        fechaPago: reminder.proximaFechaPago,
                    });

                    // Reprogramar para el siguiente mes
                    await ReminderService.markAsSentAndReschedule(reminder.id);
                } catch (err) {
                    console.error(`[ReminderJob] Error en recordatorio ${reminder.id}:`, err.message);
                }
            }
        } catch (err) {
            console.error('[ReminderJob] Error general:', err.message);
        }
    });

    console.log('[ReminderJob] Cron job de recordatorios iniciado — 8:00 AM diario');
};