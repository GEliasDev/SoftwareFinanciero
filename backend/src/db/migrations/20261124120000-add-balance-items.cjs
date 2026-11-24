'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('balance_items', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
      anio: { type: Sequelize.INTEGER, allowNull: false },
      mes: { type: Sequelize.INTEGER, allowNull: false },
      tipo: { type: Sequelize.ENUM('ingreso', 'gasto'), allowNull: false },
      descripcion: { type: Sequelize.STRING(100), allowNull: false },
      categoria: { type: Sequelize.STRING(40), allowNull: false },
      monto: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      estado: { type: Sequelize.ENUM('pendiente', 'comprometido', 'pagado', 'recibido'), allowNull: false, defaultValue: 'pendiente' },
      origen: { type: Sequelize.ENUM('manual', 'tarjeta', 'credito', 'suscripcion', 'ingreso'), allowNull: false, defaultValue: 'manual' },
      origenId: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    // IF NOT EXISTS: si el backend arrancó antes, sync() ya creó tabla e índice (mismo nombre).
    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS "balance_items_user_id_anio_mes" ON "balance_items" ("userId", "anio", "mes");'
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('balance_items');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_balance_items_tipo";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_balance_items_estado";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_balance_items_origen";');
  },
};
