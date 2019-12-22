'use strict'

module.exports = (sequelize, DataTypes) => {
  return sequelize.define("penguin", { /* add/edit table name here */
    ID: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    Username: DataTypes.STRING,
    Nickname: DataTypes.STRING,
    Approval: DataTypes.INTEGER,
    Password: DataTypes.STRING,
    Email: DataTypes.STRING,
    Moderator: DataTypes.INTEGER,
    Active: DataTypes.INTEGER,
    Coins: DataTypes.INTEGER,
    Color: DataTypes.INTEGER,
    Head: DataTypes.INTEGER,
    Face: DataTypes.INTEGER,
    Neck: DataTypes.INTEGER,
    Body: DataTypes.INTEGER,
    Hand: DataTypes.INTEGER,
    Feet: DataTypes.INTEGER,
    Photo: DataTypes.INTEGER,
    Flag: DataTypes.INTEGER,
    Rank: DataTypes.INTEGER,
    IP: DataTypes.STRING,
    namecolor: DataTypes.STRING,
  })
}