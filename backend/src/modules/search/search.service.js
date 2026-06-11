import { Op } from 'sequelize';
import { Subscription } from '../suscription/subscription.model.js';
import { BankCredit } from '../bankCredit/bankCredit.model.js';
import { CreditCard } from '../creditCard/creditCard.model.js';
import { Income } from '../income/income.model.js';
import { PersonalDebt } from '../personalDebt/personalDebt.model.js';
import { SavingsGoal } from '../savingsGoal/savingsGoal.model.js';

const like = (q) => ({ [Op.iLike]: `%${q}%` });

export const SearchService = {
    search: async (userId, q) => {
        if (!q || q.trim().length < 2) return [];

        const [subs, credits, cards, incomes, debts, savings] = await Promise.all([
            Subscription.findAll({ where: { userId, nombre: like(q) }, limit: 5 }),
            BankCredit.findAll({ where: { userId, nombre: like(q) }, limit: 5 }),
            CreditCard.findAll({ where: { userId, nombre: like(q) }, limit: 5 }),
            Income.findAll({ where: { userId, nombre: like(q) }, limit: 5 }),
            PersonalDebt.findAll({ where: { userId, nombre: like(q) }, limit: 5 }),
            SavingsGoal.findAll({ where: { userId, nombre: like(q) }, limit: 5 }),
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

        debts.forEach(d => results.push({
            type: 'personal_debt', id: d.id,
            name: d.nombre,
            meta: `Obligación personal · ${d.status}`,
            route: `/personal-debts/${d.id}`,
        }));

        savings.forEach(g => results.push({
            type: 'savings_goal', id: g.id,
            name: g.nombre,
            meta: `Meta de ahorro · ${g.status}`,
            route: `/savings/${g.id}`,
        }));

        return results.slice(0, 12);
    },
};
