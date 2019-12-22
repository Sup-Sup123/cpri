module.exports = (sequelize, DataTypes) => {
    return sequelize.define("redemption_code", {
        ID: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        Code: DataTypes.STRING,
        Type: DataTypes.STRING,
        Coins: DataTypes.INTEGER,
        Expires: DataTypes.STRING
    })
}