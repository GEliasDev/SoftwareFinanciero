'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('personal_debts', 'categoria', {
      type: Sequelize.STRING(30),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('personal_debts', 'categoria');
  },
};
