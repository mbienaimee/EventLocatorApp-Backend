// config/database.js
const { Sequelize } = require("sequelize");
require("dotenv").config();

/**
 * Sequelize instance for PostgreSQL with PostGIS support
 */
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
});

module.exports = sequelize;
