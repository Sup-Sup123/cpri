module.exports = (sequelize, DataTypes) => {
    return sequelize.define("activation_key", {
      PenguinID: { type: DataTypes.INTEGER, primaryKey: true },
      ActivationKey: DataTypes.STRING,
    })
  }