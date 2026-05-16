import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import sequelize from './db/client.js';
import userRoutes from './modules/user/user.routes.js';
import bankCreditRoutes from './modules/bankCredit/bankCredit.routes.js';
import creditCardRoutes from './modules/creditCard/creditCard.routes.js';
import subscriptionRoutes from './modules/suscription/subscription.routes.js';
import reminderRoutes from './modules/reminder/reminder.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { startReminderJob } from './jobs/reminderJob.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/bank-credits', bankCreditRoutes);
app.use('/api/credit-cards', creditCardRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/reminders', reminderRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

(async () => {
    try {
        await sequelize.sync({ alter: true });
        startReminderJob(); // ✅ iniciar cron job junto con el servidor
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (error) {
        console.error('Error al iniciar el servidor:', error);
        process.exit(1);
    }
})();