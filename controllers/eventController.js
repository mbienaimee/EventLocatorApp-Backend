const { Event, User, Rating, Favorite, sequelize } = require("../models");
const { redisPublisher } = require("../config/redis");
const NodeGeocoder = require("node-geocoder");
const { Op } = require("sequelize");

const geocoder = NodeGeocoder({
  provider: "openstreetmap", // Explicitly use OpenStreetMap
});

// controllers/eventController.js (partial)
// controllers/eventController.js (partial)
const createEvent = async (req, res) => {
  const { title, description, location, date_time, preferences } = req.body;
  try {
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User not authenticated" });
    }

    let geo;
    try {
      console.log("Attempting to geocode:", location);
      geo = await geocoder.geocode(location);
      console.log("Raw geocoding result:", JSON.stringify(geo, null, 2));
    } catch (geoError) {
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

    res.status(201).json({ id: event.id, title: event.title });
  } catch (err) {
    console.error("Event creation error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

const getAllEvents = async (req, res) => {
  const events = await Event.findAll();
  res.status(200).json(events);
};

const searchEvents = async (req, res) => {
  const { preferences, lat, lng, radius } = req.query;

  try {
    // Parse query parameters
    const prefArray = preferences ? preferences.split(",") : null;
    const latitude = lat ? parseFloat(lat) : null;
    const longitude = lng ? parseFloat(lng) : null;
    const searchRadius = radius ? parseFloat(radius) * 1000 : 5000; // Convert km to meters, default 5km

    // Build the query conditions
    const where = {};
    if (prefArray) {
      where.preferences = { [Op.overlap]: prefArray };
    }

    let events;
    if (latitude && longitude) {
      // Use raw SQL with PostGIS for proximity search
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
      // If no lat/lng, just filter by preferences
      events = await Event.findAll({ where });
    }

    // Format response
    const formattedEvents = events.map((event) => ({
      id: event.id,
      title: event.title,
      location: {
        lat: event.location.coordinates[1], // Extract from geometry
        lng: event.location.coordinates[0],
      },
      date_time: event.date_time,
    }));

    res.status(200).json(formattedEvents);
  } catch (err) {
    console.error("Search events error:", err.message);
    res
      .status(500)
      .json({ message: "Failed to search events", error: err.message });
  }
};
const getEventById = async (req, res) => {
  const event = await Event.findByPk(req.params.id);
  if (event) res.status(200).json(event);
  else res.status(404).json({ error: "Event not found" });
};
const updateEvent = async (req, res) => {
  const { id } = req.params;
  const { title, description, location, date_time, preferences } = req.body;

  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ error: "Unauthorized: User not authenticated" });
    }

    // Find the event
    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Check if user is the creator
    if (event.creator_id !== req.user.id) {
      return res.status(401).json({
        error: "Unauthorized: Only the creator can update this event",
      });
    }

    // Geocode the new location if provided
    let coords = event.location;
    if (location) {
      const geo = await geocoder.geocode(location);
      if (!geo || !geo.length) {
        return res.status(400).json({ error: "Invalid location" });
      }
      coords = {
        type: "Point",
        coordinates: [geo[0].longitude, geo[0].latitude],
        formattedAddress: geo[0].formattedAddress,
      };
    }

    // Update the event
    await event.update({
      title: title || event.title,
      description: description || event.description,
      location: coords,
      date_time: date_time
        ? new Date(date_time).toISOString()
        : event.date_time,
      preferences: preferences || event.preferences,
    });

    // Publish updated event to Redis (optional, if you want notifications)
    const message = JSON.stringify({
      title: event.title,
      description: event.description,
      location: event.location,
      date_time: event.date_time,
      preferences: event.preferences,
    });
    await redisPublisher.publish("event_notifications", message);
    console.log("Published updated event to Redis:", message);

    res.status(200).json({ id: event.id, title: event.title });
  } catch (err) {
    console.error("Update event error:", err.message);
    res
      .status(500)
      .json({ error: "Failed to update event", details: err.message });
  }
};

const deleteEvent = async (req, res) => {
  const event = await Event.findByPk(req.params.id);
  if (!event || event.userId !== req.user.id) {
    return res.status(404).json({ error: "Event not found or unauthorized" });
  }
  await event.destroy();
  res.status(204).send();
};
const rateEvent = async (req, res) => {
  const { id } = req.params; // Event ID from URL
  const { rating } = req.body; // Rating from request body

  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ error: "Unauthorized: User not authenticated" });
    }

    // Validate rating
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ error: "Rating must be an integer between 1 and 5" });
    }

    // Check if event exists
    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Create or update the rating
    const [ratingRecord, created] = await Rating.findOrCreate({
      where: {
        event_id: id,
        user_id: req.user.id,
      },
      defaults: {
        rating: rating,
      },
    });

    if (!created) {
      // If rating exists, update it
      await ratingRecord.update({ rating });
    }

    res.status(201).json({ eventId: parseInt(id), rating });
  } catch (err) {
    console.error("Rate event error:", err.message);
    if (
      err.name === "SequelizeValidationError" ||
      err.name === "SequelizeDatabaseError"
    ) {
      return res.status(400).json({ error: err.message });
    }
    res
      .status(500)
      .json({ error: "Failed to rate event", details: err.message });
  }
};
const favoriteEvent = async (req, res) => {
  const { id } = req.params; // Event ID from URL

  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ error: "Unauthorized: User not authenticated" });
    }

    // Check if event exists
    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Create or find the favorite (prevent duplicates)
    const [favorite, created] = await Favorite.findOrCreate({
      where: {
        user_id: req.user.id,
        event_id: id,
      },
    });

    if (!created) {
      return res.status(200).json({
        eventId: parseInt(id),
        userId: req.user.id,
        message: "Event already favorited",
      });
    }

    res.status(201).json({ eventId: parseInt(id), userId: req.user.id });
  } catch (err) {
    console.error("Favorite event error:", err.message);
    if (
      err.name === "SequelizeValidationError" ||
      err.name === "SequelizeDatabaseError"
    ) {
      return res.status(400).json({ error: err.message });
    }
    res
      .status(500)
      .json({ error: "Failed to favorite event", details: err.message });
  }
};

const getFavorites = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ error: "Unauthorized: User not authenticated" });
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

    res.status(200).json(formattedFavorites);
  } catch (err) {
    console.error("List favorite events error:", err.message);
    res
      .status(500)
      .json({ error: "Failed to list favorite events", details: err.message });
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
