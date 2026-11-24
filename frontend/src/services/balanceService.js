import api from './api';
import { CreditCardService } from './creditCardService';
import { BankCreditService } from './bankCreditService';
import { SubscriptionService } from './subscriptionService';
import { IncomeService } from './incomeService';
import { filasConValor, resumenBalance, gastosPorOrigen } from '../utils/balance';

// Tarjetas con TODAS sus compras (también las pagadas), como la pestaña
// Extracto: `getAll` solo trae las activas y un extracto pagado salía en $0.
const cardsConCompras = () => CreditCardService.getAll().then(cards => Promise.all(cards.map(c =>
  CreditCardService.getPurchases(c.id).then(CreditCardPurchases => ({ ...c, CreditCardPurchases }))
)));

const valor = (r) => (r.status === 'fulfilled' ? r.value : []);

export const BalanceService = {
  list:           async (anio, mes)        => (await api.get('/balance', { params: { anio, mes } })).data,
  create:         async (anio, mes, items) => (await api.post('/balance', { anio, mes, items })).data,
  update:         async (id, data)         => (await api.patch(`/balance/${id}`, data)).data,
  delete:         async (id)               => (await api.delete(`/balance/${id}`)).data,
  copiarAnterior: async (anio, mes)        => (await api.post('/balance/copiar-anterior', { anio, mes })).data,

  /** Elementos de Debti con los que se calculan los montos automáticos (`utils/balance.js`). Si uno falla, queda vacío. */
  fuentes: async () => {
    const [c, b, s, i] = await Promise.allSettled([cardsConCompras(), BankCreditService.getAll(), SubscriptionService.getAll(), IncomeService.getAll()]);
    return { cards: valor(c), credits: valor(b), subs: valor(s), incomes: valor(i) };
  },

  /**
   * Balance del mes actual ya calculado (filas con monto, resumen, gastos por
   * origen y resumen del mes anterior). null si el mes no tiene filas: entonces
   * Inicio y Reportes usan el cálculo general del backend.
   */
  mesActual: async () => {
    const hoy = new Date();
    const anio = hoy.getFullYear(), mes = hoy.getMonth() + 1;
    const prev = mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
    const [items, prevItems] = await Promise.all([
      BalanceService.list(anio, mes),
      BalanceService.list(prev.anio, prev.mes).catch(() => []),
    ]);
    if (!items.length) return null;
    const fuentes = await BalanceService.fuentes();
    const filas = filasConValor(items, fuentes);
    return {
      filas,
      r: resumenBalance(filas),
      g: gastosPorOrigen(filas),
      prev: prevItems.length ? resumenBalance(filasConValor(prevItems, fuentes)) : null,
    };
  },
};
