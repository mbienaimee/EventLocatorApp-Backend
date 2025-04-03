const { Event, User, Rating, Favorite, sequelize } = require("../models");
const { redisPublisher } = require("../config/redis");
const NodeGeocoder = require("node-geocoder");
const { Op } = require("sequelize");

const geocoder = NodeGeocoder({
  provider: "openstreetmap",
});

const createEvent = async (req, res) => {
  const { title, description, location, date_time, preferences } = req.body;
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: req.t("unauthorized") });
    }

    let geo;
    try {
      console.log("Attempting to geocode:", location);
      geo = await geocoder.geocode(location);
      console.log("Raw geocoding result:", JSON.stringify(geo, null, 2));
    } catch (geoError) {
      console.error("Geocoding error:", geoError.message);
      throw new Error(`Geocoding failed: ${geoError.message}`);
    }

    if (!geo || !geo.length) {
      throw new Error("Invalid location: No coordinates found for " + location);
    }

    const coords = {
      type: "Point",
      coordinates: [geo[0].longitude, geo[0].latitude],
    };
    console.log("Using coordinates:", coords);

    const parsedDateTime = new Date(date_time).toISOString();

    const event = await Event.create({
      title,
      description,
      location: coords,
      date_time: parsedDateTime,
      preferences,
      creator_id: req.user.id,
    });

    const message = JSON.stringify({
      title,
      description,
      location: coords,
      date_time: parsedDateTime,
      preferences,
    });
    const publishResult = await redisPublisher.publish(
      "event_notifications",
      message
    );
    console.log(
      "Published to Redis:",
      message,
      "Subscribers notified:",
      publishResult
    );

    res.status(201).json({
      message: req.t("event_created"), // Translated success message
      id: event.id,
      title: event.title,
    });
  } catch (err) {
    console.error("Event creation error:", err.message);
    res.status(500).json({ message: req.t("server_error") }); // Translated error
  }
};

const getAllEvents = async (req, res) => {
  try {
    const events = await Event.findAll();
    res.status(200).json({
      message: req.t("events_retrieved"), // Translated success message
      events,
    });
  } catch (err) {
    console.error("Get all events error:", err.message);
    res.status(500).json({ message: req.t("server_error") });
  }
};

const searchEvents = async (req, res) => {
  const { preferences, lat, lng, radius } = req.query;

  try {
    const prefArray = preferences ? preferences.split(",") : null;
    const latitude = lat ? parseFloat(lat) : null;
    const longitude = lng ? parseFloat(lng) : null;
    const searchRadius = radius ? parseFloat(radius) * 1000 : 5000; // Convert km to meters, default 5km

    const where = {};
    if (prefArray) {
      where.preferences = { [Op.overlap]: prefArray };
    }

    let events;
    if (latitude && longitude) {
      const query = `
        SELECT *
        FROM "Events"
        WHERE ST_DWithin(
          location,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326),
          ${searchRadius}
        )
        ${
          prefArray
            ? `AND preferences && ARRAY[${prefArray
                .map((p) => `'${p}'`)
                .join(",")}]::VARCHAR(255)[]`
            : ""
        }
      `;
      const [results] = await Event.sequelize.query(query);
      events = results;
    } else {
      events = await Event.findAll({ where });
    }

    const formattedEvents = events.map((event) => ({
      id: event.id,
      title: event.title,
      location: {
        lat: event.location.coordinates[1],
        lng: event.location.coordinates[0],
      },
      date_time: event.date_time,
    }));

    res.status(200).json({
      message: req.t("events_retrieved"), // Translated success message
      events: formattedEvents,
    });
  } catch (err) {
    console.error("Search events error:", err.message);
    res.status(500).json({ message: req.t("server_error") });
  }
};

const getEventById = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ message: req.t("event_not_found") });
    }
    res.status(200).json({
      message: req.t("event_retrieved"), // Translated success message
      event,
    });
  } catch (err) {
    console.error("Get event by ID error:", err.message);
    res.status(500).json({ message: req.t("server_error") });
  }
};

const updateEvent = async (req, res) => {
  const { id } = req.params;
  const { title, description, location, date_time, preferences } = req.body;

  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: req.t("unauthorized") });
    }

    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ message: req.t("event_not_found") });
    }

    if (event.creator_id !== req.user.id) {
      return res.status(401).json({ message: req.t("unauthorized_creator") });
    }

    let coords = event.location;
    if (location) {
      const geo = await geocoder.geocode(location);
      if (!geo || !geo.length) {
        return res.status(400).json({ message: req.t("invalid_location") });
      }
      coords = {
        type: "Point",
        coordinates: [geo[0].longitude, geo[0].latitude],
      };
    }

    await event.update({
      title: title || event.title,
      description: description || event.description,
      location: coords,
      date_time: date_time
        ? new Date(date_time).toISOString()
        : event.date_time,
      preferences: preferences || event.preferences,
    });

    const message = JSON.stringify({
      title: event.title,
      description: event.description,
      location: event.location,
      date_time: event.date_time,
      preferences: event.preferences,
    });
    await redisPublisher.publish("event_notifications", message);
    console.log("Published updated event to Redis:", message);

    res.status(200).json({
      message: req.t("event_updated"), // Translated success message
      id: event.id,
      title: event.title,
    });
  } catch (err) {
    console.error("Update event error:", err.message);
    res.status(500).json({ message: req.t("server_error") });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ message: req.t("event_not_found") });
    }
    if (event.creator_id !== req.user.id) {
      return res.status(401).json({ message: req.t("unauthorized_creator") });
    }
    await event.destroy();
    res.status(200).json({ message: req.t("event_deleted") }); // 200 with message instead of 204
  } catch (err) {
    console.error("Delete event error:", err.message);
    res.status(500).json({ message: req.t("server_error") });
  }
};

const rateEvent = async (req, res) => {
  const { id } = req.params;
  const { rating } = req.body;

  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: req.t("unauthorized") });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: req.t("invalid_rating") });
    }

    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ message: req.t("event_not_found") });
    }

    const [ratingRecord, created] = await Rating.findOrCreate({
      where: {
        event_id: id,
        user_id: req.user.id,
      },
      defaults: {
        rating,
      },
    });

    if (!created) {
      await ratingRecord.update({ rating });
    }

    res.status(201).json({
      message: req.t("event_rated"), // Translated success message
      eventId: parseInt(id),
      rating,
    });
  } catch (err) {
    console.error("Rate event error:", err.message);
    if (
      err.name === "SequelizeValidationError" ||
      err.name === "SequelizeDatabaseError"
    ) {
      return res.status(400).json({ message: req.t("bad_request") });
    }
    res.status(500).json({ message: req.t("server_error") });
  }
};

const favoriteEvent = async (req, res) => {
  const { id } = req.params;

  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: req.t("unauthorized") });
    }

    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ message: req.t("event_not_found") });
    }

    const [favorite, created] = await Favorite.findOrCreate({
      where: {
        user_id: req.user.id,
        event_id: id,
      },
    });

    if (!created) {
      return res.status(200).json({
        message: req.t("event_already_favorited"),
        eventId: parseInt(id),
        userId: req.user.id,
      });
    }

    res.status(201).json({
      message: req.t("event_favorited"), // Translated success message
      eventId: parseInt(id),
      userId: req.user.id,
    });
  } catch (err) {
    console.error("Favorite event error:", err.message);
    if (
      err.name === "SequelizeValidationError" ||
      err.name === "SequelizeDatabaseError"
    ) {
      return res.status(400).json({ message: req.t("bad_request") });
    }
    res.status(500).json({ message: req.t("server_error") });
  }
};

const getFavorites = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: req.t("unauthorized") });
    }

    const favorites = await Favorite.findAll({
      where: { user_id: req.user.id },
      include: [
        {
          model: Event,
          attributes: [
            "id",
            "title",
            "description",
            "location",
            "date_time",
            "preferences",
          ],
        },
      ],
    });

    const formattedFavorites = favorites.map((fav) => ({
      id: fav.Event.id,
      title: fav.Event.title,
      description: fav.Event.description,
      location: {
        lat: fav.Event.location.coordinates[1],
        lng: fav.Event.location.coordinates[0],
      },
      date_time: fav.Event.date_time,
      preferences: fav.Event.preferences,
    }));

    res.status(200).json({
      message: req.t("favorites_retrieved"), // Translated success message
      favorites: formattedFavorites,
    });
  } catch (err) {
    console.error("List favorite events error:", err.message);
    res.status(500).json({ message: req.t("server_error") });
  }
};

module.exports = {
  createEvent,
  getAllEvents,
  searchEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  rateEvent,
  favoriteEvent,
  getFavorites,
};
