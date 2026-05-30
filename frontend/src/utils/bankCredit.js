import { nextOccurrence } from './format';

/**
 * Reconstruye la tabla de amortización francesa completa de un crédito y
 * devuelve, además, las cuotas restantes con su fecha estimada de pago.
 *
 * Cada fila: { k, interes, capital, saldo, valorCuota, admin, totalMes }
 * `remaining` añade `date` (Date) a cada cuota pendiente.
 *
 * Todo se deriva de los datos del crédito; no requiere endpoints nuevos.
 */
export const buildLoanSchedule = (credit) => {
  if (!credit) return { rows: [], remaining: [] };

  const i      = (parseFloat(credit.tasaMensual) || 0) / 100;
  const cuota  = parseFloat(credit.valorCuota) || 0;
  const admin  = parseFloat(credit.cuotaAdministracion) || 0;
  const n      = Number(credit.numeroCuotas) || 0;
  const pagadas = Number(credit.cuotasPagadas) || 0;

  let saldo = parseFloat(credit.montoTotal) || 0;
  const rows = [];
  for (let k = 1; k <= n; k++) {
    const interes = saldo * i;
    let capital = cuota - interes;
    if (k === n) capital = saldo;            // ajuste de redondeo en la última cuota
    capital = Math.min(capital, saldo);
    saldo = Math.max(0, saldo - capital);
    rows.push({
      k,
      interes: Math.max(0, interes),
      capital: Math.max(0, capital),
      saldo,
      valorCuota: cuota,
      admin,
      totalMes: cuota + admin,
    });
  }

  // Cuotas pendientes con fecha estimada (día de pago, mes a mes desde la próxima).
  const base = nextOccurrence(credit.diaPago);
  const remaining = rows
    .filter(r => r.k > pagadas)
    .map((r, j) => ({ ...r, date: new Date(base.getFullYear(), base.getMonth() + j, base.getDate()) }));

  return { rows, remaining };
};
