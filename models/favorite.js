module.exports = (sequelize, DataTypes) => {
  const Favorite = sequelize.define("Favorite", {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    event_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  });
  return Favorite;
};
