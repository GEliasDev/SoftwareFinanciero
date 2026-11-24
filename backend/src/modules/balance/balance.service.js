import { BalanceItem } from './balanceItem.model.js';
import { createSchema, updateSchema, periodoSchema } from './balance.schema.js';
import { periodoAnterior, filasCopiadas, errorDeActualizacion } from './balance.logic.js';
import { CreditCard } from '../creditCard/creditCard.model.js';
import { BankCredit } from '../bankCredit/bankCredit.model.js';
import { Subscription } from '../suscription/subscription.model.js';
import { Income } from '../income/income.model.js';
import { AppError } from '../../middlewares/appError.js';

const MODELO_ORIGEN = { tarjeta: CreditCard, credito: BankCredit, suscripcion: Subscription, ingreso: Income };

// ENUM de Postgres ordena por orden de declaración ('ingreso', 'gasto'): ingresos primero.
const ORDEN = [['tipo', 'ASC'], ['id', 'ASC']];

const findOwnedItem = async (id, userId) => {
    const item = await BalanceItem.findByPk(id);
    if (!item) throw new AppError('Fila no encontrada', 404);
    if (item.userId !== userId) throw new AppError('No autorizado', 403);
    return item;
};

export const BalanceService = {
    list: async (userId, query) => {
        const { anio, mes } = periodoSchema.parse(query);
        return BalanceItem.findAll({ where: { userId, anio, mes }, order: ORDEN });
    },

    // Crea una o varias filas (precarga de ingresos, varias tarjetas a la vez).
    // Las filas enlazadas deben apuntar a elementos del usuario; las que ya estén
    // en ese mes se omiten para no contar dos veces la misma tarjeta.
    create: async (userId, body) => {
        const { anio, mes, items } = createSchema.parse(body);

        for (const it of items) {
            if (it.origen === 'manual') continue;
            const ref = await MODELO_ORIGEN[it.origen].findByPk(it.origenId, { attributes: ['id', 'userId'] });
            if (!ref || ref.userId !== userId) throw new AppError('Elemento enlazado no encontrado', 404);
        }

        const existentes = await BalanceItem.findAll({ where: { userId, anio, mes }, attributes: ['origen', 'origenId'] });
        const ya = new Set(existentes.filter(e => e.origen !== 'manual').map(e => `${e.origen}:${e.origenId}`));
        const nuevas = items.filter(it => it.origen === 'manual' || !ya.has(`${it.origen}:${it.origenId}`));

        if (nuevas.length) await BalanceItem.bulkCreate(nuevas.map(it => ({ ...it, userId, anio, mes })));
        return BalanceItem.findAll({ where: { userId, anio, mes }, order: ORDEN });
    },

    update: async (id, userId, body) => {
        const item = await findOwnedItem(id, userId);
        const cambios = updateSchema.parse(body);
        const error = errorDeActualizacion(item, cambios);
        if (error) throw new AppError(error, 400);
        return item.update(cambios);
    },

    delete: async (id, userId) => {
        const item = await findOwnedItem(id, userId);
        await item.destroy();
    },

    // Copia las filas del mes anterior en un mes que todavía está vacío.
    copiarAnterior: async (userId, body) => {
        const destino = periodoSchema.parse(body);
        const yaHay = await BalanceItem.count({ where: { userId, ...destino } });
        if (yaHay) throw new AppError('Este mes ya tiene movimientos', 409);

        const origen = await BalanceItem.findAll({ where: { userId, ...periodoAnterior(destino) }, order: ORDEN });
        if (!origen.length) throw new AppError('El mes anterior no tiene movimientos para copiar', 404);

        const extras = await Income.findAll({ where: { userId, tipo: 'extra' }, attributes: ['id'] });
        const filas = filasCopiadas(origen.map(o => o.get({ plain: true })), destino, new Set(extras.map(e => e.id)));
        if (filas.length) await BalanceItem.bulkCreate(filas);
        return BalanceItem.findAll({ where: { userId, ...destino }, order: ORDEN });
    },
};
