// routes/profileRoutes.js


const express    = require("express");
const router     = express.Router();
const controller = require("../controllers/profileController");

// POST /api/profiles/analyze/:username  -fetch from GitHub & save
router.post("/analyze/:username", controller.analyzeProfile);

// GET  /api/profiles                    - list all stored profiles
router.get("/", controller.getAllProfilesHandler);

// GET  /api/profiles/:username          -get one stored profile
router.get("/:username", controller.getProfileByUsername);

module.exports = router;
