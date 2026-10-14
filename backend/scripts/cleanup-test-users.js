// Borra los usuarios de prueba creados durante verificaciones con Playwright
// (emails con patrón pw.*@test.local) y TODOS sus datos, para que la BD real
// del usuario quede intacta. Idempotente. Uso:
//   node scripts/cleanup-test-users.js          → dry-run (solo lista)
//   node scripts/cleanup-test-users.js --apply  → borra
import dotenv from 'dotenv';
dotenv.config();
import { Op } from 'sequelize';
import sequelize from '../src/db/client.js';
import { User } from '../src/modules/user/user.model.js';
import { CreditCard } from '../src/modules/creditCard/creditCard.model.js';
import { CreditCardPurchase } from '../src/modules/creditCard/creditCardPurchase.model.js';
import { BankCredit } from '../src/modules/bankCredit/bankCredit.model.js';
import { Subscription } from '../src/modules/suscription/subscription.model.js';
import { Income } from '../src/modules/income/income.model.js';
import { PersonalDebt } from '../src/modules/personalDebt/personalDebt.model.js';
import { SavingsGoal } from '../src/modules/savingsGoal/savingsGoal.model.js';
import { Budget, BudgetExpense } from '../src/modules/budget/budget.model.js';
import { NetWorthSnapshot } from '../src/modules/netWorth/netWorth.model.js';
import { PushSubscription } from '../src/modules/pushSubscription/pushSubscription.model.js';

const APPLY = process.argv.includes('--apply');

const users = await User.findAll({ where: { email: { [Op.like]: 'pw.%@test.local' } }, order: [['id', 'ASC']] });

if (users.length === 0) {
  console.log('No hay usuarios de prueba (pw.*@test.local) que limpiar.');
  await sequelize.close();
  process.exit(0);
}

console.log(`${users.length} usuario(s) de prueba encontrado(s):`);
for (const u of users) console.log(`  #${u.id}  ${u.email}`);

if (!APPLY) {
  console.log('\nDry-run: usa --apply para borrarlos.');
  await sequelize.close();
  process.exit(0);
}

const t = await sequelize.transaction();
try {
  for (const user of users) {
    const userId = user.id;
    const cardIds = (await CreditCard.findAll({ where: { userId }, attributes: ['id'], transaction: t })).map(c => c.id);
    const numCompras = cardIds.length ? await CreditCardPurchase.count({ where: { creditCardId: { [Op.in]: cardIds } }, transaction: t }) : 0;
    const numCreditos = await BankCredit.count({ where: { userId }, transaction: t });
    const numSusc = await Subscription.count({ where: { userId }, transaction: t });

    await CreditCardPurchase.destroy({ where: { creditCardId: { [Op.in]: cardIds } }, transaction: t });
    await Subscription.destroy({ where: { userId }, transaction: t });
    await CreditCard.destroy({ where: { id: { [Op.in]: cardIds } }, transaction: t });
    await BankCredit.destroy({ where: { userId }, transaction: t });
    await Income.destroy({ where: { userId }, transaction: t });
    await PersonalDebt.destroy({ where: { userId }, transaction: t });
    await SavingsGoal.destroy({ where: { userId }, transaction: t });
    await BudgetExpense.destroy({ where: { userId }, transaction: t });
    await Budget.destroy({ where: { userId }, transaction: t });
    await NetWorthSnapshot.destroy({ where: { userId }, transaction: t });
    await PushSubscription.destroy({ where: { userId }, transaction: t });
    await user.destroy({ transaction: t });

    console.log(`  Borrado usuario #${userId} ${user.email}: ${cardIds.length} tarjeta(s), ${numCompras} compra(s), ${numCreditos} crédito(s), ${numSusc} suscripción(es)`);
  }
  await t.commit();
  console.log('\nLimpieza completada.');
} catch (err) {
  await t.rollback();
  console.error('Error, rollback aplicado:', err.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}