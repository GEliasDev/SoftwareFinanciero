'use strict';

/** @type {import('sequelize-cli').Migration} */
// Elimina las tablas de los módulos removidos (recordatorios y actividad).
// `sequelize.sync()` no dropea tablas huérfanas, por eso van por migración.
// Los datos se pierden a propósito: el feature completo fue eliminado del
// producto (backend + frontend) y estas tablas quedaron como restos.
module.exports = {
  async up(queryInterface) {
    await queryInterface.dropTable('activity_logs');
    await queryInterface.dropTable('reminders');
  },

  // DROP irreversible: no se recrean las tablas (esquema eliminado con los módulos).
  async down() {
    // no-op
  },
};