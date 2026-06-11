import cron from 'node-cron';
import { User } from '../modules/user/user.model.js';
import { AnalyticsService } from '../modules/analytics/analytics.service.js';
import { emailService } from '../utils/emailService.js';
import logger from '../utils/logger.js';

const sendDigestForUser = async (user) => {
  try {
    const summary = await AnalyticsService.getSummary(user.id);
    const proximosRecordatorios = (summary.upcoming || [])
      .slice(0, 7)
      .map(u => ({
        titulo: u.name,
        fecha: new Date(u.date + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }),
      }));

    await emailService.sendWeeklyDigest({
      to: user.email,
      nombre: user.primerNombre,
      dineroLibre: summary.dineroLibre,
      totalIngresos: summary.income.total,
      obligacionesMensuales: summary.obligations.total,
      proximosRecordatorios,
    });
  } catch (err) {
    logger.error(`[weeklyDigestJob] Error for user ${user.id}: ${err.message}`);
  }
};

export const startWeeklyDigestJob = () => {
  // Every Monday at 8:00 AM server time
  cron.schedule('0 8 * * 1', async () => {
    logger.info('[weeklyDigestJob] Starting weekly digest run');
    try {
      const users = await User.findAll({ where: { emailDigest: true } });
      logger.info(`[weeklyDigestJob] Sending to ${users.length} user(s)`);
      for (const user of users) {
        await sendDigestForUser(user);
      }
      logger.info('[weeklyDigestJob] Weekly digest run complete');
    } catch (err) {
      logger.error(`[weeklyDigestJob] Fatal error: ${err.message}`);
    }
  });
  logger.info('[weeklyDigestJob] Scheduled (Mondays at 08:00)');
};
