import express from 'express';
import sequelize from './db/client.js';
import userRoutes from './modules/user/user.routes.js';
import creditRoutes from './modules/credit/credit.routes.js';
import dotenv from 'dotenv';

const app = express();
app.use(express.json());
app.use('/users', userRoutes);
app.use('/credits', creditRoutes);

dotenv.config();

const PORT = process.env.PORT || 3000;

(async () => {
    try {
        await sequelize.sync({ alter: true });
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (error) {
        console.error('Error starting server:', error);
    }
})();
