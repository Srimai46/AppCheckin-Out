const prisma = require('../config/prisma');

// 1. ดึงการแจ้งเตือนทั้งหมด
exports.getMyNotifications = async (req, res) => {
    try {
        const [notifications, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where: { employeeId: req.user.id },
                orderBy: { createdAt: 'desc' },
                take: 30, // ดึงมา 30 รายการล่าสุด
                include: {
                    relatedRequest: {
                        select: { id: true, status: true, startDate: true } 
                    }
                }
            }),
            prisma.notification.count({
                where: { employeeId: req.user.id, isRead: false }
            })
        ]);

        res.json({ notifications, unreadCount });
    } catch (error) {
        console.error("Get Notifications Error:", error);
        res.status(500).json({ error: 'ดึงข้อมูลการแจ้งเตือนล้มเหลว' });
    }
};

// 2. กดอ่านทีละรายการ
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notiId = parseInt(id);

        if (isNaN(notiId)) return res.status(400).json({ error: 'ID ไม่ถูกต้อง' });

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
            message: 'อ่านแล้ว', 
            unreadCount: latestUnreadCount 
        });
    } catch (error) {
        console.error("Mark Read Error:", error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
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
            message: 'อ่านทั้งหมดแล้ว', 
            unreadCount: 0 // อ่านหมดแล้วส่ง 0 กลับไปได้เลย
        });
    } catch (error) {
        console.error("Mark All Read Error:", error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
    }
};