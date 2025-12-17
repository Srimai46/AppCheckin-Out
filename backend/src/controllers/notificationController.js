const prisma = require('../config/prisma');

// 1. ดูการแจ้งเตือนทั้งหมดของฉัน
exports.getMyNotifications = async (req, res) => {
    try {
        // ใช้ Promise.all เพื่อให้ดึงข้อมูลทั้งสองอย่างพร้อมกัน (เร็วขึ้นเล็กน้อย)
        const [notifications, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where: { employeeId: req.user.id },
                orderBy: { createdAt: 'desc' },
                take: 20,
                include: {
                    relatedRequest: {
                        select: { id: true, status: true } 
                    }
                }
            }),
            prisma.notification.count({
                where: { 
                    employeeId: req.user.id,
                    isRead: false
                }
            })
        ]);

        res.json({ notifications, unreadCount });
    } catch (error) {
        console.error("Get Notifications Error:", error);
        res.status(500).json({ error: 'ดึงข้อมูลการแจ้งเตือนล้มเหลว' });
    }
};

// 2. กดอ่านการแจ้งเตือน (Mark as Read)
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        // ป้องกัน Error หาก ID ไม่ใช่ตัวเลข
        if (isNaN(id)) {
            return res.status(400).json({ error: 'รูปแบบ ID ไม่ถูกต้อง' });
        }

        const result = await prisma.notification.updateMany({
            where: {
                id: Number(id),
                employeeId: req.user.id
            },
            data: { isRead: true }
        });

        if (result.count === 0) {
            return res.status(404).json({ error: 'ไม่พบการแจ้งเตือน หรือคุณไม่มีสิทธิ์' });
        }

        res.json({ message: 'อ่านแล้ว' });
    } catch (error) {
        console.error("Mark as Read Error:", error); // เพิ่ม log
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ' });
    }
};

// 3. กดอ่านทั้งหมด
exports.markAllAsRead = async (req, res) => {
    try {
        const result = await prisma.notification.updateMany({
            where: {
                employeeId: req.user.id,
                isRead: false
            },
            data: { isRead: true }
        });

        res.json({ 
            message: 'อ่านทั้งหมดแล้ว',
            count: result.count // ส่งจำนวนที่อัปเดตกลับไปด้วยเพื่อให้ Frontend รู้
        });
    } catch (error) {
        console.error("Mark All as Read Error:", error); // เพิ่ม log
        res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
    }
};