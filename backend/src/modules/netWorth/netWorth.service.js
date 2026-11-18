import { Op } from 'sequelize';
import { NetWorthSnapshot } from './netWorth.model.js';
import { CreditCard } from '../creditCard/creditCard.model.js';
import { BankCredit } from '../bankCredit/bankCredit.model.js';

const toNum = (v) => parseFloat(v) || 0;

// Mes local 'YYYY-MM'. NUNCA toISOString() aquí (gotcha ya conocido en este
// repo: en UTC-5 después de ~7pm corre el día/mes siguiente).
const currentMes = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const NetWorthService = {
    // Activos: hoy no hay ninguna fuente (se retiró Metas de ahorro), queda en 0.
    // Pasivos: cupo de tarjeta ya usado + saldo pendiente de créditos bancarios.
    computeCurrent: async (userId) => {
        const [cards, credits] = await Promise.all([
            CreditCard.findAll({ where: { userId } }),
            BankCredit.findAll({ where: { userId, status: { [Op.in]: ['activo', 'en_mora'] } } }),
        ]);

        const activos = 0;
        const deudaTarjetas = cards.reduce((s, c) => s + (toNum(c.cupoTotal) - toNum(c.cupoDisponible)), 0);
        const deudaCreditos = credits.reduce((s, c) => s + toNum(c.saldoPendiente), 0);
        const pasivos = deudaTarjetas + deudaCreditos;

        return {
            activos: parseFloat(activos.toFixed(2)),
            pasivos: parseFloat(pasivos.toFixed(2)),
            patrimonioNeto: parseFloat((activos - pasivos).toFixed(2)),
        };
    },

    // Congela (o actualiza) el snapshot de un mes — usado por el cron mensual.
    snapshotMonth: async (userId, mes) => {
        const valores = await NetWorthService.computeCurrent(userId);
        const [snap, created] = await NetWorthSnapshot.findOrCreate({
            where: { userId, mes },
            defaults: valores,
        });
        if (!created) await snap.update(valores);
        return snap;
    },

    // Histórico + mes en curso (calculado en vivo si el cron aún no corrió).
    getHistory: async (userId) => {
        const mesActual = currentMes();
        const snapshots = await NetWorthSnapshot.findAll({
            where: { userId },
            order: [['mes', 'ASC']],
        });
        const result = snapshots.map(s => ({
            mes: s.mes,
            activos: toNum(s.activos),
            pasivos: toNum(s.pasivos),
            patrimonioNeto: toNum(s.patrimonioNeto),
        }));
        if (!result.some(s => s.mes === mesActual)) {
            const live = await NetWorthService.computeCurrent(userId);
            result.push({ mes: mesActual, ...live });
        }
        return result;
    },
};
