// server.js
require("dotenv").config();

const express       = require("express");
const cors          = require("cors");
const { initDB }    = require("./config/db");
const profileRoutes = require("./routes/profileRoutes");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors());                          // allow cross-origin requests
app.use(express.json());                  // parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // parse URL-encoded bodies

// ____ Request logger ────────────────────────────────────────────
app.use((req, _res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.originalUrl}`);
  next();
});

// ─------------─ Routes ────────────────────────────────────────────────────
app.use("/api/profiles", profileRoutes);

// Health-check endpoint – useful for Render/Railway keep-alive pings
app.get("/health", (_req, res) => {
  res.status(200).json({
    status:  "ok",
    service: "github-profile-analyzer",
    uptime:  process.uptime(),
  });
});

// ── -=-=-=-=-=-=-======Root welcome ──────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.status(200).json({
    message:   "Welcome to the GitHub Profile Analyzer API 🚀",
    endpoints: {
      analyzeProfile: "POST /api/profiles/analyze/:username",
      getAllProfiles:  "GET  /api/profiles",
      getProfile:      "GET  /api/profiles/:username",
      health:          "GET  /health",
    },
  });
});

// ── ---------------404 handler ───────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// ── Global error handler ──────────────────────────────────────
// Catches any error thrown by route handlers that isn't caught locally.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ success: false, message: "Internal server error." });
});

// ── Bootstrap ─────────────────────────────────────────────────
// Initialise DB schema first; only start listening if that succeeds.
(async () => {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`\n🚀  Server running on http://localhost:${PORT}`);
      console.log(`📖  API docs:  http://localhost:${PORT}/\n`);
    });
  } catch (err) {
    console.error("💥  Failed to start server:", err.message);
    process.exit(1);
  }
})();
