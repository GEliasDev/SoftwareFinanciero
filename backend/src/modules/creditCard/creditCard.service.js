import { literal } from 'sequelize';
import { CreditCard } from './creditCard.model.js';
import { CreditCardPurchase } from './creditCardPurchase.model.js';
import { creditCardCreateSchema, creditCardUpdateSchema, purchaseCreateSchema, purchaseUpdateSchema, advanceCreateSchema } from './creditCard.schema.js';
import { calcularCuotaCompra, calcularPagoMinimo } from './utils/creditCardCalculation.js';
import { effectiveDayInMonth } from '../../utils/cycleDay.js';
import { AppError } from '../../middlewares/appError.js';
import logger from '../../utils/logger.js';
import { ReminderService } from '../reminder/reminder.service.js';

export const CreditCardService = {
    // ── Tarjeta ──────────────────────────────────────────────

    createCreditCard: async (data) => {
        const parsed = creditCardCreateSchema.parse(data);
            const card = await CreditCard.create({
                ...parsed,
                cupoDisponible: parsed.cupoTotal,
                userId: data.userId,
            });
            logger.info(`Credit card ${card.id} created for user ${data.userId}`);
            // Recordatorio con default sensato (3 días antes del pago): antes
            // el usuario tenía que crearlo a mano repitiendo datos que la
            // tarjeta ya tiene. No bloquea el alta si falla.
            try {
                await ReminderService.createReminder({
                    userId: data.userId,
                    debtType: 'credit_card',
                    debtId: card.id,
                    nombre: card.nombre,
                    diasAnticipacion: 3,
                });
            } catch (err) {
                logger.error(`No se pudo auto-crear recordatorio para tarjeta ${card.id}: ${err.message}`);
            }
            return card;
    },

    getAllCreditCards: async (userId) => {
        return CreditCard.findAll({
            where: { userId },
            include: [{ model: CreditCardPurchase, where: { status: 'activa' }, required: false }],
        });
    },

    getCreditCardById: async (id, userId, isAdmin) => {
        const card = await CreditCard.findByPk(id, {
            include: [{ model: CreditCardPurchase }],
        });
        if (!card) throw new AppError('Tarjeta de crédito no encontrada', 404);
        if (!isAdmin && card.userId !== userId) {
            throw new AppError('Acceso no autorizado a tarjeta de crédito', 403);
        }
        return card;
    },

    updateCreditCard: async (id, data, userId, isAdmin) => {
        const card = await CreditCard.findByPk(id);
        if (!card) throw new AppError('Tarjeta de crédito no encontrada', 404);
        if (!isAdmin && card.userId !== userId) {
            throw new AppError('Acceso no autorizado a tarjeta de crédito', 403);
        }
        const parsed = creditCardUpdateSchema.parse(data);

        const updates = { ...parsed };
        if (parsed.cupoTotal !== undefined) {
            const usedAmount = parseFloat(card.cupoTotal) - parseFloat(card.cupoDisponible);
            updates.cupoDisponible = parseFloat(Math.max(0, parsed.cupoTotal - usedAmount).toFixed(2));
        }

        await card.update(updates);
logger.info(`Credit card ${id} updated by user ${userId}`);
return card;
    },

    deleteCreditCard: async (id, userId, isAdmin) => {
        const card = await CreditCard.findByPk(id);
        if (!card) throw new AppError('Tarjeta de crédito no encontrada', 404);
        if (!isAdmin && card.userId !== userId) {
            throw new AppError('Acceso no autorizado a tarjeta de crédito', 403);
        }
        // Sin ON DELETE CASCADE en la FK: borrar las compras primero o la
        // eliminación falla con violación de clave foránea (23503).
        await CreditCardPurchase.destroy({ where: { creditCardId: id } });
        await card.destroy();
        logger.info(`Credit card ${id} deleted by user ${userId}`);
        return;
    },

    // ── Resumen mensual ───────────────────────────────────────

    getMonthlySummary: async (id) => {
        const card = await CreditCard.findByPk(id, {
            include: [{ model: CreditCardPurchase, where: { status: 'activa' }, required: false }],
        });
        if (!card) throw new AppError('Tarjeta de crédito no encontrada', 404);

        // Suma de todas las cuotas activas del mes
        const totalCuotasMes = card.CreditCardPurchases.reduce(
            (acc, p) => acc + parseFloat(p.valorCuotaMensual),
            0
        );

        const pagoMinimo = calcularPagoMinimo({
            cupoTotal: parseFloat(card.cupoTotal),
            cupoDisponible: parseFloat(card.cupoDisponible),
        });

        return {
            tarjeta: card.nombre,
            entidad: card.entidad,
            cupoTotal: card.cupoTotal,
            cupoDisponible: card.cupoDisponible,
            saldoUsado: parseFloat((card.cupoTotal - card.cupoDisponible).toFixed(2)),
            totalCuotasMes: parseFloat(totalCuotasMes.toFixed(2)),
            pagoMinimo,
            fechaCorte: card.fechaCorte,
            fechaPago: card.fechaPago,
            comprasActivas: card.CreditCardPurchases.length,
        };
    },

    // ── Compras ───────────────────────────────────────────────

    createPurchase: async (creditCardId, data, userId, isAdmin) => {
        const card = await CreditCard.findByPk(creditCardId);
        if (!card) throw new AppError('Tarjeta de crédito no encontrada', 404);
        if (!isAdmin && card.userId !== userId) {
            throw new AppError('Acceso no autorizado a tarjeta de crédito', 403);
        }
        if (card.status !== 'activa') throw new AppError('La tarjeta no está activa', 400);

        const parsed = purchaseCreateSchema.parse(data);

        if (parsed.montoTotal > parseFloat(card.cupoDisponible)) {
            throw new AppError(
                `Cupo insuficiente. Disponible: $${card.cupoDisponible}`,
                400
            );
        }

        const calculos = calcularCuotaCompra({
            montoTotal: parsed.montoTotal,
            numeroCuotas: parsed.numeroCuotas,
            tasaInteresMensual: parseFloat(card.tasaInteresMensual),
        });

        // Reducir cupo disponible
        await card.update({
            cupoDisponible: parseFloat((card.cupoDisponible - parsed.montoTotal).toFixed(2)),
        });

        const purchase = await CreditCardPurchase.create({
            ...parsed,
            ...calculos,
            creditCardId,
        });
        logger.info(`Purchase ${purchase.id} created for credit card ${creditCardId} by user ${userId}`);
        return purchase;
    },

    // ── Avances ───────────────────────────────────────────────

    createAdvance: async (creditCardId, data, userId, isAdmin) => {
        const card = await CreditCard.findByPk(creditCardId);
        if (!card) throw new AppError('Tarjeta de crédito no encontrada', 404);
        if (!isAdmin && card.userId !== userId) {
            throw new AppError('Acceso no autorizado a tarjeta de crédito', 403);
        }
        if (card.status !== 'activa') throw new AppError('La tarjeta no está activa', 400);

        const parsed = advanceCreateSchema.parse(data);
        const comision = parseFloat(card.comisionAvance ?? 0);

        // La comisión es cupo-neutral: solo el capital del avance ocupa cupo.
        if (parsed.montoTotal > parseFloat(card.cupoDisponible)) {
            throw new AppError(
                `Cupo insuficiente. Disponible: $${card.cupoDisponible} (avance: $${parsed.montoTotal.toFixed(2)})`,
                400
            );
        }

        const calculos = calcularCuotaCompra({
            montoTotal: parsed.montoTotal,
            numeroCuotas: parsed.numeroCuotas,
            tasaInteresMensual: parseFloat(card.tasaInteresMensual),
        });

        const avance = await CreditCardPurchase.create({
            descripcion: parsed.descripcion,
            montoTotal: parsed.montoTotal,
            numeroCuotas: parsed.numeroCuotas,
            fechaCompra: parsed.fechaCompra,
            categoria: 'otros',
            tipo: 'avance',
            ...calculos,
            creditCardId,
        });

        let comisionRecord = null;
        if (comision > 0) {
            comisionRecord = await CreditCardPurchase.create({
                descripcion: 'Comisión por avance',
                montoTotal: comision,
                numeroCuotas: 1,
                valorCuotaMensual: comision,
                totalAPagar: comision,
                totalIntereses: 0,
                categoria: 'otros',
                tipo: 'comision',
                fechaCompra: parsed.fechaCompra,
                creditCardId,
                avanceId: avance.id,
            });
        }

        // Solo el avance ocupa cupo; la comisión es cupo-neutral.
        await card.update({
            cupoDisponible: parseFloat((parseFloat(card.cupoDisponible) - parsed.montoTotal).toFixed(2)),
        });

        logger.info(`Advance ${avance.id} created for credit card ${creditCardId} by user ${userId}`);
        return { avance, comision: comisionRecord };
    },

    getPurchasesByCard: async (creditCardId) => {
        return CreditCardPurchase.findAll({ where: { creditCardId }, order: [['fechaCompra', 'DESC']] });
    },

    getPurchaseById: async (purchaseId) => {
        const purchase = await CreditCardPurchase.findByPk(purchaseId);
        if (!purchase) throw new AppError('Compra no encontrada', 404);
        return purchase;
    },

    // Registrar cuota pagada de una compra
    registerPurchasePayment: async (purchaseId) => {
        const purchase = await CreditCardPurchase.findByPk(purchaseId, {
            include: [CreditCard],
        });
        if (!purchase) throw new AppError('Compra no encontrada', 404);
        if (purchase.status === 'pagada') throw new AppError('Esta compra ya está pagada', 400);

        const nuevasCuotasPagadas = purchase.cuotasPagadas + 1;
        const cuotasRestantes = purchase.numeroCuotas - nuevasCuotasPagadas;
        const pagada = cuotasRestantes === 0;

        // Restaurar cupo solo por la porción de capital (cuota incluye interés que no ocupa cupo).
        const card = purchase.CreditCard;
        // Cuota de manejo y comisiones son cupo-neutral: no restaura cupo al pagarse.
        if (purchase.tipo !== 'cuota_manejo' && purchase.tipo !== 'comision') {
            const capitalPorCuota = parseFloat(purchase.montoTotal) / purchase.numeroCuotas;
            // Incremento atómico en SQL: "Pagar corte" dispara varios pagos en
            // paralelo y un read-modify-write en JS pierde los incrementos
            // concurrentes (el último write pisa a los demás).
            await CreditCard.update(
                { cupoDisponible: literal(`LEAST("cupoTotal", "cupoDisponible" + ${Number(capitalPorCuota).toFixed(2)})`) },
                { where: { id: card.id } }
            );
        }

        // La comisión de un avance se paga automáticamente junto con la PRIMERA
        // cuota del avance (es un cargo único de ese ciclo). Es cupo-neutral:
        // solo se marca pagada, sin tocar el cupo disponible.
        if (purchase.tipo === 'avance' && nuevasCuotasPagadas === 1) {
            await CreditCardPurchase.update(
                { status: 'pagada', cuotasPagadas: 1 },
                { where: { avanceId: purchase.id, tipo: 'comision' } }
            );
        }

        await purchase.update({
            cuotasPagadas: nuevasCuotasPagadas,
            status: pagada ? 'pagada' : 'activa',
        });
        logger.info(`Payment registered for purchase ${purchaseId}, new status: ${pagada ? 'pagada' : 'activa'}`);
        return purchase;
    },

    updatePurchase: async (purchaseId, data) => {
        const purchase = await CreditCardPurchase.findByPk(purchaseId);
        if (!purchase) throw new AppError('Compra no encontrada', 404);
        const parsed = purchaseUpdateSchema.parse(data);
        return purchase.update(parsed);
    },

    deletePurchase: async (purchaseId) => {
        const purchase = await CreditCardPurchase.findByPk(purchaseId, {
            include: [CreditCard],
        });
        if (!purchase) throw new AppError('Compra no encontrada', 404);

        const card = purchase.CreditCard;
        let cupoARestaurar = 0;

        // Restaurar cupo proporcional al capital no pagado (no intereses).
        // Cuota de manejo y comisiones son cupo-neutral: no restauran cupo.
        const cuotasRestantes = purchase.numeroCuotas - purchase.cuotasPagadas;
        if (cuotasRestantes > 0 && purchase.tipo !== 'cuota_manejo' && purchase.tipo !== 'comision') {
            const capitalPorCuota = parseFloat(purchase.montoTotal) / purchase.numeroCuotas;
            cupoARestaurar += cuotasRestantes * capitalPorCuota;
        }

        // Si es un avance, eliminar la comisión dependiente. La comisión es
        // cupo-neutral, así que su eliminación no afecta el cupo disponible.
        if (purchase.tipo === 'avance') {
            const comision = await CreditCardPurchase.findOne({
                where: { avanceId: purchaseId, tipo: 'comision' },
            });
            if (comision) {
                await comision.destroy();
            }
        }

        if (cupoARestaurar > 0) {
            const nuevoCupo = parseFloat((parseFloat(card.cupoDisponible) + cupoARestaurar).toFixed(2));
            await card.update({ cupoDisponible: Math.min(nuevoCupo, parseFloat(card.cupoTotal)) });
        }

        return purchase.destroy();
    },

    // ── Overview global del usuario ───────────────────────────

    getOverview: async (userId) => {
        const cards = await CreditCard.findAll({
            where: { userId },
            include: [{ model: CreditCardPurchase, where: { status: 'activa' }, required: false }],
        });

        let totalObligacionMensual = 0;
        let totalCupoDisponible = 0;
        let totalCupoTotal = 0;
        let totalComprasActivas = 0;
        let nextPaymentDays = null;
        const today = new Date();

        for (const card of cards) {
            totalCupoDisponible += parseFloat(card.cupoDisponible);
            totalCupoTotal += parseFloat(card.cupoTotal);

            const purchases = card.CreditCardPurchases || [];
            totalComprasActivas += purchases.length;

            for (const p of purchases) {
                totalObligacionMensual += parseFloat(p.valorCuotaMensual);
            }

            // Calcular días hasta próximo pago
            if (card.fechaPago) {
                const diaP = parseInt(card.fechaPago);
                // Día recortado al mes: un diaP=31 desbordaba al mes siguiente.
                const enMes = (y, m) => new Date(y, m, effectiveDayInMonth(diaP, y, m));
                let next = enMes(today.getFullYear(), today.getMonth());
                if (next <= today) {
                    const nx = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                    next = enMes(nx.getFullYear(), nx.getMonth());
                }
                const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
                if (nextPaymentDays === null || diff < nextPaymentDays) nextPaymentDays = diff;
            }
        }

        return {
            totalObligacionMensual: parseFloat(totalObligacionMensual.toFixed(2)),
            totalCupoDisponible: parseFloat(totalCupoDisponible.toFixed(2)),
            totalCupoTotal: parseFloat(totalCupoTotal.toFixed(2)),
            totalCupoUsado: parseFloat((totalCupoTotal - totalCupoDisponible).toFixed(2)),
            totalComprasActivas,
            totalTarjetas: cards.length,
            nextPaymentDays,
        };
    },

    // ── Deshacer último pago ──────────────────────────────────

    undoPurchasePayment: async (purchaseId) => {
        const purchase = await CreditCardPurchase.findByPk(purchaseId, {
            include: [CreditCard],
        });
        if (!purchase) throw new AppError('Compra no encontrada', 404);
        if (purchase.cuotasPagadas === 0) throw new AppError('No hay pagos que deshacer', 400);

        const nuevasCuotasPagadas = purchase.cuotasPagadas - 1;
        const card = purchase.CreditCard;

        // Cuota de manejo y comisiones son cupo-neutral: no revierten cupo.
        if (purchase.tipo !== 'cuota_manejo' && purchase.tipo !== 'comision') {
            const capitalPorCuota = parseFloat(purchase.montoTotal) / purchase.numeroCuotas;
            // Decremento atómico (mismo motivo que en registerPurchasePayment).
            await CreditCard.update(
                { cupoDisponible: literal(`GREATEST(0, "cupoDisponible" - ${Number(capitalPorCuota).toFixed(2)})`) },
                { where: { id: card.id } }
            );
        }

        // Si se deshace la PRIMERA cuota pagada de un avance, su comisión vuelve
        // a quedar pendiente (fue pagada de forma automática junto con esa cuota).
        if (purchase.tipo === 'avance' && nuevasCuotasPagadas === 0) {
            await CreditCardPurchase.update(
                { status: 'activa', cuotasPagadas: 0 },
                { where: { avanceId: purchase.id, tipo: 'comision' } }
            );
        }

        return purchase.update({
            cuotasPagadas: nuevasCuotasPagadas,
            status: 'activa',
        });
    },

    // ── Abono extraordinario ──────────────────────────────────

    registerAbono: async (purchaseId, montoAbono) => {
        const purchase = await CreditCardPurchase.findByPk(purchaseId, {
            include: [CreditCard],
        });
        if (!purchase) throw new AppError('Compra no encontrada', 404);
        if (purchase.status === 'pagada') throw new AppError('Esta compra ya está pagada', 400);

        const monto = parseFloat(montoAbono);
        if (!monto || monto <= 0) throw new AppError('Monto de abono inválido', 400);

        const cuotasPagadas = purchase.cuotasPagadas;
        const capitalPorCuota = parseFloat(purchase.montoTotal) / purchase.numeroCuotas;
        const capitalPagado = cuotasPagadas * capitalPorCuota;
        const capitalPendiente = parseFloat(purchase.montoTotal) - capitalPagado;

        if (monto >= capitalPendiente) {
            // El abono cancela la deuda completa
            const card = purchase.CreditCard;
            const nuevoCupo = parseFloat(
                (parseFloat(card.cupoDisponible) + capitalPendiente).toFixed(2)
            );
            await card.update({ cupoDisponible: Math.min(nuevoCupo, parseFloat(card.cupoTotal)) });

            // Si se cancela un avance por completo, su comisión queda pagada.
            if (purchase.tipo === 'avance') {
                await CreditCardPurchase.update(
                    { status: 'pagada', cuotasPagadas: 1 },
                    { where: { avanceId: purchase.id, tipo: 'comision' } }
                );
            }

            return purchase.update({ cuotasPagadas: purchase.numeroCuotas, status: 'pagada' });
        }

        // Recalcular cuotas restantes con capital reducido
        const nuevoCapitalPendiente = capitalPendiente - monto;
        const tasaMensual = parseFloat(purchase.CreditCard.tasaInteresMensual) / 100;
        let nuevasCuotasRestantes;

        if (tasaMensual === 0) {
            nuevasCuotasRestantes = Math.ceil(nuevoCapitalPendiente / capitalPorCuota);
        } else {
            // n = -ln(1 - i*P/C) / ln(1+i)  con C = cuota original
            const cuotaOriginal = parseFloat(purchase.valorCuotaMensual);
            const arg = 1 - (tasaMensual * nuevoCapitalPendiente) / cuotaOriginal;
            if (arg <= 0) {
                nuevasCuotasRestantes = 1;
            } else {
                nuevasCuotasRestantes = Math.ceil(-Math.log(arg) / Math.log(1 + tasaMensual));
            }
        }

        const nuevoNumeroCuotas = cuotasPagadas + nuevasCuotasRestantes;

        // Restaurar cupo por el abono
        const card = purchase.CreditCard;
        const nuevoCupo = parseFloat(
            (parseFloat(card.cupoDisponible) + monto).toFixed(2)
        );
        await card.update({ cupoDisponible: Math.min(nuevoCupo, parseFloat(card.cupoTotal)) });
        return purchase.update({ numeroCuotas: nuevoNumeroCuotas });
    },

    // ── Próximos pagos ────────────────────────────────────────

    getUpcomingPayments: async (creditCardId) => {
        const card = await CreditCard.findByPk(creditCardId, {
            include: [{ model: CreditCardPurchase, where: { status: 'activa' }, required: false }],
        });
        if (!card) throw new AppError('Tarjeta de crédito no encontrada', 404);

        const today = new Date();
        const diaPago = parseInt(card.fechaPago) || 1;
        const upcoming = [];

        // Generar los próximos 3 meses de pagos
        for (let m = 0; m < 3; m++) {
            // Día recortado al mes destino: un diaPago=31 desbordaba al mes
            // siguiente y la fecha de pago mostrada salía corrida.
            const y  = today.getFullYear();
            const mo = today.getMonth() + m;
            const date = new Date(y, mo, effectiveDayInMonth(diaPago, y, mo));
            if (date <= today && m === 0) continue;

            const purchasesThisMonth = (card.CreditCardPurchases || [])
                .filter(p => {
                    const cuotasRestantes = p.numeroCuotas - p.cuotasPagadas;
                    return cuotasRestantes > m;
                })
                .map(p => ({
                    id: p.id,
                    descripcion: p.descripcion,
                    cuota: parseFloat(p.valorCuotaMensual),
                    cuotaNum: p.cuotasPagadas + m + 1,
                    totalCuotas: p.numeroCuotas,
                }));

            const total = purchasesThisMonth.reduce((s, p) => s + p.cuota, 0);

            upcoming.push({
                fecha: date.toISOString().split('T')[0],
                total: parseFloat(total.toFixed(2)),
                compras: purchasesThisMonth,
            });
        }

        return upcoming;
    },

    // ── Estadísticas de compras ───────────────────────────────

    getPurchaseStats: async (creditCardId) => {
        const card = await CreditCard.findByPk(creditCardId);
        if (!card) throw new AppError('Tarjeta de crédito no encontrada', 404);

        const purchases = await CreditCardPurchase.findAll({ where: { creditCardId } });

        const byCategory = {};
        let totalIntereses = 0;
        let totalCapital = 0;

        for (const p of purchases) {
            const cat = p.categoria || 'Sin categoría';
            if (!byCategory[cat]) byCategory[cat] = { monto: 0, count: 0 };
            byCategory[cat].monto += parseFloat(p.montoTotal);
            byCategory[cat].count += 1;

            const intereses = parseFloat(p.valorCuotaMensual) * p.numeroCuotas - parseFloat(p.montoTotal);
            totalIntereses += Math.max(0, intereses);
            totalCapital += parseFloat(p.montoTotal);
        }

        const categorias = Object.entries(byCategory).map(([name, v]) => ({
            categoria: name,
            monto: parseFloat(v.monto.toFixed(2)),
            count: v.count,
        }));

        const avgCuotas = purchases.length
            ? purchases.reduce((s, p) => s + p.numeroCuotas, 0) / purchases.length
            : 0;

        return {
            totalCompras: purchases.length,
            totalCapital: parseFloat(totalCapital.toFixed(2)),
            totalIntereses: parseFloat(totalIntereses.toFixed(2)),
            avgCuotas: parseFloat(avgCuotas.toFixed(1)),
            categorias,
        };
    },
};