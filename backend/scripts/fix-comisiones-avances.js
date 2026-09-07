// Reconciliación de comisiones de avance (bug histórico 2026-09-07).
//
// Antes del fix, al pagar el extracto ("Pagar este corte") la comisión de un
// avance NO se pagaba (quedaba status 'activa' como saldo pendiente fantasma)
// y, además, la comisión descontaba cupoDisponible aunque es cupo-neutral.
//
// Este script, idempotente:
//   1. Marca como pagada la comisión de cada avance que ya pagó su PRIMERA
//      cuota (cuotasPagadas >= 1) o está completamente pagado — así, si ya
//      pagaste el avance, su comisión deja de figurar como pendiente.
//   2. Recalcula cupoDisponible desde las compras activas (fuente de verdad),
//      excluyendo comisiones y cuota_manejo (cupo-neutral).
//
// Uso:
//   node scripts/fix-comisiones-avances.js          → dry-run (solo muestra)
//   node scripts/fix-comisiones-avances.js --apply  → aplica los cambios
import dotenv from 'dotenv';
dotenv.config();
import sequelize from '../src/db/client.js';
import { CreditCard } from '../src/modules/creditCard/creditCard.model.js';
import { CreditCardPurchase } from '../src/modules/creditCard/creditCardPurchase.model.js';

const APPLY = process.argv.includes('--apply');

// 1) Pagar comisiones de avances que ya tienen su primera cuota pagada
const avances = await CreditCardPurchase.findAll({
  where: { tipo: 'avance' },
});

let comisionesMarcadas = 0;
for (const avance of avances) {
  const pagoPrimera = Number(avance.cuotasPagadas) >= 1 || avance.status === 'pagada';
  if (!pagoPrimera) continue;

  const [affected] = await CreditCardPurchase.update(
    { status: 'pagada', cuotasPagadas: 1 },
    {
      where: { avanceId: avance.id, tipo: 'comision', status: 'activa' },
      returning: true,
    }
  );
  if (affected > 0) {
    comisionesMarcadas += affected;
    console.log(`Avance ${avance.id} (card ${avance.creditCardId}): comisión marcada como pagada.`);
  }
}

// 2) Recalcular cupoDisponible excluyendo cupo-neutral (comision, cuota_manejo)
const cards = await CreditCard.findAll({ include: [CreditCardPurchase] });
let changed = 0;

for (const card of cards) {
  const purchases = card.CreditCardPurchases || [];
  let capitalPendiente = 0;
  for (const p of purchases) {
    // Cuota de manejo y comisiones son cupo-neutral (nunca ocupan cupo).
    if (p.tipo === 'cuota_manejo' || p.tipo === 'comision') continue;
    if (p.status === 'pagada') continue;
    const restantes = Number(p.numeroCuotas) - Number(p.cuotasPagadas);
    if (restantes <= 0) continue;
    capitalPendiente += restantes * (parseFloat(p.montoTotal) / Number(p.numeroCuotas));
  }
  const cupoTotal = parseFloat(card.cupoTotal);
  const esperado = Math.max(0, Math.min(cupoTotal, cupoTotal - capitalPendiente));
  const actual = parseFloat(card.cupoDisponible);
  if (Math.abs(esperado - actual) > 0.01) {
    changed++;
    console.log(`Card ${card.id} "${card.nombre}" (user ${card.userId}): cupoDisponible ${actual.toFixed(2)} → ${esperado.toFixed(2)} (dif ${(esperado - actual).toFixed(2)})`);
    if (APPLY) await card.update({ cupoDisponible: esperado.toFixed(2) });
  }
}

console.log(
  comisionesMarcadas > 0 || changed > 0
    ? `${comisionesMarcadas} comisión(es) ${APPLY ? 'pagada(s)' : 'a pagar'} · ${changed} tarjeta(s) ${APPLY ? 'corregida(s)' : 'con diferencia (dry-run, usa --apply para corregir)'}`
    : 'Todo consistente: sin comisiones pendientes a pagar ni cupos con diferencia.'
);
await sequelize.close();
