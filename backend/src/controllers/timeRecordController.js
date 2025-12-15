const prisma = require("../config/prisma");

// ตั้งเวลาเข้างานปกติ (09:00 น.)
const WORK_START_HOUR = 9;
const WORK_START_MINUTE = 0;

// Helper Function: แปลงเวลาปัจจุบันเป็น Date Object ของไทย (เอาไว้คำนวณ)
const getThaiDate = () => {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
};

exports.checkIn = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. หาจุดเริ่มต้นของวัน (00:00:00 ไทย)
    // เทคนิค: แปลงเวลาปัจจุบันเป็น String แบบไทย -> สร้าง Date ใหม่ -> เซ็ตเวลาเป็น 0
    const now = new Date(); // เวลาปัจจุบัน (UTC จริง)

    // สร้างตัวแปรเวลาที่อิงตามปฏิทินไทย
    const thaiNow = getThaiDate();

    const todayStart = new Date(thaiNow);
    todayStart.setHours(0, 0, 0, 0);
    // หมายเหตุ: Prisma จะแปลง todayStart กลับเป็น UTC เพื่อ query DB อัตโนมัติ

    // เช็คว่าวันนี้ (ตามเวลาไทย) ลงไปรึยัง
    const existingRecord = await prisma.timeRecord.findFirst({
      where: {
        employeeId: userId,
        workDate: {
          gte: todayStart,
        },
      },
    });

    if (existingRecord) {
      return res.status(400).json({ error: "วันนี้คุณได้ลงเวลาเข้างานไปแล้ว" });
    }

    // 2. คำนวณว่าสายหรือไม่ (Check Late)
    // สร้างเวลา 09:00 ของวันนี้ (ตามเวลาไทย)
    const workStartTime = new Date(todayStart);
    workStartTime.setHours(WORK_START_HOUR, WORK_START_MINUTE, 0, 0);

    // เปรียบเทียบเวลา: ต้องเทียบ thaiNow (เวลาปัจจุบันในบริบทไทย) กับ workStartTime (09:00 ไทย)
    const isLate = thaiNow > workStartTime;

    // 3. บันทึกข้อมูล (ลง DB เป็น UTC ตามมาตรฐาน Prisma)
    const record = await prisma.timeRecord.create({
      data: {
        employeeId: userId,
        workDate: now, // วันที่ทำงาน
        checkInTime: now, // เวลาเช็คอิน
        isLate: isLate,
      },
    });

    // --- แจ้งเตือน HR ถ้ามาสาย ---
    if (isLate) {
      const hrUsers = await prisma.employee.findMany({ where: { role: "HR" } });

      // จัดรูปแบบเวลาไทยสวยๆ สำหรับข้อความ (เช่น 09:15:30)
      const thaiTimeStr = now.toLocaleTimeString("th-TH", {
        timeZone: "Asia/Bangkok",
        hour: "2-digit",
        minute: "2-digit",
      });

      const lateMessage = `คุณ ${req.user.firstName} ${req.user.lastName} เข้างานสาย (${thaiTimeStr})`;

      const notifications = hrUsers.map((hr) => ({
        employeeId: hr.id,
        notificationType: "LateWarning",
        message: lateMessage,
        isRead: false,
      }));

      if (notifications.length > 0) {
        await prisma.notification.createMany({ data: notifications });

        const io = req.app.get("io");
        if (io) {
          hrUsers.forEach((hr) => {
            io.to(`user_${hr.id}`).emit("notification", {
              type: "LateWarning",
              message: lateMessage,
              timestamp: now,
            });
          });
        }
      }
    }

    res.status(201).json({
      message: isLate ? "ลงเวลาเข้างานสำเร็จ (สาย)" : "ลงเวลาเข้างานสำเร็จ",
      data: record,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการลงเวลา" });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // 1. หา Record ของวันนี้ (00:00 ไทย)
    const thaiNow = getThaiDate();
    const todayStart = new Date(thaiNow);
    todayStart.setHours(0, 0, 0, 0);

    const record = await prisma.timeRecord.findFirst({
      where: {
        employeeId: userId,
        workDate: { gte: todayStart },
      },
      orderBy: { id: "desc" },
    });

    if (!record) {
      return res
        .status(400)
        .json({ error: "ไม่พบข้อมูลการเข้างานวันนี้ กรุณา Check-in ก่อน" });
    }

    // 2. อัปเดตเวลาออก
    const updatedRecord = await prisma.timeRecord.update({
      where: { id: record.id },
      data: {
        checkOutTime: now,
      },
    });

    res.json({
      message: "ลงเวลาออกงานสำเร็จ",
      data: updatedRecord,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการลงเวลาออก" });
  }
};

exports.getMyHistory = async (req, res) => {
  try {
    const history = await prisma.timeRecord.findMany({
      where: { employeeId: req.user.id },
      orderBy: { workDate: "desc" },
      take: 30,
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "ดึงข้อมูลล้มเหลว" });
  }
};

exports.getAllAttendance = async (req, res) => {
  try {
    const { start, end } = req.query; // รับช่วงวันที่จาก Frontend (เช่น ดูเฉพาะเดือนนี้)

    let whereCondition = {};
    if (start && end) {
      whereCondition.workDate = {
        gte: new Date(start),
        lte: new Date(end),
      };
    }

    const records = await prisma.timeRecord.findMany({
      where: whereCondition,
      include: {
        employee: {
          // Join เอาชื่อคนมาด้วย จะได้รู้ว่าใครเข้างาน
          select: { firstName: true, lastName: true, profileImageUrl: true },
        },
      },
      orderBy: { workDate: "desc" },
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: "ดึงข้อมูลไม่สำเร็จ" });
  }
};
