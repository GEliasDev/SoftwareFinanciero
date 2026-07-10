'use strict';

/**
 * Migración de referencia (no-op intencional).
 *
 * El esquema hasta esta fecha (2026-07-10) fue creado y mantenido por
 * `sequelize.sync({ alter: true })` en cada arranque del backend — ver
 * definiciones reales en `backend/src/modules/*\/*.model.js`.
 *
 * A partir de aquí, `main.js` deja de usar `alter` (evitaba detectar
 * constraints ya existentes y los duplicaba en cada arranque — encontramos
 * 298 UNIQUE duplicados en `users.email` y 52 en `push_subscriptions.endpoint`
 * el 2026-07-10, ya limpiados). `sync()` sin `alter` sigue creando tablas
 * nuevas en una BD vacía, pero cualquier cambio a una tabla EXISTENTE debe
 * ir en una migración nueva (`npx sequelize-cli migration:generate --name X`).
 *
 * Este archivo solo existe para que `SequelizeMeta` tenga una fila de
 * referencia; up/down no hacen nada porque el esquema ya existe.
 */

module.exports = {
  async up() {},
  async down() {},
};
