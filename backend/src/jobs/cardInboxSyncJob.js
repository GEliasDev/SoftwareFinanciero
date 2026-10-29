import cron from 'node-cron';
import { CardInboxService } from '../modules/cardInbox/cardInbox.service.js';
import logger from '../utils/logger.js';

export const startCardInboxSyncJob = () => {
  // Cada 15 minutos lee las alertas nuevas de las tarjetas (Gmail) de cada
  // usuario con Gmail conectado y las deja como movimientos pendientes.
  cron.schedule('*/15 * * * *', async () => {
    try {
      await CardInboxService.syncAll();
    } catch (err) {
      logger.error(`[cardInboxSyncJob] Error general: ${err.message}`);
    }
  });
  logger.info('[cardInboxSyncJob] Programado (cada 15 min)');
};
