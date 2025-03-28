// models/index.js
const { Sequelize, DataTypes } = require("sequelize");
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
});

// Initialize models
const UserModel = require("./user")(sequelize, DataTypes);
const EventModel = require("./event")(sequelize, DataTypes);
const RatingModel = require("./rating")(sequelize, DataTypes);
const FavoriteModel = require("./favorite")(sequelize, DataTypes);

// Define relationships
UserModel.hasMany(EventModel, {
  foreignKey: "creator_id",
  onDelete: "CASCADE",
});
EventModel.belongsTo(UserModel, { foreignKey: "creator_id" });

RatingModel.belongsTo(EventModel, {
  foreignKey: "event_id",
  onDelete: "CASCADE",
});
RatingModel.belongsTo(UserModel, {
  foreignKey: "user_id",
  onDelete: "CASCADE",
});
EventModel.hasMany(RatingModel, { foreignKey: "event_id" });
UserModel.hasMany(RatingModel, { foreignKey: "user_id" });

UserModel.belongsToMany(EventModel, {
  through: FavoriteModel,
  foreignKey: "user_id",
  otherKey: "event_id",
});
EventModel.belongsToMany(UserModel, {
  through: FavoriteModel,
  foreignKey: "event_id",
  otherKey: "user_id",
});

module.exports = {
  sequelize,
  User: UserModel,
  Event: EventModel,
  Rating: RatingModel,
  Favorite: FavoriteModel,
};
