// backend/src/controllers/notificationController.js
const prisma = require("../config/prisma");

// ✅ rename: getNotifications -> getMyNotifications
exports.getMyNotifications = async (req, res) => {
  try {
    const employeeId = req.user.id;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { employeeId },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          notificationType: true,
          message: true,
          relatedRequestId: true,
          relatedEmployeeId: true,
          isRead: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({
        where: { employeeId, isRead: false },
      }),
    ]);

    const mapped = notifications.map((n) => ({
      id: n.id,
      type: n.notificationType, // ✅ frontend ใช้ n.type ได้
      message: n.message,
      relatedRequestId: n.relatedRequestId,
      relatedEmployeeId: n.relatedEmployeeId, // ✅ ใช้กด View ไป /employees/:id
      isRead: n.isRead,
      createdAt: n.createdAt,
    }));

    return res.json({ notifications: mapped, unreadCount });
  } catch (err) {
    console.error("getMyNotifications error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const id = Number(req.params.id);

    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    // ✅ ป้องกันอ่านของคนอื่น
    const found = await prisma.notification.findFirst({
      where: { id, employeeId },
      select: { id: true, isRead: true },
    });

    if (!found) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (!found.isRead) {
      await prisma.notification.update({
        where: { id },
        data: { isRead: true },
      });
    }

    const unreadCount = await prisma.notification.count({
      where: { employeeId, isRead: false },
    });

    return res.json({ success: true, unreadCount });
  } catch (err) {
    console.error("markAsRead error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ rename: markAllRead -> markAllAsRead
exports.markAllAsRead = async (req, res) => {
  try {
    const employeeId = req.user.id;

    await prisma.notification.updateMany({
      where: { employeeId, isRead: false },
      data: { isRead: true },
    });

    return res.json({ success: true, unreadCount: 0 });
  } catch (err) {
    console.error("markAllAsRead error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
