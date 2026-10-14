import { literal } from 'sequelize';
import { CreditCard } from './creditCard.model.js';
import { CreditCardPurchase } from './creditCardPurchase.model.js';
import { creditCardCreateSchema, creditCardUpdateSchema, purchaseCreateSchema, purchaseUpdateSchema, advanceCreateSchema } from './creditCard.schema.js';
import { calcularCuotaCompra, calcularPagoMinimo } from './utils/creditCardCalculation.js';
import { effectiveDayInMonth } from '../../utils/cycleDay.js';
import { AppError } from '../../middlewares/appError.js';
import logger from '../../utils/logger.js';

// Las FKs no garantizan ownership: todo endpoint de compra debe verificar que
// la tarjeta (y por tanto la compra) pertenece al usuario de la sesión. Sin
// esto, cambiar el id en la URL permitía leer/pagar/editar/borrar compras de
// otras cuentas (IDOR). Además se cruza el `creditCardId` de la URL para que no
// se pueda operar una compra desde la ruta de otra tarjeta.
const findOwnedCard = async (creditCardId, userId, isAdmin) => {
    const card = await CreditCard.findByPk(creditCardId);
    if (!card) throw new AppError('Tarjeta de crédito no encontrada', 404);
    if (!isAdmin && card.userId !== userId) {
        throw new AppError('Acceso no autorizado a tarjeta de crédito', 403);
    }
    return card;
};

const findOwnedPurchase = async (purchaseId, creditCardId, userId, isAdmin) => {
    const purchase = await CreditCardPurchase.findByPk(purchaseId, { include: [CreditCard] });
    if (!purchase) throw new AppError('Compra no encontrada', 404);
    if (!isAdmin && purchase.CreditCard?.userId !== userId) {
        throw new AppError('Acceso no autorizado a la compra', 403);
    }
    if (creditCardId != null && Number(purchase.creditCardId) !== Number(creditCardId)) {
        throw new AppError('La compra no pertenece a esta tarjeta', 404);
    }
    return purchase;
};

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

    getMonthlySummary: async (id, userId, isAdmin) => {
        const card = await CreditCard.findByPk(id, {
            include: [{ model: CreditCardPurchase, where: { status: 'activa' }, required: false }],
        });
        if (!card) throw new AppError('Tarjeta de crédito no encontrada', 404);
        if (!isAdmin && card.userId !== userId) {
            throw new AppError('Acceso no autorizado a tarjeta de crédito', 403);
        }

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

    getPurchasesByCard: async (creditCardId, userId, isAdmin) => {
        await findOwnedCard(creditCardId, userId, isAdmin);
        return CreditCardPurchase.findAll({ where: { creditCardId }, order: [['fechaCompra', 'DESC']] });
    },

    getPurchaseById: async (purchaseId, creditCardId, userId, isAdmin) => {
        const purchase = await findOwnedPurchase(purchaseId, creditCardId, userId, isAdmin);
        const data = purchase.toJSON();
        // La comisión de un avance vive como registro aparte; se adjunta para
        // que el detalle pueda mostrarla (el listado la une con
        // `attachAdvanceCommission`, pero el detalle pide un solo registro).
        if (purchase.tipo === 'avance') {
            const commission = await CreditCardPurchase.findOne({
                where: { avanceId: purchase.id, tipo: 'comision' },
            });
            if (commission) data.commission = commission.toJSON();
        }
        return data;
    },

    // Registrar cuota pagada de una compra
    registerPurchasePayment: async (purchaseId, creditCardId, userId, isAdmin) => {
        const purchase = await findOwnedPurchase(purchaseId, creditCardId, userId, isAdmin);
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

    updatePurchase: async (purchaseId, data, creditCardId, userId, isAdmin) => {
        const purchase = await findOwnedPurchase(purchaseId, creditCardId, userId, isAdmin);
        const parsed = purchaseUpdateSchema.parse(data);

        const cambiaDinero = parsed.montoTotal !== undefined
            || parsed.numeroCuotas !== undefined
            || parsed.fechaCompra !== undefined;

        // Los campos de dinero solo se editan mientras la compra no tenga pagos y
        // sea una compra normal: sobre una compra ya abonada (o un avance/comisión
        // con su comisión aparte) recalcular las cuotas es ambiguo y descuadraría
        // el cupo. Para corregir ahí: deshacer pagos, o borrar y recrear.
        if (cambiaDinero) {
            if (purchase.tipo !== 'compra') {
                throw new AppError('Solo se pueden editar el monto, las cuotas y la fecha de una compra normal', 400);
            }
            if (purchase.cuotasPagadas > 0) {
                throw new AppError('No se puede editar el monto ni las cuotas de una compra que ya tiene pagos registrados', 400);
            }
        }

        const updates = { ...parsed };

        if (parsed.montoTotal !== undefined || parsed.numeroCuotas !== undefined) {
            const card = purchase.CreditCard;
            const montoFinal = parsed.montoTotal ?? parseFloat(purchase.montoTotal);
            const cuotasFinales = parsed.numeroCuotas ?? purchase.numeroCuotas;

            // El cupo comprometido por una compra sin pagos es exactamente su
            // capital, así que basta ajustarlo por la diferencia. Incremento/
            // decremento atómico en SQL (LEAST/GREATEST) para no pisar cupos
            // concurrentes.
            if (parsed.montoTotal !== undefined) {
                const delta = montoFinal - parseFloat(purchase.montoTotal);
                if (delta > 0 && delta > parseFloat(card.cupoDisponible)) {
                    throw new AppError(`Cupo insuficiente. Disponible: $${card.cupoDisponible}`, 400);
                }
                if (delta !== 0) {
                    await CreditCard.update(
                        { cupoDisponible: literal(`LEAST("cupoTotal", GREATEST(0, "cupoDisponible" - ${Number(delta).toFixed(2)}))`) },
                        { where: { id: card.id } }
                    );
                }
            }

            Object.assign(updates, calcularCuotaCompra({
                montoTotal: montoFinal,
                numeroCuotas: cuotasFinales,
                tasaInteresMensual: parseFloat(card.tasaInteresMensual),
            }));
        }

        await purchase.update(updates);
        logger.info(`Purchase ${purchaseId} updated by user ${userId}`);
        return purchase;
    },

    deletePurchase: async (purchaseId, creditCardId, userId, isAdmin) => {
        const purchase = await findOwnedPurchase(purchaseId, creditCardId, userId, isAdmin);

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
            // Incremento atómico en SQL (LEAST contra cupoTotal), igual que
            // registerPurchasePayment/undoPurchasePayment: un read-modify-write
            // en JS perdería incrementos concurrentes.
            await CreditCard.update(
                { cupoDisponible: literal(`LEAST("cupoTotal", "cupoDisponible" + ${Number(cupoARestaurar).toFixed(2)})`) },
                { where: { id: card.id } }
            );
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

    undoPurchasePayment: async (purchaseId, creditCardId, userId, isAdmin) => {
        const purchase = await findOwnedPurchase(purchaseId, creditCardId, userId, isAdmin);
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

    registerAbono: async (purchaseId, montoAbono, creditCardId, userId, isAdmin) => {
        const purchase = await findOwnedPurchase(purchaseId, creditCardId, userId, isAdmin);
        if (purchase.status === 'pagada') throw new AppError('Esta compra ya está pagada', 400);

        const monto = parseFloat(montoAbono);
        if (!monto || monto <= 0) throw new AppError('Monto de abono inválido', 400);

        const card = purchase.CreditCard;
        const valorCuota = parseFloat(purchase.valorCuotaMensual);
        const cuotasPagadas = purchase.cuotasPagadas;
        const capitalPorCuota = parseFloat(purchase.montoTotal) / purchase.numeroCuotas;
        const capitalPagado = cuotasPagadas * capitalPorCuota;
        const capitalPendiente = parseFloat(purchase.montoTotal) - capitalPagado;

        if (monto >= capitalPendiente) {
            // El abono cancela la deuda completa. Incremento atómico en SQL.
            await CreditCard.update(
                { cupoDisponible: literal(`LEAST("cupoTotal", "cupoDisponible" + ${Number(capitalPendiente).toFixed(2)})`) },
                { where: { id: card.id } }
            );

            // Si se cancela un avance por completo, su comisión queda pagada.
            if (purchase.tipo === 'avance') {
                await CreditCardPurchase.update(
                    { status: 'pagada', cuotasPagadas: 1 },
                    { where: { avanceId: purchase.id, tipo: 'comision' } }
                );
            }

            // El total realmente desembolsado es lo ya pagado en cuotas + el
            // capital pendiente (el abono evita los intereses futuros). Se
            // guarda para que "Total con intereses" y "Ya pagado" no muestren
            // el interés que ya no se cobrará.
            const totalPagado = parseFloat((cuotasPagadas * valorCuota + capitalPendiente).toFixed(2));
            const interesesPagados = Math.max(0, parseFloat((totalPagado - parseFloat(purchase.montoTotal)).toFixed(2)));
            return purchase.update({
                cuotasPagadas: purchase.numeroCuotas,
                status: 'pagada',
                totalAPagar: totalPagado,
                totalIntereses: interesesPagados,
            });
        }

        // Recalcular cuotas restantes con capital reducido
        const nuevoCapitalPendiente = capitalPendiente - monto;
        const tasaMensual = parseFloat(card.tasaInteresMensual) / 100;
        let nuevasCuotasRestantes;

        if (tasaMensual === 0) {
            nuevasCuotasRestantes = Math.ceil(nuevoCapitalPendiente / capitalPorCuota);
        } else {
            // n = -ln(1 - i*P/C) / ln(1+i)  con C = cuota original
            const arg = 1 - (tasaMensual * nuevoCapitalPendiente) / valorCuota;
            if (arg <= 0) {
                nuevasCuotasRestantes = 1;
            } else {
                nuevasCuotasRestantes = Math.ceil(-Math.log(arg) / Math.log(1 + tasaMensual));
            }
        }

        const nuevoNumeroCuotas = cuotasPagadas + nuevasCuotasRestantes;

        // Restaurar cupo por el abono. Incremento atómico en SQL.
        await CreditCard.update(
            { cupoDisponible: literal(`LEAST("cupoTotal", "cupoDisponible" + ${Number(monto).toFixed(2)})`) },
            { where: { id: card.id } }
        );

        // Mantener totalAPagar/totalIntereses alineados con el nuevo número de
        // cuotas (antes quedaban con el total original y no cuadraban con
        // "Ya pagado" + "Saldo pendiente" que pinta el detalle).
        const nuevoTotalAPagar = parseFloat((nuevoNumeroCuotas * valorCuota).toFixed(2));
        const nuevosIntereses = Math.max(0, parseFloat((nuevoTotalAPagar - parseFloat(purchase.montoTotal)).toFixed(2)));
        return purchase.update({
            numeroCuotas: nuevoNumeroCuotas,
            totalAPagar: nuevoTotalAPagar,
            totalIntereses: nuevosIntereses,
        });
    },

    // ── Próximos pagos ────────────────────────────────────────

    getUpcomingPayments: async (creditCardId, userId, isAdmin) => {
        const card = await CreditCard.findByPk(creditCardId, {
            include: [{ model: CreditCardPurchase, where: { status: 'activa' }, required: false }],
        });
        if (!card) throw new AppError('Tarjeta de crédito no encontrada', 404);
        if (!isAdmin && card.userId !== userId) {
            throw new AppError('Acceso no autorizado a tarjeta de crédito', 403);
        }

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

    getPurchaseStats: async (creditCardId, userId, isAdmin) => {
        await findOwnedCard(creditCardId, userId, isAdmin);

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