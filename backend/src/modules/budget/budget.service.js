import { Op } from 'sequelize';
import { Budget, BudgetExpense } from './budget.model.js';
import { budgetCategorySchema, budgetExpenseSchema } from './budget.schema.js';
import { AppError } from '../../middlewares/appError.js';
import { CreditCard } from '../creditCard/creditCard.model.js';
import { CreditCardPurchase } from '../creditCard/creditCardPurchase.model.js';
import { PersonalDebt } from '../personalDebt/personalDebt.model.js';

// Mes local 'YYYY-MM'. NUNCA toISOString() — mismo gotcha de siempre (UTC-5
// corre el mes después de ~7pm).
const currentMes = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const BudgetService = {
    getMonth: async (userId, mes) => {
        const [year, month] = mes.split('-').map(Number);
        const desde = `${mes}-01`;
        // Día 0 del mes siguiente = último día de este mes (evita el problema
        // de meses de 28/30/31 días).
        const hasta = new Date(year, month, 0).toISOString().slice(0, 10);

        const [categories, expenses, purchases, gastosRecurrentes] = await Promise.all([
            Budget.findAll({ where: { userId, mes }, order: [['categoria', 'ASC']] }),
            BudgetExpense.findAll({ where: { userId, mes }, order: [['fecha', 'DESC']] }),
            // Compras de tarjeta del mes por categoría: el gasto real ya se
            // registra al comprar (con su propia categoría) — antes Presupuesto
            // exigía anotarlo otra vez a mano en BudgetExpense y, en la
            // práctica, nunca se usaba (quedaba "Sin categorías" para siempre).
            // Se cuenta el monto total de la compra en el mes de la compra
            // (no por cuota): el gasto ocurrió una vez, al comprar, aunque se
            // pague en cuotas después — es "cuánto gasté" en la categoría, no
            // "cuánto debo". Se excluyen avance/comisión/cuota_manejo por la
            // misma razón que nunca tocan el cupo (no son gasto discrecional).
            CreditCardPurchase.findAll({
                where: {
                    tipo: 'compra',
                    fechaCompra: { [Op.between]: [desde, hasta] },
                },
                include: [{ model: CreditCard, where: { userId }, attributes: [] }],
                attributes: ['categoria', 'montoTotal'],
            }),
            // Gastos personales recurrentes (arriendo, mercado…) con categoría.
            // PersonalDebt no registra desde/hasta cuándo estuvo activo un mes
            // dado (a diferencia de las compras, que sí tienen fechaCompra), así
            // que solo se suman al mes REAL en curso — nunca a meses pasados o
            // futuros que el usuario esté navegando — para no atribuir gasto de
            // hoy a un enero de hace tres años.
            mes === currentMes()
                ? PersonalDebt.findAll({
                    where: { userId, tipo: 'gasto', status: 'activo', categoria: { [Op.not]: null } },
                    attributes: ['categoria', 'montoCuota'],
                })
                : [],
        ]);

        const gastadoPorCategoria = {};
        for (const e of expenses) {
            gastadoPorCategoria[e.categoria] = (gastadoPorCategoria[e.categoria] || 0) + parseFloat(e.monto);
        }
        for (const p of purchases) {
            gastadoPorCategoria[p.categoria] = (gastadoPorCategoria[p.categoria] || 0) + parseFloat(p.montoTotal);
        }
        for (const g of gastosRecurrentes) {
            gastadoPorCategoria[g.categoria] = (gastadoPorCategoria[g.categoria] || 0) + parseFloat(g.montoCuota);
        }

        // Categorías con gasto real (compras/gastos) que el usuario nunca
        // presupuestó explícitamente — se muestran aparte, sin inventarles un
        // límite, para que decida si quiere convertirlas en categoría real.
        const categoriasConPresupuesto = new Set(categories.map(c => c.categoria));
        const sinPresupuestar = Object.entries(gastadoPorCategoria)
            .filter(([categoria]) => !categoriasConPresupuesto.has(categoria))
            .map(([categoria, gastado]) => ({ categoria, gastado }));

        return {
            mes,
            categories: categories.map(c => ({
                id: c.id,
                categoria: c.categoria,
                limite: parseFloat(c.limite),
                gastado: gastadoPorCategoria[c.categoria] || 0,
                color: c.color,
            })),
            sinPresupuestar,
            expenses,
        };
    },

    upsertCategory: async (userId, data) => {
        const parsed = budgetCategorySchema.parse(data);
        const existing = await Budget.findOne({ where: { userId, mes: parsed.mes, categoria: parsed.categoria } });
        if (existing) {
            await existing.update({ limite: parsed.limite, color: parsed.color ?? existing.color });
            return existing;
        }
        return Budget.create({ userId, ...parsed });
    },

    deleteCategory: async (userId, id) => {
        const cat = await Budget.findByPk(id);
        if (!cat) throw new AppError('Categoría no encontrada', 404);
        if (cat.userId !== userId) throw new AppError('No autorizado', 403);
        // Also delete expenses for that category/month
        await BudgetExpense.destroy({ where: { userId, mes: cat.mes, categoria: cat.categoria } });
        await cat.destroy();
    },

    addExpense: async (userId, data) => {
        const parsed = budgetExpenseSchema.parse(data);
        return BudgetExpense.create({ userId, ...parsed });
    },

    deleteExpense: async (userId, id) => {
        const exp = await BudgetExpense.findByPk(id);
        if (!exp) throw new AppError('Gasto no encontrado', 404);
        if (exp.userId !== userId) throw new AppError('No autorizado', 403);
        await exp.destroy();
    },

    getAvailableMonths: async (userId) => {
        const rows = await Budget.findAll({
            where: { userId },
            attributes: ['mes'],
            group: ['mes'],
            order: [['mes', 'DESC']],
        });
        return rows.map(r => r.mes);
    },
};
