module.exports = (sequelize, DataTypes) => {
    return sequelize.define("redemption_award", {
        CodeID: { type: DataTypes.INTEGER, primaryKey: true },
        Award: { type: DataTypes.INTEGER, primaryKey: true },
    })
}