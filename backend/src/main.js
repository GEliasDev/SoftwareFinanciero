import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import sequelize from './db/client.js';
import userRoutes from './modules/user/user.routes.js';
import bankCreditRoutes from './modules/bankCredit/bankCredit.routes.js';
import creditCardRoutes from './modules/creditCard/creditCard.routes.js';
import subscriptionRoutes from './modules/suscription/subscription.routes.js';
import reminderRoutes from './modules/reminder/reminder.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import incomeRoutes from './modules/income/income.routes.js';
import personalDebtRoutes from './modules/personalDebt/personalDebt.routes.js';
import savingsGoalRoutes from './modules/savingsGoal/savingsGoal.routes.js';
import searchRoutes from './modules/search/search.routes.js';
import activityLogRoutes from './modules/activityLog/activityLog.routes.js';
import pushSubscriptionRoutes from './modules/pushSubscription/pushSubscription.routes.js';
import budgetRoutes from './modules/budget/budget.routes.js';
import netWorthRoutes from './modules/netWorth/netWorth.routes.js';
import './modules/budget/budget.model.js';
import './modules/personalDebt/personalDebtAbono.model.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { startReminderJob } from './jobs/reminderJob.js';
import { startMoraJob } from './jobs/bankCreditMoraJob.js';
import { startWeeklyDigestJob } from './jobs/weeklyDigestJob.js';
import { startNetWorthSnapshotJob } from './jobs/netWorthSnapshotJob.js';

const app = express();

const DEFAULT_ORIGINS = [
  'http://localhost:5174',
  'http://localhost:3000',
  'capacitor://localhost',  // Capacitor Android/iOS
  'http://localhost',       // Capacitor Android (WebView)
];

app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : DEFAULT_ORIGINS,
  credentials: true,
}));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    // En desarrollo React StrictMode dispara efectos dos veces; límite generoso para uso personal
    max: process.env.NODE_ENV === 'production' ? 300 : 2000,
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
app.use('/api/income', incomeRoutes);
app.use('/api/personal-debts', personalDebtRoutes);
app.use('/api/savings', savingsGoalRoutes);
app.use('/api/search',       searchRoutes);
app.use('/api/activity-log', activityLogRoutes);
app.use('/api/push',        pushSubscriptionRoutes);
app.use('/api/budget',      budgetRoutes);
app.use('/api/net-worth',   netWorthRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3001;

(async () => {
    try {
        // sync() SIN alter: crea tablas que falten (BD nueva/vacía) pero nunca
        // toca una tabla que ya existe. `alter` se retiró porque Sequelize no
        // siempre detecta un UNIQUE constraint ya existente y crea uno nuevo en
        // cada arranque — encontramos 298 duplicados en users.email y 52 en
        // push_subscriptions.endpoint (2026-07-10, ya limpiados). Los cambios a
        // tablas existentes ahora van por migraciones versionadas en
        // backend/src/db/migrations/ (`npx sequelize-cli db:migrate`).
        await sequelize.sync();
        startReminderJob();
        startMoraJob();
        startWeeklyDigestJob();
        startNetWorthSnapshotJob();
        app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://0.0.0.0:${PORT}`));
    } catch (error) {
        console.error('Error al iniciar el servidor:', error);
        process.exit(1);
    }
})();