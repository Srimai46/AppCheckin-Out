const prisma = require("../config/prisma");

// ตั้งเวลาเข้างานปกติ (09:00 น.)
const WORK_START_HOUR = 9;
const WORK_START_MINUTE = 0;

// --- Helper Functions ---

const getThaiStartOfDay = () => {
  const thaiDateStr = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Bangkok",
  });
  return new Date(`${thaiDateStr}T00:00:00+07:00`);
};

const formatShortDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-GB", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const formatThaiTime = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleTimeString("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// --- Controllers ---

exports.checkIn = async (req, res) => {
  try {
    const userId = req.user.id;
    const { note } = req.body; 
    const now = new Date(); 

    // 1. เช็คว่าวันนี้ลงไปรึยัง
    const todayStart = getThaiStartOfDay();
    const existingRecord = await prisma.timeRecord.findFirst({
      where: {
        employeeId: userId,
        workDate: { gte: todayStart },
      },
    });

    if (existingRecord) {
      return res.status(400).json({ error: "วันนี้คุณได้ลงเวลาเข้างานไปแล้ว" });
    }

    // 2. คำนวณว่าสายหรือไม่
    const workStartTime = new Date(todayStart);
    workStartTime.setHours(todayStart.getHours() + WORK_START_HOUR);
    workStartTime.setMinutes(WORK_START_MINUTE);

    const isLate = now > workStartTime;
    const statusText = isLate ? "สาย" : "ปกติ";

    // 3. บันทึกข้อมูล
    const record = await prisma.timeRecord.create({
      data: {
        employeeId: userId,
        workDate: now,
        checkInTime: now,
        isLate: isLate,
        note: note || null,
      },
    });

    // --- แจ้งเตือน HR ---
    if (isLate) {
      const hrUsers = await prisma.employee.findMany({ where: { role: "HR" } });
      const thaiTimeStr = formatThaiTime(now);
      const lateMessage = `คุณ ${req.user.firstName} ${req.user.lastName} เข้างานสาย (${thaiTimeStr})`;

      if (hrUsers.length > 0) {
        const notifications = hrUsers.map((hr) => ({
          employeeId: hr.id,
          notificationType: "LateWarning",
          message: lateMessage,
          isRead: false,
        }));

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
      result: {
        date: formatShortDate(now),
        time: formatThaiTime(now),
        status: statusText,
        isLate: isLate
      },
      data: record,
    });

  } catch (error) {
    console.error("CheckIn Error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการลงเวลา" });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const todayStart = getThaiStartOfDay();

    const record = await prisma.timeRecord.findFirst({
      where: {
        employeeId: userId,
        workDate: { gte: todayStart },
      },
      orderBy: { id: "desc" },
    });

    if (!record) {
      return res.status(400).json({ error: "ไม่พบข้อมูลการเข้างานวันนี้ กรุณา Check-in ก่อน" });
    }

    const updatedRecord = await prisma.timeRecord.update({
      where: { id: record.id },
      data: { checkOutTime: now },
    });

    res.json({
      message: "ลงเวลาออกงานสำเร็จ",
      result: {
        checkOutTime: formatThaiTime(now)
      },
      data: updatedRecord,
    });
  } catch (error) {
    console.error("CheckOut Error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการลงเวลาออก" });
  }
};

exports.getMyHistory = async (req, res) => {
  try {
    const history = await prisma.timeRecord.findMany({
      where: { employeeId: req.user.id },
      orderBy: { workDate: 'desc' },
    });

    const formattedHistory = history.map((item) => ({
      ...item, 
      dateDisplay: formatShortDate(item.workDate),
      checkInTimeDisplay: formatThaiTime(item.checkInTime),
      checkOutTimeDisplay: formatThaiTime(item.checkOutTime),
      statusDisplay: item.isLate ? "สาย" : "ปกติ",
      note: item.note || "-"
    }));

    res.status(200).json({
      success: true,
      count: formattedHistory.length,
      data: formattedHistory,
    });
  } catch (error) {
    console.error("GetHistory Error:", error);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

exports.getAllAttendance = async (req, res) => {
  try {
    const { start, end } = req.query;
    let whereCondition = {};
    
    if (start && end) {
      whereCondition.workDate = {
        gte: new Date(start), 
        lte: new Date(new Date(end).setHours(23, 59, 59, 999)), 
      };
    }

    const records = await prisma.timeRecord.findMany({
      where: whereCondition,
      include: {
        employee: {
          select: { firstName: true, lastName: true, profileImageUrl: true },
        },
      },
      orderBy: { workDate: "desc" },
    });
    
    const formattedRecords = records.map(item => ({
       ...item,
       dateDisplay: formatShortDate(item.workDate),
       timeDisplay: formatThaiTime(item.checkInTime),
       statusDisplay: item.isLate ? "สาย" : "ปกติ",
       note: item.note || "-"
    }));

    res.json(formattedRecords);

  } catch (error) {
    console.error("GetAllAttendance Error:", error);
    res.status(500).json({ error: "ดึงข้อมูลไม่สำเร็จ" });
  }
};

// ✅ ฟังก์ชันสำหรับดึงประวัติพนักงานรายคน (ใช้โดย HR)
exports.getUserHistory = async (req, res) => {
  try {
    const { id } = req.params; // รับ id จาก URL

    const history = await prisma.timeRecord.findMany({
      where: { employeeId: Number(id) }, 
      orderBy: { workDate: 'desc' },
    });

    const formattedHistory = history.map((item) => ({
      ...item,
      dateDisplay: formatShortDate(item.workDate),
      checkInTimeDisplay: formatThaiTime(item.checkInTime),
      checkOutTimeDisplay: formatThaiTime(item.checkOutTime),
      statusDisplay: item.isLate ? "สาย" : "ปกติ",
      note: item.note || "-"
    }));

    res.json(formattedHistory);
  } catch (error) {
    console.error("GetUserHistory Error:", error);
    res.status(500).json({ error: "ดึงข้อมูลไม่สำเร็จ" });
  }
};