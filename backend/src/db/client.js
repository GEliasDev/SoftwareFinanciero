import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

const isLocal = process.env.DB_HOST === 'localhost' || process.env.DB_HOST === '127.0.0.1';

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false,
    ...(isLocal ? {} : {
        dialectOptions: {
            ssl: { require: true, rejectUnauthorized: false },
        },
    }),
});

export default sequelize;
