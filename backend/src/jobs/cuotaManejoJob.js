import { Op } from 'sequelize';
import { CreditCard } from '../modules/creditCard/creditCard.model.js';
import { CreditCardPurchase } from '../modules/creditCard/creditCardPurchase.model.js';

const ymd = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Genera el cargo de cuota de manejo del ciclo vigente para las tarjetas que la
 * cobran. Idempotente: solo crea si ya llegó el corte de este mes y aún no existe
 * un cargo cuota_manejo en este ciclo. Se pone al día si el servidor estuvo apagado.
 * La cuota de manejo es cupo-neutral: NO descuenta cupoDisponible.
 */
export const generateCuotaManejoCharges = async () => {
    const cards = await CreditCard.findAll({ where: { status: 'activa' } });
    const today = new Date();
    const day = today.getDate();
    let creados = 0;

    for (const card of cards) {
        const cuota = parseFloat(card.cuotaManejo ?? 0);
        const cutDay = Number(card.fechaCorte);
        if (cuota <= 0) continue;
        if (day < cutDay) continue; // aún no llega el corte de este mes

        const lastCut = new Date(today.getFullYear(), today.getMonth(), cutDay);
        const existe = await CreditCardPurchase.findOne({
            where: {
                creditCardId: card.id,
                tipo: 'cuota_manejo',
                fechaCompra: { [Op.gte]: ymd(lastCut) },
            },
        });
        if (existe) continue;

        await CreditCardPurchase.create({
            descripcion: 'Cuota de manejo',
            montoTotal: cuota,
            numeroCuotas: 1,
            valorCuotaMensual: cuota,
            totalAPagar: cuota,
            totalIntereses: 0,
            categoria: 'otros',
            tipo: 'cuota_manejo',
            fechaCompra: ymd(today),
            creditCardId: card.id,
        });
        creados++;
    }

    if (creados > 0) console.log(`[CuotaManejoJob] ${creados} cuota(s) de manejo generada(s)`);
    return creados;
};
