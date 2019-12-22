module.exports = (sequelize, DataTypes) => {
    return sequelize.define("ban", {
        PenguinID: { type: DataTypes.INTEGER, primaryKey: true },
        Issued: DataTypes.DATE,
        Expires: DataTypes.DATE,
        ModeratorID: DataTypes.INTEGER,
        Reason: DataTypes.INTEGER,
        Comment: DataTypes.STRING,
    })
}