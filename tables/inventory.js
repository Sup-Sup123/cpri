module.exports = (sequelize, DataTypes) => {
    return sequelize.define("inventory", {
      PenguinID: { type: DataTypes.INTEGER, primaryKey: true },
      ItemID: DataTypes.INTEGER,
    })
  }