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

// Middleware
app.use(express.json());

// Support ?lang query parameter
app.use((req, res, next) => {
  if (req.query.lang) {
    req.headers["accept-language"] = req.query.lang;
  }
  next();
});

// Initialize i18next
i18next.use(i18nextMiddleware.LanguageDetector).init({
  fallbackLng: "en",
  preload: ["en", "es", "fr"],
  resources: {
    en: { translation: require("./locales/en.json") },
    es: { translation: require("./locales/es.json") },
    fr: { translation: require("./locales/fr.json") },
  },
  detection: {
    order: ["header", "querystring", "cookie"],
    lookupHeader: "accept-language",
  },
});

app.use(i18nextMiddleware.handle(i18next));

// Swagger UI options
const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { padding: 10px; }
    .swagger-ui .topbar-wrapper { display: flex; justify-content: space-between; }
    .lang-hint { margin-left: 20px; color: white; }
  `,
  customSiteTitle: "Event Locator API",
  customJs: `
    document.addEventListener('DOMContentLoaded', function() {
      const hint = document.createElement('span');
      hint.className = 'lang-hint';
      hint.innerText = 'Add ?lang=en/es/fr to URL for language';
      document.querySelector('.topbar-wrapper').appendChild(hint);
    });
  `,
};

// Routes
app.use("/auth", authRoutes);
app.use("/events", eventRoutes);
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, swaggerUiOptions)
);

// Database sync
(async () => {
  try {
    await sequelize.query("CREATE EXTENSION IF NOT EXISTS postgis;");
    await sequelize.sync({ force: true });
    console.log("Database synced successfully");
  } catch (err) {
    console.error("Database sync failed:", err.message);
  }
})();

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
