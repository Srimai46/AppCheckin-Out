const prisma = require("../config/prisma");

// 1. ดึงการแจ้งเตือนทั้งหมด
exports.getMyNotifications = async (req, res) => {
  try {
    const employeeId = req.user.id;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { employeeId },
        orderBy: { createdAt: "desc" },
        take: 30,

        // ✅ ใช้ select เพื่อคุม field และส่ง relatedEmployeeId ไป FE ชัวร์ ๆ
        select: {
          id: true,
          employeeId: true,
          notificationType: true,
          message: true,
          relatedRequestId: true,
          relatedEmployeeId: true,

          isRead: true,
          createdAt: true,

          // ยังอยากได้ข้อมูลใบลาที่เกี่ยวข้องก็เอาไว้ได้
          relatedRequest: {
            select: { id: true, status: true, startDate: true },
          },
        },
      }),

      prisma.notification.count({
        where: { employeeId, isRead: false },
      }),
    ]);

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Get Notifications Error:", error);
    res.status(500).json({ error: "Retrieving notification data failed." });
  }
};

// 2. กดอ่านทีละรายการ
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notiId = parseInt(id);

        if (isNaN(notiId)) return res.status(400).json({ error: 'ID incorrect' });

        // ตรวจสอบและอัปเดตเฉพาะของตัวเอง
        const result = await prisma.notification.updateMany({
            where: {
                id: notiId,
                employeeId: req.user.id,
                isRead: false // อัปเดตเฉพาะที่ยังไม่ได้อ่าน
            },
            data: { isRead: true }
        });

        // ส่งจำนวนที่ยังไม่ได้อ่านล่าสุดกลับไป เพื่อให้ Frontend อัปเดตตัวเลข Badge
        const latestUnreadCount = await prisma.notification.count({
            where: { employeeId: req.user.id, isRead: false }
        });

        res.json({ 
            message: 'Read', 
            unreadCount: latestUnreadCount 
        });
    } catch (error) {
        console.error("Mark Read Error:", error);
        res.status(500).json({ error: 'There is something wrong' });
    }
};

// 3. กดอ่านทั้งหมด
exports.markAllAsRead = async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: { 
                employeeId: req.user.id, 
                isRead: false 
            },
            data: { isRead: true }
        });

        res.json({ 
            message: 'Read All', 
            unreadCount: 0 // อ่านหมดแล้วส่ง 0 กลับไปได้เลย
        });
    } catch (error) {
        console.error("Mark All Read Error:", error);
        res.status(500).json({ error: 'There is something wrong' });
    }
};