// Config de sequelize-cli (herramienta CJS) — separado de db/client.js (ESM,
// usado por la app en tiempo de ejecución). Misma fuente de verdad: las
// variables de entorno del .env. isLocal replica la lógica de client.js para
// no exigir SSL contra Postgres local.
require('dotenv').config();

const isLocal = process.env.DB_HOST === 'localhost' || process.env.DB_HOST === '127.0.0.1';

const base = {
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'postgres',
  dialectOptions: isLocal ? {} : { ssl: { require: true, rejectUnauthorized: false } },
};

module.exports = {
  development: base,
  test: base,
  production: base,
};
