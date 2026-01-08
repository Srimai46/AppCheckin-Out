// backend/src/routes/attendanceRoutes.js

const express = require("express");
const router = express.Router();
const attendanceStatsController = require("../controllers/attendanceStatsController");

const { protect } = require("../middlewares/authMiddleware");

// --- Debug Section (Optional: เอาไว้เช็คว่ามาจริงไหม) ---
if (!attendanceStatsController.getStats) {
    console.error("❌ ERROR: attendanceStatsController.getStats is UNDEFINED.");
}
if (!protect) {
    console.error("❌ ERROR: protect middleware is UNDEFINED.");
}
// -----------------------------------------------------

router.get("/stats", protect, attendanceStatsController.getStats);

module.exports = router;