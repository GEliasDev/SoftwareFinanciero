import cron from 'node-cron';
import { User } from '../modules/user/user.model.js';
import { NetWorthService } from '../modules/netWorth/netWorth.service.js';
import logger from '../utils/logger.js';

export const startNetWorthSnapshotJob = () => {
  // Día 1 de cada mes, 1:00 AM: congela el patrimonio neto del mes que
  // acaba de cerrar para todos los usuarios (histórico de Reportes).
  cron.schedule('0 1 1 * *', async () => {
    logger.info('[netWorthSnapshotJob] Iniciando snapshot mensual');
    try {
      const users = await User.findAll();
      const prevMonth = new Date();
      prevMonth.setDate(1);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      const mes = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

      for (const user of users) {
        try {
          await NetWorthService.snapshotMonth(user.id, mes);
        } catch (err) {
          logger.error(`[netWorthSnapshotJob] Usuario ${user.id}: ${err.message}`);
        }
      }
      logger.info(`[netWorthSnapshotJob] Snapshot de ${mes} completo para ${users.length} usuario(s)`);
    } catch (err) {
      logger.error(`[netWorthSnapshotJob] Error general: ${err.message}`);
    }
  });
  logger.info('[netWorthSnapshotJob] Programado (día 1 de cada mes, 01:00)');
};
