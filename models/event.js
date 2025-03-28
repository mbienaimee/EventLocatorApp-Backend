// models/event.js
module.exports = (sequelize, DataTypes) => {
  const Event = sequelize.define("Event", {
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
    },
    location: {
      type: DataTypes.GEOGRAPHY("POINT"),
      allowNull: false,
    },
    date_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    preferences: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
    },
    creator_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  });
  return Event;
};
