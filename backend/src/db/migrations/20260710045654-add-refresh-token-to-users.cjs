'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'refreshToken', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'refreshTokenExpiry', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addIndex('users', ['refreshToken']);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'refreshToken');
    await queryInterface.removeColumn('users', 'refreshTokenExpiry');
  },
};
