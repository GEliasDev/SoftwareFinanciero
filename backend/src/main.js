import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import bankCreditRoutes from './modules/bankCredit/bankCredit.routes.js';
import creditCardRoutes from './modules/creditCard/creditCard.routes.js';
import subscriptionRoutes from './modules/suscription/subscription.routes.js';
import reminderRoutes from './modules/reminder/reminder.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { startReminderJob } from './jobs/reminderJob.js';
import { startMoraJob } from './jobs/bankCreditMoraJob.js';

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  credentials: true,
}));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 100, // limit each IP
    standardHeaders: true,
    legacyHeaders: false,
  })
);
app.use(helmet());
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/bank-credits', bankCreditRoutes);
app.use('/api/credit-cards', creditCardRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3001;

(async () => {
    try {
        await sequelize.sync({ alter: true });
        startReminderJob();
        startMoraJob();
        app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://0.0.0.0:${PORT}`));
    } catch (error) {
        console.error('Error al iniciar el servidor:', error);
        process.exit(1);
    }
})();