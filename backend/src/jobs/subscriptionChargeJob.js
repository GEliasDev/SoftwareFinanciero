import { Op, literal } from 'sequelize';
import { Subscription } from '../modules/suscription/subscription.model.js';
import { CreditCard } from '../modules/creditCard/creditCard.model.js';
import { CreditCardPurchase } from '../modules/creditCard/creditCardPurchase.model.js';
import { toCOP } from '../utils/currency.js';
import logger from '../utils/logger.js';

const ymd = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Genera el cargo automático del ciclo vigente para las suscripciones con
 * creditCardId asignado. Idempotente: solo crea si ya llegó el día de cobro
 * de este ciclo y aún no existe un cargo (CreditCardPurchase.subscriptionId)
 * para ese periodo — igual patrón que cuotaManejoJob.js, se pone al día si
 * el servidor estuvo apagado.
 *
 * Respeta frecuencia: 'mensual' cobra cada mes en diaCobro; 'anual' solo
 * cobra una vez al año, en el mes de fechaInicio (nunca cada mes con el
 * monto anual/12 — eso cobraría 12x el valor real).
 *
 * El cargo se registra como CreditCardPurchase tipo 'compra' (no un tipo
 * nuevo) para no tener que tocar cada filtro `tipo === 'compra'` del
 * proyecto (Presupuesto, analytics, listados) — así aparece igual que
 * cualquier compra real, que es lo que es.
 */
export const generateSubscriptionCharges = async () => {
    const subs = await Subscription.findAll({
        where: { status: 'activa', creditCardId: { [Op.not]: null } },
    });
    const today = new Date();
    const day = today.getDate();
    let creados = 0;

    for (const sub of subs) {
        const cobroDay = Number(sub.diaCobro);
        if (day < cobroDay) continue; // aún no llega el día de cobro de este ciclo

        if (sub.frecuencia === 'anual') {
            const startMonth = new Date(sub.fechaInicio).getMonth();
            if (today.getMonth() !== startMonth) continue; // solo cobra en su mes aniversario
        }

        const periodStart = new Date(today.getFullYear(), today.getMonth(), cobroDay);
        const existe = await CreditCardPurchase.findOne({
            where: { subscriptionId: sub.id, fechaCompra: { [Op.gte]: ymd(periodStart) } },
        });
        if (existe) continue;

        const card = await CreditCard.findByPk(sub.creditCardId);
        if (!card || card.status !== 'activa') {
            logger.warn(`Suscripción ${sub.id}: tarjeta vinculada inactiva o inexistente, no se genera el cargo`);
            continue;
        }

        const montoCOP = parseFloat(toCOP(parseFloat(sub.monto), sub.moneda).toFixed(2));
        if (montoCOP > parseFloat(card.cupoDisponible)) {
            logger.warn(`Suscripción ${sub.id} (${sub.nombre}): cupo insuficiente en tarjeta ${card.id}, no se genera el cargo`);
            continue;
        }

        await CreditCardPurchase.create({
            descripcion: `Suscripción: ${sub.nombre}`,
            montoTotal: montoCOP,
            numeroCuotas: 1,
            valorCuotaMensual: montoCOP,
            totalAPagar: montoCOP,
            totalIntereses: 0,
            categoria: 'otros',
            tipo: 'compra',
            fechaCompra: ymd(today),
            creditCardId: card.id,
            subscriptionId: sub.id,
        });

        // Decremento atómico (mismo motivo que en registerPurchasePayment/undoPurchasePayment).
        await CreditCard.update(
            { cupoDisponible: literal(`GREATEST(0, "cupoDisponible" - ${montoCOP})`) },
            { where: { id: card.id } }
        );

        creados++;
    }

    if (creados > 0) console.log(`[SubscriptionChargeJob] ${creados} cargo(s) de suscripción generado(s)`);
    return creados;
};
