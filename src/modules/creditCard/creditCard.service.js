import { CreditCard } from './creditCard.model.js';
import { CreditCardPurchase } from './creditCardPurchase.model.js';
import { creditCardCreateSchema, creditCardUpdateSchema, purchaseCreateSchema } from './creditCard.schema.js';
import { calcularCuotaCompra, calcularPagoMinimo } from './utils/creditCardCalculation.js';
import { AppError } from '../../middlewares/AppError.js';

export const CreditCardService = {
    // ── Tarjeta ──────────────────────────────────────────────

    createCreditCard: async (data) => {
        const parsed = creditCardCreateSchema.parse(data);
        return CreditCard.create({
            ...parsed,
            cupoDisponible: parsed.cupoTotal, // al crear, el cupo disponible es el total
            userId: data.userId,
        });
    },

    getAllCreditCards: async (userId) => {
        return CreditCard.findAll({
            where: { userId },
            include: [{ model: CreditCardPurchase, where: { status: 'activa' }, required: false }],
        });
    },

    getCreditCardById: async (id) => {
        const card = await CreditCard.findByPk(id, {
            include: [{ model: CreditCardPurchase }],
        });
        if (!card) throw new AppError('Tarjeta de crédito no encontrada', 404);
        return card;
    },

    updateCreditCard: async (id, data) => {
        const card = await CreditCard.findByPk(id);
        if (!card) throw new AppError('Tarjeta de crédito no encontrada', 404);
        const parsed = creditCardUpdateSchema.parse(data);
        return card.update(parsed);
    },

    deleteCreditCard: async (id) => {
        const card = await CreditCard.findByPk(id);
        if (!card) throw new AppError('Tarjeta de crédito no encontrada', 404);
        return card.destroy();
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

    createPurchase: async (creditCardId, data) => {
        const card = await CreditCard.findByPk(creditCardId);
        if (!card) throw new AppError('Tarjeta de crédito no encontrada', 404);
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

        return CreditCardPurchase.create({
            ...parsed,
            ...calculos,
            creditCardId,
        });
    },

    getPurchasesByCard: async (creditCardId) => {
        return CreditCardPurchase.findAll({ where: { creditCardId } });
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

        // Restaurar cupo disponible por el valor de la cuota pagada
        const card = purchase.CreditCard;
        const nuevoCupo = parseFloat(
            (parseFloat(card.cupoDisponible) + parseFloat(purchase.valorCuotaMensual)).toFixed(2)
        );

        await card.update({ cupoDisponible: Math.min(nuevoCupo, parseFloat(card.cupoTotal)) });

        return purchase.update({
            cuotasPagadas: nuevasCuotasPagadas,
            status: pagada ? 'pagada' : 'activa',
        });
    },

    deletePurchase: async (purchaseId) => {
        const purchase = await CreditCardPurchase.findByPk(purchaseId, {
            include: [CreditCard],
        });
        if (!purchase) throw new AppError('Compra no encontrada', 404);

        // Restaurar cupo si la compra aún tiene saldo pendiente
        const cuotasRestantes = purchase.numeroCuotas - purchase.cuotasPagadas;
        if (cuotasRestantes > 0) {
            const card = purchase.CreditCard;
            const montoRestante = cuotasRestantes * parseFloat(purchase.valorCuotaMensual);
            const nuevoCupo = parseFloat(
                (parseFloat(card.cupoDisponible) + montoRestante).toFixed(2)
            );
            await card.update({ cupoDisponible: Math.min(nuevoCupo, parseFloat(card.cupoTotal)) });
        }

        return purchase.destroy();
    },
};