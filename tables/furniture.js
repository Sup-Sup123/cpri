module.exports = (sequelize, DataTypes) => {
    return sequelize.define("furniture_inventory", {
      PenguinID: { type: DataTypes.INTEGER, primaryKey: true },
      FurnitureID: { type: DataTypes.INTEGER, primaryKey: true },
      Quantity: DataTypes.INTEGER,
    })
  }