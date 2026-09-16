import cron from 'node-cron';
import { generateCuotaManejoCharges } from './cuotaManejoJob.js';
import { generateSubscriptionCharges } from './subscriptionChargeJob.js';

/**
 * Tick diario de cargos automáticos (8:00 AM): cuota de manejo y cobro de
 * suscripciones con tarjeta vinculada. Antes estos dos vivían dentro de
 * reminderJob.js; al eliminar el módulo de recordatorios se extrajeron aquí
 * con el mismo horario y la misma tolerancia a fallos aislados (cada uno con
 * su propio try/catch, un error no bloquea al otro).
 */
export const startDailyChargesJob = () => {
    cron.schedule('0 8 * * *', async () => {
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

    console.log('[DailyChargesJob] Cron job de cargos automáticos iniciado — 8:00 AM diario');
};