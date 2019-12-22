'use strict'

module.exports = (sequelize, DataTypes) => {
  return sequelize.define("server_stats", { /* add/edit table name here */
    ID: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    Count: DataTypes.INTEGER,
  })
}