module.exports = (sequelize, DataTypes) => {
    return sequelize.define("reset_pass", {
        PenguinID: { type: DataTypes.INTEGER, primaryKey: true },
        ResetID: { type: DataTypes.INTEGER, primaryKey: true },
        Expires: DataTypes.DATE,
    })
}