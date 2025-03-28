require("dotenv").config();
const express = require("express");
const i18next = require("i18next");
const i18nextMiddleware = require("i18next-http-middleware");
const authRoutes = require("./routes/authRoutes");
const eventRoutes = require("./routes/eventRoutes");
const { sequelize } = require("./models");
require("./services/notificationService");

const swaggerUi = require("swagger-ui-express");
const fs = require("fs");
const yaml = require("js-yaml");
const swaggerDocument = yaml.load(fs.readFileSync("./swagger.yml", "utf8"));

const app = express();

app.use(express.json());
i18next.use(i18nextMiddleware.LanguageDetector).init({
  fallbackLng: "en",
  preload: ["en", "es", "fr"],
  resources: {
    en: { translation: require("./locales/en.json") },
    es: { translation: require("./locales/es.json") },
    fr: { translation: require("./locales/fr.json") },
  },
});
app.use(i18nextMiddleware.handle(i18next));

app.use("/auth", authRoutes);
app.use("/events", eventRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

(async () => {
  try {
    await sequelize.query("CREATE EXTENSION IF NOT EXISTS postgis;");
    await sequelize.sync({ force: false }); // Remove force in production
    console.log("Database synced successfully");
  } catch (err) {
    console.error("Database sync failed:", err.message);
  }
})();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
