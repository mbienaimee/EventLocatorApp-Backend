// models/user.js
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define("User", {
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    location: {
      type: DataTypes.GEOGRAPHY("POINT"),
      allowNull: false,
    },
    preferences: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
    },
  });
  return User;
};
