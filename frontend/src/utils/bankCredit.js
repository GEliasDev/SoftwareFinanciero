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

  // El backend persiste tasaMensual como FRACCIÓN (tasaInteres/100): 1,62% llega como 0.0162.
  // No volver a dividir entre 100 (bug histórico: interés ~100× menor en el plan de pagos).
  const i      = parseFloat(credit.tasaMensual) || 0;
  const seguro = parseFloat(credit.seguro) || 0;
  const admin  = parseFloat(credit.cuotaAdministracion) || 0;
  const n      = Number(credit.numeroCuotas) || 0;
  const pagadas = Number(credit.cuotasPagadas) || 0;

  // valorCuota ya incluye admin + seguro; la cuota base de capital+interés es:
  const cargosAdicionales = admin + seguro;
  const cuotaBaseCapital  = (parseFloat(credit.valorCuota) || 0) - cargosAdicionales;

  let saldo = parseFloat(credit.montoTotal) || 0;
  const rows = [];
  for (let k = 1; k <= n; k++) {
    const interes = saldo * i;
    let capital = cuotaBaseCapital - interes;
    if (k === n) capital = saldo;
    capital = Math.min(capital, saldo);
    saldo = Math.max(0, saldo - capital);
    rows.push({
      k,
      interes: Math.max(0, interes),
      capital: Math.max(0, capital),
      saldo,
      valorCuota: cuotaBaseCapital,
      admin,
      seguro,
      totalMes: cuotaBaseCapital + admin + seguro,
    });
  }

  // Cuotas pendientes con fecha estimada (día de pago, mes a mes desde la próxima).
  const base = nextOccurrence(credit.diaPago);
  const remaining = rows
    .filter(r => r.k > pagadas)
    .map((r, j) => ({ ...r, date: new Date(base.getFullYear(), base.getMonth() + j, base.getDate()) }));

  return { rows, remaining };
};
