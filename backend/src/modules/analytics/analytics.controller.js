import { Subscription } from '../suscription/subscription.model.js';
import { BankCredit } from '../bankCredit/bankCredit.model.js';
import { CreditCard } from '../creditCard/creditCard.model.js';
import { CreditCardPurchase } from '../creditCard/creditCardPurchase.model.js';
import { Op } from 'sequelize';

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

const toNum = (v) => parseFloat(v) || 0;

/** Computa la próxima fecha de pago dado un día del mes */
const nextPaymentDate = (dayOfMonth) => {
    const today = new Date();
    const day = Number(dayOfMonth);
    let d = new Date(today.getFullYear(), today.getMonth(), day);
    if (d < today) d.setMonth(d.getMonth() + 1);
    return d;
};

/** Calcula score de salud financiera */
const computeHealthScore = (subscriptions, creditCards, bankCredits) => {
    let score = 100;
    const details = [];

    // Utilización de cupo
    const totalCupo = creditCards.reduce((a, c) => a + toNum(c.cupoTotal), 0);
    const totalUsed = creditCards.reduce((a, c) => a + (toNum(c.cupoTotal) - toNum(c.cupoDisponible)), 0);
    const utilization = totalCupo > 0 ? (totalUsed / totalCupo) * 100 : 0;

    if (utilization > 80) {
        score -= 30;
        details.push({ label: 'Utilización de cupo crítica (>80%)', impact: -30 });
    } else if (utilization > 50) {
        score -= 15;
        details.push({ label: 'Utilización de cupo elevada (>50%)', impact: -15 });
    } else if (utilization > 20) {
        score -= 5;
        details.push({ label: 'Utilización de cupo moderada (>20%)', impact: -5 });
    }

    // Créditos en mora
    const inMora = bankCredits.filter(c => c.status === 'en_mora' || c.status === 'atrasado');
    if (inMora.length > 0) {
        const penalty = Math.min(40, inMora.length * 20);
        score -= penalty;
        details.push({ label: `${inMora.length} crédito(s) en mora`, impact: -penalty });
    }

    // Obligaciones mensuales altas
    const monthlyCredits = bankCredits
        .filter(c => c.status === 'activo')
        .reduce((a, c) => a + toNum(c.valorCuota) + toNum(c.cuotaAdministracion), 0);
    const monthlySubs = subscriptions
        .filter(s => s.status === 'activa')
        .reduce((a, s) => a + toNum(s.montoMensual), 0);
    const totalMonthly = monthlyCredits + monthlySubs;

    if (totalMonthly > 5_000_000) {
        score -= 20;
        details.push({ label: 'Obligaciones mensuales muy altas (>5M)', impact: -20 });
    } else if (totalMonthly > 2_000_000) {
        score -= 10;
        details.push({ label: 'Obligaciones mensuales altas (>2M)', impact: -10 });
    }

    // Muchas suscripciones activas
    const activeSubs = subscriptions.filter(s => s.status === 'activa').length;
    if (activeSubs > 10) {
        score -= 5;
        details.push({ label: 'Muchas suscripciones activas (>10)', impact: -5 });
    }

    // Sin deuda bancaria (bonus)
    const activeCredits = bankCredits.filter(c => c.status === 'activo');
    if (activeCredits.length === 0 && totalCupo === 0 && activeSubs < 5) {
        details.push({ label: 'Perfil financiero limpio', impact: 0 });
    }

    const finalScore = Math.max(0, Math.min(100, Math.round(score)));
    const label = finalScore >= 90 ? 'Excelente' : finalScore >= 70 ? 'Bueno' : finalScore >= 50 ? 'Regular' : 'Crítico';

    return { score: finalScore, label, utilization: Math.round(utilization), details };
};

// ─────────────────────────────────────────
// Controller
// ─────────────────────────────────────────

export const AnalyticsController = {

    /** GET /api/analytics/summary */
    getSummary: async (req, res, next) => {
        try {
            const userId = req.user.id;

            const [subscriptions, bankCredits, creditCards] = await Promise.all([
                Subscription.findAll({ where: { userId } }),
                BankCredit.findAll({ where: { userId } }),
                CreditCard.findAll({
                    where: { userId },
                    include: [{ model: CreditCardPurchase, as: 'CreditCardPurchases' }],
                }),
            ]);

            // Obligaciones mensuales
            const monthlySubscriptions = subscriptions
                .filter(s => s.status === 'activa')
                .reduce((a, s) => a + toNum(s.montoMensual), 0);

            const monthlyBankCredits = bankCredits
                .filter(c => c.status === 'activo')
                .reduce((a, c) => a + toNum(c.valorCuota) + toNum(c.cuotaAdministracion), 0);

            const activePurchases = creditCards.flatMap(c =>
                (c.CreditCardPurchases || []).filter(p => p.status === 'activa')
            );
            const monthlyCreditCards = activePurchases.reduce((a, p) => a + toNum(p.valorCuotaMensual), 0);

            // Deuda total
            const totalDebtCredits = bankCredits
                .filter(c => c.status !== 'pagado')
                .reduce((a, c) => a + toNum(c.saldoPendiente), 0);

            const totalDebtCards = creditCards.reduce(
                (a, c) => a + (toNum(c.cupoTotal) - toNum(c.cupoDisponible)), 0
            );

            // Health score
            const health = computeHealthScore(subscriptions, creditCards, bankCredits);

            // Próximos 30 días de pagos
            const today = new Date();
            const in30 = new Date(today);
            in30.setDate(in30.getDate() + 30);

            const upcoming = [];

            subscriptions.filter(s => s.status === 'activa').forEach(s => {
                const d = nextPaymentDate(s.diaCobro);
                if (d <= in30) upcoming.push({
                    date: d.toISOString().slice(0, 10),
                    name: s.nombre,
                    type: 'subscription',
                    amount: toNum(s.montoMensual),
                    moneda: s.moneda,
                });
            });

            bankCredits.filter(c => c.status === 'activo').forEach(c => {
                const d = nextPaymentDate(c.diaPago);
                if (d <= in30) upcoming.push({
                    date: d.toISOString().slice(0, 10),
                    name: c.nombre,
                    type: 'bank_credit',
                    amount: toNum(c.valorCuota) + toNum(c.cuotaAdministracion),
                    moneda: 'COP',
                });
            });

            creditCards.filter(c => c.status === 'activa').forEach(c => {
                const d = nextPaymentDate(c.fechaPago);
                if (d <= in30) upcoming.push({
                    date: d.toISOString().slice(0, 10),
                    name: c.nombre,
                    type: 'credit_card',
                    amount: (c.CreditCardPurchases || [])
                        .filter(p => p.status === 'activa')
                        .reduce((a, p) => a + toNum(p.valorCuotaMensual), 0),
                    moneda: 'COP',
                });
            });

            upcoming.sort((a, b) => a.date.localeCompare(b.date));

            res.json({
                obligations: {
                    subscriptions: monthlySubscriptions,
                    bankCredits: monthlyBankCredits,
                    creditCards: monthlyCreditCards,
                    total: monthlySubscriptions + monthlyBankCredits + monthlyCreditCards,
                },
                debt: {
                    bankCredits: totalDebtCredits,
                    creditCards: totalDebtCards,
                    total: totalDebtCredits + totalDebtCards,
                },
                counts: {
                    activeSubscriptions: subscriptions.filter(s => s.status === 'activa').length,
                    activeCredits: bankCredits.filter(c => c.status === 'activo').length,
                    totalCards: creditCards.length,
                    activePurchases: activePurchases.length,
                },
                health,
                upcoming,
            });
        } catch (err) {
            next(err);
        }
    },

    /** GET /api/analytics/monthly-trend */
    getMonthlyTrend: async (req, res, next) => {
        try {
            const userId = req.user.id;
            const monthsRaw = parseInt(req.query.months) || 6;
            const months = Math.min(Math.max(monthsRaw, 1), 24);

            const [subscriptions, bankCredits] = await Promise.all([
                Subscription.findAll({ where: { userId } }),
                BankCredit.findAll({ where: { userId } }),
            ]);

            const result = [];
            const now = new Date();

            for (let i = months - 1; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
                const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                const label = d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });

                const subTotal = subscriptions
                    .filter(s => {
                        const start = new Date(s.fechaInicio);
                        const end = s.fechaFin ? new Date(s.fechaFin) : null;
                        return start <= monthEnd && (!end || end >= monthStart) && s.status !== 'cancelada';
                    })
                    .reduce((a, s) => a + toNum(s.montoMensual), 0);

                const creditTotal = bankCredits
                    .filter(c => {
                        const start = new Date(c.fechaInicio);
                        const end = new Date(c.fechaFin);
                        return start <= monthEnd && end >= monthStart && c.status !== 'pagado';
                    })
                    .reduce((a, c) => a + toNum(c.valorCuota) + toNum(c.cuotaAdministracion), 0);

                result.push({
                    month: label,
                    subscriptions: Math.round(subTotal),
                    bankCredits: Math.round(creditTotal),
                    total: Math.round(subTotal + creditTotal),
                });
            }

            res.json(result);
        } catch (err) {
            next(err);
        }
    },

    /** GET /api/analytics/distribution */
    getDistribution: async (req, res, next) => {
        try {
            const userId = req.user.id;

            const [subscriptions, bankCredits, creditCards] = await Promise.all([
                Subscription.findAll({ where: { userId, status: 'activa' } }),
                BankCredit.findAll({ where: { userId, status: 'activo' } }),
                CreditCard.findAll({
                    where: { userId },
                    include: [{ model: CreditCardPurchase, as: 'CreditCardPurchases', where: { status: 'activa' }, required: false }],
                }),
            ]);

            const subMonthly = subscriptions.reduce((a, s) => a + toNum(s.montoMensual), 0);
            const creditMonthly = bankCredits.reduce((a, c) => a + toNum(c.valorCuota) + toNum(c.cuotaAdministracion), 0);
            const cardMonthly = creditCards.flatMap(c => c.CreditCardPurchases || [])
                .reduce((a, p) => a + toNum(p.valorCuotaMensual), 0);

            res.json([
                { name: 'Suscripciones', value: Math.round(subMonthly), color: '#1565C0' },
                { name: 'Créditos bancarios', value: Math.round(creditMonthly), color: '#DC2626' },
                { name: 'Tarjetas de crédito', value: Math.round(cardMonthly), color: '#D97706' },
            ].filter(d => d.value > 0));
        } catch (err) {
            next(err);
        }
    },
};
