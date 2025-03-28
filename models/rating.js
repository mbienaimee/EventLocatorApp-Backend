// models/rating.js
module.exports = (sequelize, DataTypes) => {
  const Rating = sequelize.define("Rating", {
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    event_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  });
  return Rating;
};
