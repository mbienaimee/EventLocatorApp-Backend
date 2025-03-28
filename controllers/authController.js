const { User } = require("../models");
const jwt = require("jsonwebtoken");
const NodeGeocoder = require("node-geocoder");

const geocoder = NodeGeocoder({
  provider: "openstreetmap",
});

const register = async (req, res) => {
  const { email, password, location, preferences } = req.body;
  try {
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

    // Convert to GeoJSON Point format: [longitude, latitude]
    const coords = {
      type: "Point",
      coordinates: [geo[0].longitude, geo[0].latitude],
    };
    console.log("Using coordinates:", coords);

    console.log("Creating user with:", {
      email,
      password,
      location: coords,
      preferences,
    });
    const user = await User.create({
      email,
      password,
      location: coords,
      preferences,
    });
    console.log("User created:", { id: user.id, email: user.email });

    res.status(201).json({ id: user.id, email: user.email });
  } catch (err) {
    console.error("Registration error:", err.message);
    res.status(400).json({ error: err.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
    res.status(200).json({ token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = { register, login };
