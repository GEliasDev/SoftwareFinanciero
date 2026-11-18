import { Op } from 'sequelize';
import { Subscription } from '../suscription/subscription.model.js';
import { BankCredit } from '../bankCredit/bankCredit.model.js';
import { CreditCard } from '../creditCard/creditCard.model.js';
import { Income } from '../income/income.model.js';

// Escapa los comodines de LIKE: sin esto, buscar "%" o "_" los interpretaba
// como patrón y devolvía TODO (o coincidencias raras) en vez de buscar el
// carácter literal. (Sequelize ya parametriza el valor: no hay inyección SQL.)
const escapeLike = (s) => String(s).replace(/[\\%_]/g, m => `\\${m}`);
const like = (q) => ({ [Op.iLike]: `%${escapeLike(q)}%` });

export const SearchService = {
    search: async (userId, q) => {
        if (!q || q.trim().length < 2) return [];

        const [subs, credits, cards, incomes] = await Promise.all([
            Subscription.findAll({ where: { userId, nombre: like(q) }, limit: 5 }),
            BankCredit.findAll({ where: { userId, nombre: like(q) }, limit: 5 }),
            CreditCard.findAll({ where: { userId, nombre: like(q) }, limit: 5 }),
            Income.findAll({ where: { userId, nombre: like(q) }, limit: 5 }),
        ]);

        const results = [];

        subs.forEach(s => results.push({
            type: 'subscription', id: s.id,
            name: s.nombre,
            meta: `Suscripción · ${s.status}`,
            route: `/subscriptions/${s.id}`,
        }));

        credits.forEach(c => results.push({
            type: 'bank_credit', id: c.id,
            name: c.nombre,
            meta: `Crédito bancario · ${c.status}`,
            route: `/bank-credits/${c.id}`,
        }));

        cards.forEach(c => results.push({
            type: 'credit_card', id: c.id,
            name: c.nombre,
            meta: `Tarjeta de crédito · ${c.status}`,
            route: `/credit-cards/${c.id}`,
        }));

        incomes.forEach(i => results.push({
            type: 'income', id: i.id,
            name: i.nombre,
            meta: `Ingreso · ${i.tipo || 'fijo'}`,
            route: `/income`,
        }));

        return results.slice(0, 12);
    },
};
