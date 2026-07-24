import { Subscription } from '../suscription/subscription.model.js';
import { BankCredit } from '../bankCredit/bankCredit.model.js';
import { CreditCard } from '../creditCard/creditCard.model.js';
import { CreditCardPurchase } from '../creditCard/creditCardPurchase.model.js';
import { Income } from '../income/income.model.js';
import { PersonalDebt } from '../personalDebt/personalDebt.model.js';
import { SavingsGoal } from '../savingsGoal/savingsGoal.model.js';
import { Op } from 'sequelize';
import { toCOP } from '../../utils/currency.js';
import { effectiveDayInMonth } from '../../utils/cycleDay.js';

const toNum = (v) => parseFloat(v) || 0;
// Suscripciones pueden estar en USD/EUR: convertir SIEMPRE antes de sumar con valores COP.
const subMonthlyCOP = (s) => toCOP(toNum(s.montoMensual), s.moneda);

const nextPaymentDate = (dayOfMonth) => {
    const today = new Date();
    // Día recortado al mes real: un dayOfMonth=31 con new Date(2026,5,31)
    // desbordaba a julio y "próximo pago" del dashboard salía el 1, no el 30.
    const enMes = (y, m) => new Date(y, m, effectiveDayInMonth(dayOfMonth, y, m));
    let d = enMes(today.getFullYear(), today.getMonth());
    if (d < today) {
        const nxt = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        d = enMes(nxt.getFullYear(), nxt.getMonth());
    }
    return d;
};

const computeHealthScore = (subscriptions, creditCards, bankCredits) => {
    let score = 100;
    const details = [];

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

    const inMora = bankCredits.filter(c => c.status === 'en_mora' || c.status === 'atrasado');
    if (inMora.length > 0) {
        const penalty = Math.min(40, inMora.length * 20);
        score -= penalty;
        details.push({ label: `${inMora.length} crédito(s) en mora`, impact: -penalty });
    }

    const monthlyCredits = bankCredits
        .filter(c => c.status === 'activo')
        .reduce((a, c) => a + toNum(c.valorCuota) + toNum(c.cuotaAdministracion), 0);
    const monthlySubs = subscriptions
        .filter(s => s.status === 'activa')
        .reduce((a, s) => a + subMonthlyCOP(s), 0);
    const totalMonthly = monthlyCredits + monthlySubs;

    if (totalMonthly > 5_000_000) {
        score -= 20;
        details.push({ label: 'Obligaciones mensuales muy altas (>5M)', impact: -20 });
    } else if (totalMonthly > 2_000_000) {
        score -= 10;
        details.push({ label: 'Obligaciones mensuales altas (>2M)', impact: -10 });
    }

    const activeSubs = subscriptions.filter(s => s.status === 'activa').length;
    if (activeSubs > 10) {
        score -= 5;
        details.push({ label: 'Muchas suscripciones activas (>10)', impact: -5 });
    }

    const activeCredits = bankCredits.filter(c => c.status === 'activo');
    if (activeCredits.length === 0 && totalCupo === 0 && activeSubs < 5) {
        details.push({ label: 'Perfil financiero limpio', impact: 0 });
    }

    const finalScore = Math.max(0, Math.min(100, Math.round(score)));
    const label = finalScore >= 90 ? 'Excelente' : finalScore >= 70 ? 'Bueno' : finalScore >= 50 ? 'Regular' : 'Crítico';

    return { score: finalScore, label, utilization: Math.round(utilization), details };
};

export const AnalyticsService = {

    getSummary: async (userId) => {
        const [subscriptions, bankCredits, creditCards, incomes, personalDebts, savingsGoals] = await Promise.all([
            Subscription.findAll({ where: { userId } }),
            BankCredit.findAll({ where: { userId } }),
            CreditCard.findAll({
                where: { userId },
                include: [{ model: CreditCardPurchase, as: 'CreditCardPurchases' }],
            }),
            Income.findAll({ where: { userId, status: 'activo' } }),
            PersonalDebt.findAll({ where: { userId, status: 'activo' } }),
            SavingsGoal.findAll({ where: { userId, status: 'activo' } }),
        ]);

        // Las suscripciones con creditCardId se auto-cobran en la tarjeta
        // (subscriptionChargeJob.js genera un CreditCardPurchase real cada
        // ciclo) — ya se cuentan abajo vía monthlyCreditCards. Sumarlas aquí
        // también las contaría doble en dineroLibre.
        const monthlySubscriptions = subscriptions
            .filter(s => s.status === 'activa' && !s.creditCardId)
            .reduce((a, s) => a + subMonthlyCOP(s), 0);

        const monthlyBankCredits = bankCredits
            .filter(c => c.status === 'activo')
            .reduce((a, c) => a + toNum(c.valorCuota) + toNum(c.cuotaAdministracion), 0);

        const activePurchases = creditCards.flatMap(c =>
            (c.CreditCardPurchases || []).filter(p => p.status === 'activa')
        );
        const monthlyCreditCards = activePurchases.reduce((a, p) => a + toNum(p.valorCuotaMensual), 0);

        const totalDebtCredits = bankCredits
            .filter(c => c.status !== 'pagado')
            .reduce((a, c) => a + toNum(c.saldoPendiente), 0);

        const totalDebtCards = creditCards.reduce(
            (a, c) => a + (toNum(c.cupoTotal) - toNum(c.cupoDisponible)), 0
        );

        // Deudas personales en cuotas: solo tipo 'deuda' activas (los 'gasto' son recurrentes, no saldo)
        const totalDebtPersonal = personalDebts
            .filter(d => d.tipo === 'deuda' && d.status === 'activo')
            .reduce((a, d) => a + toNum(d.saldoPendiente), 0);

        // Mensual (fijo): siempre cuenta. Extra: solo cuenta si fue registrado en el mes en curso.
        const now = new Date();
        const isExtraThisMonth = (i) => {
            const d = new Date(i.createdAt);
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        };
        const totalIncome = incomes.filter(i => !i.tipo || i.tipo === 'fijo' || isExtraThisMonth(i)).reduce((a, i) => a + toNum(i.monto), 0);
        const totalIncomeExtra = incomes.filter(i => i.tipo === 'extra' && isExtraThisMonth(i)).reduce((a, i) => a + toNum(i.monto), 0);
        // Solo los PersonalDebt tipo 'gasto' tienen montoCuota (las deudas lo
        // guardan en null y se abonan contra saldoPendiente), así que esta suma
        // es en la práctica "gastos recurrentes del mes".
        const gastosActivos = personalDebts.filter(d => d.status === 'activo' && d.tipo === 'gasto');
        const monthlyPersonalDebts = gastosActivos.reduce((a, d) => a + toNum(d.montoCuota), 0);
        const monthlySavings = savingsGoals.reduce((a, g) => a + toNum(g.aporteMensual), 0);
        const totalObligaciones = monthlySubscriptions + monthlyBankCredits + monthlyCreditCards + monthlyPersonalDebts;
        const dineroLibre = totalIncome - totalObligaciones - monthlySavings;

        const health = computeHealthScore(subscriptions, creditCards, bankCredits);

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
                amount: subMonthlyCOP(s),
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
            const amount = (c.CreditCardPurchases || [])
                .filter(p => p.status === 'activa')
                .reduce((a, p) => a + toNum(p.valorCuotaMensual), 0);
            // Sin cuotas activas no hay nada que pagar: listarla como "pago
            // próximo" con monto vacío ("—") hacía pensar que se debe algo.
            if (amount <= 0) return;
            if (d <= in30) upcoming.push({
                date: d.toISOString().slice(0, 10),
                name: c.nombre,
                type: 'credit_card',
                amount,
                moneda: 'COP',
            });
        });

        upcoming.sort((a, b) => a.date.localeCompare(b.date));

        // Desglose por ítem: el Dashboard muestra el total arriba y el detalle
        // debajo. La suma de cada lista cuadra exactamente con su total en
        // `obligations` (por eso las suscripciones con tarjeta vinculada se
        // excluyen aquí también — ya entran por el lado de la tarjeta).
        const breakdown = {
            creditCards: creditCards
                .filter(c => c.status === 'activa')
                .map(c => ({
                    id: c.id,
                    nombre: c.nombre,
                    detalle: c.entidad,
                    monto: (c.CreditCardPurchases || [])
                        .filter(p => p.status === 'activa')
                        .reduce((a, p) => a + toNum(p.valorCuotaMensual), 0),
                }))
                .filter(c => c.monto > 0)
                .sort((a, b) => b.monto - a.monto),
            bankCredits: bankCredits
                .filter(c => c.status === 'activo')
                .map(c => ({
                    id: c.id,
                    nombre: c.nombre,
                    detalle: c.entidad,
                    monto: toNum(c.valorCuota) + toNum(c.cuotaAdministracion),
                }))
                .sort((a, b) => b.monto - a.monto),
            subscriptions: subscriptions
                .filter(s => s.status === 'activa' && !s.creditCardId)
                .map(s => ({
                    id: s.id,
                    nombre: s.nombre,
                    detalle: s.moneda !== 'COP' ? s.moneda : null,
                    monto: subMonthlyCOP(s),
                }))
                .sort((a, b) => b.monto - a.monto),
            personalDebts: gastosActivos
                .map(d => ({ id: d.id, nombre: d.nombre, detalle: d.categoria, monto: toNum(d.montoCuota) }))
                .sort((a, b) => b.monto - a.monto),
            savings: savingsGoals
                .map(g => ({ id: g.id, nombre: g.nombre, detalle: g.emoji, monto: toNum(g.aporteMensual) }))
                .filter(g => g.monto > 0)
                .sort((a, b) => b.monto - a.monto),
        };

        return {
            income: { total: totalIncome, extra: totalIncomeExtra },
            dineroLibre,
            obligations: {
                subscriptions: monthlySubscriptions,
                bankCredits: monthlyBankCredits,
                creditCards: monthlyCreditCards,
                personalDebts: monthlyPersonalDebts,
                savings: monthlySavings,
                total: totalObligaciones,
            },
            breakdown,
            debt: {
                bankCredits: totalDebtCredits,
                creditCards: totalDebtCards,
                personalDebts: totalDebtPersonal,
                total: totalDebtCredits + totalDebtCards + totalDebtPersonal,
            },
            // Desglose de SALDOS (lo que se debe), no de cuotas mensuales. Aquí
            // sí aparecen los PersonalDebt tipo 'deuda', que no tienen cuota
            // mensual y por eso no salen en `breakdown`.
            debtBreakdown: {
                bankCredits: bankCredits
                    .filter(c => c.status !== 'pagado')
                    .map(c => ({ id: c.id, nombre: c.nombre, detalle: c.entidad, monto: toNum(c.saldoPendiente) }))
                    .filter(c => c.monto > 0)
                    .sort((a, b) => b.monto - a.monto),
                creditCards: creditCards
                    .map(c => ({ id: c.id, nombre: c.nombre, detalle: c.entidad, monto: toNum(c.cupoTotal) - toNum(c.cupoDisponible) }))
                    .filter(c => c.monto > 0)
                    .sort((a, b) => b.monto - a.monto),
                personalDebts: personalDebts
                    .filter(d => d.tipo === 'deuda' && d.status === 'activo')
                    .map(d => ({ id: d.id, nombre: d.nombre, detalle: d.prestamista, monto: toNum(d.saldoPendiente) }))
                    .filter(d => d.monto > 0)
                    .sort((a, b) => b.monto - a.monto),
            },
            counts: {
                activeSubscriptions: subscriptions.filter(s => s.status === 'activa').length,
                activeCredits: bankCredits.filter(c => c.status === 'activo').length,
                totalCards: creditCards.length,
                activePurchases: activePurchases.length,
            },
            health,
            upcoming,
        };
    },

    getMonthlyTrend: async (userId, months) => {
        const monthsNum = Math.min(Math.max(months, 1), 24);

        const [subscriptions, bankCredits, allPurchases] = await Promise.all([
            Subscription.findAll({ where: { userId } }),
            BankCredit.findAll({ where: { userId } }),
            // Compras cupo-afectantes (no cuota_manejo ni comision) para el histórico
            CreditCardPurchase.findAll({
                include: [{
                    model: CreditCard,
                    required: true,
                    where: { userId },
                    attributes: [],
                }],
                where: { tipo: { [Op.notIn]: ['cuota_manejo', 'comision'] } },
                attributes: ['fechaCompra', 'numeroCuotas', 'valorCuotaMensual'],
            }),
        ]);

        const result = [];
        const now = new Date();

        for (let i = monthsNum - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
            const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
            const label = d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });

            // Igual que en getSummary/getRecommendations: las suscripciones con
            // tarjeta vinculada NO se suman aquí, su cargo ya viene por
            // `cardTotal` (subscriptionChargeJob crea un CreditCardPurchase real).
            const subTotal = subscriptions
                .filter(s => {
                    if (s.creditCardId) return false;
                    const start = new Date(s.fechaInicio);
                    const end = s.fechaFin ? new Date(s.fechaFin) : null;
                    return start <= monthEnd && (!end || end >= monthStart) && s.status !== 'cancelada';
                })
                .reduce((a, s) => a + subMonthlyCOP(s), 0);

            const creditTotal = bankCredits
                .filter(c => {
                    const start = new Date(c.fechaInicio);
                    const end = new Date(c.fechaFin);
                    return start <= monthEnd && end >= monthStart && c.status !== 'pagado';
                })
                .reduce((a, c) => a + toNum(c.valorCuota) + toNum(c.cuotaAdministracion), 0);

            // Una compra "estuvo activa" en un mes si ese mes cae dentro del período
            // [fechaCompra, fechaCompra + numeroCuotas meses)
            const cardTotal = allPurchases
                .filter(p => {
                    const purchaseStart = new Date(p.fechaCompra + 'T00:00:00');
                    purchaseStart.setDate(1);
                    const purchaseEnd = new Date(purchaseStart);
                    purchaseEnd.setMonth(purchaseEnd.getMonth() + p.numeroCuotas);
                    return purchaseStart <= monthEnd && purchaseEnd > monthStart;
                })
                .reduce((a, p) => a + toNum(p.valorCuotaMensual), 0);

            result.push({
                month: label,
                subscriptions: Math.round(subTotal),
                bankCredits: Math.round(creditTotal),
                creditCards: Math.round(cardTotal),
                total: Math.round(subTotal + creditTotal + cardTotal),
            });
        }

        return result;
    },

    getRecommendations: async (userId) => {
        const [subscriptions, bankCredits, creditCards, incomes, personalDebts, savingsGoals] = await Promise.all([
            Subscription.findAll({ where: { userId } }),
            BankCredit.findAll({ where: { userId } }),
            CreditCard.findAll({
                where: { userId },
                include: [{ model: CreditCardPurchase, as: 'CreditCardPurchases', where: { status: 'activa' }, required: false }],
            }),
            Income.findAll({ where: { userId, status: 'activo' } }),
            PersonalDebt.findAll({ where: { userId, status: 'activo' } }),
            SavingsGoal.findAll({ where: { userId, status: 'activo' } }),
        ]);

        const recs = [];

        const totalIncome = incomes.filter(i => !i.tipo || i.tipo === 'fijo').reduce((a, i) => a + toNum(i.monto), 0);
        const activeSubs = subscriptions.filter(s => s.status === 'activa');
        const activeCredits = bankCredits.filter(c => c.status === 'activo');
        const creditsInMora = bankCredits.filter(c => c.status === 'en_mora' || c.status === 'atrasado');
        const totalCupo = creditCards.reduce((a, c) => a + toNum(c.cupoTotal), 0);
        const totalUsed = creditCards.reduce((a, c) => a + (toNum(c.cupoTotal) - toNum(c.cupoDisponible)), 0);
        const utilization = totalCupo > 0 ? (totalUsed / totalCupo) * 100 : 0;
        // Igual que en getSummary: las suscripciones con tarjeta vinculada ya
        // entran por creditCards.flatMap(...).valorCuotaMensual, no sumarlas
        // aparte o quedarían dobles en monthlyObl/dineroLibre.
        const monthlyObl = activeCredits.reduce((a, c) => a + toNum(c.valorCuota) + toNum(c.cuotaAdministracion), 0)
            + activeSubs.filter(s => !s.creditCardId).reduce((a, s) => a + subMonthlyCOP(s), 0)
            + creditCards.flatMap(c => c.CreditCardPurchases || []).reduce((a, p) => a + toNum(p.valorCuotaMensual), 0)
            + personalDebts.filter(d => d.status === 'activo').reduce((a, d) => a + toNum(d.montoCuota), 0);
        const monthlySavings = savingsGoals.reduce((a, g) => a + toNum(g.aporteMensual), 0);
        const dineroLibre = totalIncome - monthlyObl - monthlySavings;
        const oblRatio = totalIncome > 0 ? (monthlyObl / totalIncome) * 100 : 0;
        const subsTotal = activeSubs.reduce((a, s) => a + subMonthlyCOP(s), 0);

        if (!totalIncome) {
            recs.push({ type: 'info', title: 'Registra tus ingresos', description: 'Sin ingresos registrados no podemos calcular tu dinero libre ni darte consejos personalizados.', action: '/income/new' });
        }

        if (creditsInMora.length > 0) {
            recs.push({ type: 'danger', title: `${creditsInMora.length} crédito(s) en mora`, description: `Tienes ${creditsInMora.length} crédito(s) con pagos atrasados. Regulariza tu situación cuanto antes para evitar intereses de mora y daño a tu historial.`, action: '/bank-credits' });
        }

        if (utilization > 80) {
            recs.push({ type: 'danger', title: 'Cupo de tarjetas al límite', description: `Estás usando el ${Math.round(utilization)}% de tu cupo total. Se recomienda mantenerlo por debajo del 30% para no afectar tu perfil crediticio.`, action: '/credit-cards' });
        } else if (utilization > 50) {
            recs.push({ type: 'warning', title: 'Utilización de cupo elevada', description: `Usas el ${Math.round(utilization)}% de tu cupo disponible. Intenta reducirlo por debajo del 50% para mejorar tu salud financiera.`, action: '/credit-cards' });
        }

        if (dineroLibre < 0 && totalIncome > 0) {
            recs.push({ type: 'danger', title: 'Gastos mayores que ingresos', description: `Tus obligaciones superan tus ingresos en ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Math.abs(dineroLibre))} al mes. Revisa qué puedes reducir.`, action: '/reports' });
        } else if (oblRatio > 40 && totalIncome > 0) {
            recs.push({ type: 'warning', title: 'Obligaciones por encima del 40%', description: `Tus compromisos mensuales representan el ${Math.round(oblRatio)}% de tus ingresos. La regla general es no superar el 40%. Considera renegociar o reducir deudas.`, action: '/reports' });
        }

        if (savingsGoals.length === 0 && totalIncome > 0) {
            recs.push({ type: 'info', title: 'Crea tu primera meta de ahorro', description: 'No tienes metas de ahorro activas. Empieza con un fondo de emergencia equivalente a 3 meses de gastos.', action: '/savings/new' });
        } else if (savingsGoals.length > 0 && monthlySavings / totalIncome < 0.1 && totalIncome > 0) {
            recs.push({ type: 'info', title: 'Aumenta tu tasa de ahorro', description: `Destinas el ${Math.round((monthlySavings / totalIncome) * 100)}% de tus ingresos al ahorro. Se recomienda al menos el 10-20%.`, action: '/savings' });
        }

        if (activeSubs.length > 7) {
            recs.push({ type: 'warning', title: `${activeSubs.length} suscripciones activas`, description: `Tienes ${activeSubs.length} suscripciones que suman ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(subsTotal)}/mes. Revisa cuáles realmente usas y cancela las que no.`, action: '/subscriptions' });
        }

        if (recs.length === 0) {
            recs.push({ type: 'success', title: '¡Finanzas en orden!', description: 'No encontramos áreas de riesgo en tu situación actual. Sigue así y considera diversificar tus inversiones para hacer crecer tu patrimonio.', action: null });
        }

        return recs;
    },

    getDebtFreedom: async (userId) => {
        const [bankCredits, creditCards, personalDebts] = await Promise.all([
            BankCredit.findAll({ where: { userId } }),
            CreditCard.findAll({
                where: { userId },
                include: [{ model: CreditCardPurchase, as: 'CreditCardPurchases', where: { status: 'activa' }, required: false }],
            }),
            PersonalDebt.findAll({ where: { userId } }),
        ]);

        const activeCredits = bankCredits.filter(c => c.status === 'activo' || c.status === 'en_mora' || c.status === 'atrasado');

        // Bank credits: use actual remaining cuotas
        const creditItems = activeCredits.map(c => {
            const remaining = Number(c.numeroCuotas) - Number(c.cuotasPagadas);
            const monthlyPayment = toNum(c.valorCuota) + toNum(c.cuotaAdministracion);
            return { nombre: c.nombre, type: 'bank_credit', saldo: toNum(c.saldoPendiente), monthlyPayment, monthsLeft: remaining };
        });

        // Credit cards: use actual remaining installments per purchase, same logic as bank credits
        const cardItems = creditCards.map(c => {
            const purchases = (c.CreditCardPurchases || []).filter(p =>
                p.status === 'activa' && p.tipo !== 'comision' && p.tipo !== 'cuota_manejo'
            );
            if (purchases.length === 0) return null;
            const monthlyPayment = purchases.reduce((a, p) => a + toNum(p.valorCuotaMensual), 0);
            if (monthlyPayment <= 0) return null;
            // Max remaining installments across all active purchases
            const monthsLeft = Math.max(...purchases.map(p => Math.max(0, Number(p.numeroCuotas) - Number(p.cuotasPagadas))));
            const saldo = purchases.reduce((a, p) => {
                const remaining = Math.max(0, Number(p.numeroCuotas) - Number(p.cuotasPagadas));
                return a + toNum(p.valorCuotaMensual) * remaining;
            }, 0);
            return { nombre: c.nombre, type: 'credit_card', saldo, monthlyPayment, monthsLeft };
        }).filter(Boolean);

        // Deudas personales en cuotas (tipo 'deuda' activas con saldo)
        const personalItems = personalDebts
            .filter(d => d.tipo === 'deuda' && d.status === 'activo' && toNum(d.saldoPendiente) > 0)
            .map(d => {
                const monthlyPayment = toNum(d.montoCuota);
                const monthsLeft = d.numeroCuotas
                    ? Math.max(0, Number(d.numeroCuotas) - Number(d.cuotasPagadas))
                    : (monthlyPayment > 0 ? Math.ceil(toNum(d.saldoPendiente) / monthlyPayment) : 0);
                return { nombre: d.nombre, type: 'personal_debt', saldo: toNum(d.saldoPendiente), monthlyPayment, monthsLeft };
            });

        const allItems = [...creditItems, ...cardItems, ...personalItems];
        if (allItems.length === 0) return { hasDebts: false, totalDebt: 0, monthlyPayments: 0, estimatedMonths: 0, estimatedDate: null, breakdown: [] };

        const totalDebt = allItems.reduce((a, i) => a + i.saldo, 0);
        const monthlyPayments = allItems.reduce((a, i) => a + i.monthlyPayment, 0);
        const maxMonths = Math.max(...allItems.map(i => i.monthsLeft || 0));

        const estimatedDate = new Date();
        estimatedDate.setMonth(estimatedDate.getMonth() + maxMonths);

        return {
            hasDebts: true,
            totalDebt: Math.round(totalDebt),
            monthlyPayments: Math.round(monthlyPayments),
            estimatedMonths: maxMonths,
            estimatedDate: estimatedDate.toISOString().slice(0, 7),
            breakdown: allItems.map(i => ({
                nombre: i.nombre,
                type: i.type,
                saldo: Math.round(i.saldo),
                monthlyPayment: Math.round(i.monthlyPayment),
                monthsLeft: i.monthsLeft,
            })),
        };
    },

    getDistribution: async (userId) => {
        const [subscriptions, bankCredits, creditCards] = await Promise.all([
            Subscription.findAll({ where: { userId, status: 'activa' } }),
            BankCredit.findAll({ where: { userId, status: 'activo' } }),
            CreditCard.findAll({
                where: { userId },
                include: [{ model: CreditCardPurchase, as: 'CreditCardPurchases', where: { status: 'activa' }, required: false }],
            }),
        ]);

        const subMonthly = subscriptions.reduce((a, s) => a + subMonthlyCOP(s), 0);
        const creditMonthly = bankCredits.reduce((a, c) => a + toNum(c.valorCuota) + toNum(c.cuotaAdministracion), 0);
        const cardMonthly = creditCards.flatMap(c => c.CreditCardPurchases || [])
            .reduce((a, p) => a + toNum(p.valorCuotaMensual), 0);

        return [
            { name: 'Suscripciones',       value: Math.round(subMonthly),    color: '#1565C0' },
            { name: 'Créditos bancarios',   value: Math.round(creditMonthly), color: '#DC2626' },
            { name: 'Tarjetas de crédito',  value: Math.round(cardMonthly),   color: '#D97706' },
        ].filter(d => d.value > 0);
    },
};
