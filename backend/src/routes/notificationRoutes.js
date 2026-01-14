const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { protect } = require("../middlewares/authMiddleware");

router.get("/", protect, notificationController.getMyNotifications);

// ✅ สำคัญ: /read-all ต้องมาก่อน /:id/read
router.patch("/read-all", protect, notificationController.markAllAsRead);
router.patch("/:id/read", protect, notificationController.markAsRead);

module.exports = router;
