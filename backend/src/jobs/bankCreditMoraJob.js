import { Op } from 'sequelize';
import { BankCredit } from '../modules/bankCredit/bankCredit.model.js';
import cron from 'node-cron';

const GRACE_DAYS = 5; // días de gracia antes de marcar en mora

/**
 * Determina cuántas cuotas deberían haberse pagado hasta hoy,
 * dado que el primer pago vence 1 mes después de fechaInicio en diaPago.
 */
function expectedCuotasPagadas(fechaInicio, diaPago, numeroCuotas) {
    const today = new Date();
    let count = 0;
    const inicio = new Date(fechaInicio);
    for (let k = 1; k <= numeroCuotas; k++) {
        const due = new Date(inicio.getFullYear(), inicio.getMonth() + k, diaPago);
        due.setDate(due.getDate() + GRACE_DAYS);
        if (today >= due) count = k;
        else break;
    }
    return count;
}

export const updateMoraStatus = async () => {
    const credits = await BankCredit.findAll({
        where: { status: { [Op.in]: ['activo', 'en_mora'] } },
    });

    let marcados = 0;
    let reactivados = 0;

    for (const credit of credits) {
        const expected = expectedCuotasPagadas(
            credit.fechaInicio,
            Number(credit.diaPago),
            Number(credit.numeroCuotas),
        );
        const isLate = Number(credit.cuotasPagadas) < expected;

        if (isLate && credit.status !== 'en_mora') {
            await credit.update({ status: 'en_mora' });
            marcados++;
        } else if (!isLate && credit.status === 'en_mora') {
            await credit.update({ status: 'activo' });
            reactivados++;
        }
    }

    if (marcados > 0) console.log(`[MoraJob] ${marcados} crédito(s) marcado(s) en mora`);
    if (reactivados > 0) console.log(`[MoraJob] ${reactivados} crédito(s) reactivado(s)`);
};

export const startMoraJob = () => {
    // Corre todos los días a las 6 AM
    cron.schedule('0 6 * * *', async () => {
        try {
            await updateMoraStatus();
        } catch (err) {
            console.error('[MoraJob] Error:', err.message);
        }
    });
    // Ejecutar al arrancar para sincronizar estado
    updateMoraStatus().catch(err => console.error('[MoraJob] Error inicial:', err.message));
    console.log('[MoraJob] Iniciado');
};
