const express = require("express");
const router = express.Router();
const {
  createEvent,
  getAllEvents,
  searchEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  rateEvent,
  favoriteEvent,
  getFavorites,
} = require("../controllers/eventController");
const { auth } = require("../middleware/auth");

router.post("/", auth, createEvent);
router.get("/", getAllEvents);
router.get("/search", searchEvents);
router.get("/:id", getEventById);
router.put("/:id", auth, updateEvent);
router.delete("/:id", auth, deleteEvent);
router.post("/:id/rate", auth, rateEvent);
router.post("/:id/favorite", auth, favoriteEvent);
router.get("/favorites", auth, getFavorites);

module.exports = router;
