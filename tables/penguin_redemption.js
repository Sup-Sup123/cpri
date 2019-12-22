module.exports = (sequelize, DataTypes) => {
    return sequelize.define("penguin_redemption", {
        PenguinID: { type: DataTypes.INTEGER, primaryKey: true },
        CodeID: DataTypes.STRING,
    })
}