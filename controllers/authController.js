const { User } = require("../models");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
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

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("Creating user with:", {
      email,
      password: hashedPassword,
      location: coords,
      preferences,
    });
    const user = await User.create({
      email,
      password: hashedPassword, // Store hashed password
      location: coords,
      preferences,
    });
    console.log("User created:", { id: user.id, email: user.email });

    res.status(201).json({
      message: req.t("register_success"), // Translated success message
      id: user.id,
      email: user.email,
    });
  } catch (err) {
    console.error("Registration error:", err.message);
    res.status(400).json({ message: req.t("bad_request") }); // Translated error
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.log("User not found for email:", email);
      return res.status(401).json({ message: req.t("unauthorized") });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log("Password mismatch for email:", email);
      return res.status(401).json({ message: req.t("unauthorized") });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1h", // Add expiration for security
    });
    res.status(200).json({
      message: req.t("login_success"), // Translated success message
      token,
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(400).json({ message: req.t("bad_request") }); // Translated error
  }
};

module.exports = { register, login };
