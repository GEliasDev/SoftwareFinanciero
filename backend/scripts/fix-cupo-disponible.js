// Repara cupoDisponible recalculándolo desde las compras (fuente de verdad).
// Necesario tras el bug de carrera en "Pagar corte" (pagos paralelos perdían
// incrementos de cupo). Idempotente. Uso:
//   node scripts/fix-cupo-disponible.js          → dry-run (solo muestra)
//   node scripts/fix-cupo-disponible.js --apply  → aplica los cambios
import dotenv from 'dotenv';
dotenv.config();
import sequelize from '../src/db/client.js';
import { CreditCard } from '../src/modules/creditCard/creditCard.model.js';
import { CreditCardPurchase } from '../src/modules/creditCard/creditCardPurchase.model.js';

const APPLY = process.argv.includes('--apply');

const cards = await CreditCard.findAll({ include: [CreditCardPurchase] });
let changed = 0;

for (const card of cards) {
  const purchases = card.CreditCardPurchases || [];
  let capitalPendiente = 0;
  for (const p of purchases) {
    // La cuota de manejo es cupo-neutral (nunca ocupa cupo).
    if (p.tipo === 'cuota_manejo') continue;
    if (p.status === 'pagada') continue;
    const restantes = p.numeroCuotas - p.cuotasPagadas;
    if (restantes <= 0) continue;
    capitalPendiente += restantes * (parseFloat(p.montoTotal) / p.numeroCuotas);
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

console.log(changed === 0
  ? 'Todos los cupos ya son consistentes.'
  : `${changed} tarjeta(s) ${APPLY ? 'corregida(s)' : 'con diferencia (dry-run, usa --apply para corregir)'}`);
await sequelize.close();
