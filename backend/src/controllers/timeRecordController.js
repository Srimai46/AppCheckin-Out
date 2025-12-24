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
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการลงเวลา" });
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

// =============================
// ✅ HR: TEAM TODAY ATTENDANCE (ACTIVE ONLY)
// =============================
exports.getTeamTodayAttendance = async (req, res) => {
  try {
    const todayStart = getThaiStartOfDay(); // 00:00 ไทย

    // ✅ 1) ดึงพนักงานที่ยังทำงานอยู่เท่านั้น
    // NOTE: ถ้าฟิลด์คุณชื่อ is_active หรือ status ให้ปรับชื่อให้ตรง schema
    const employees = await prisma.employee.findMany({
      where: { isActive: true }, // ✅ กรองที่ DB เลย (กันหลุด 100%)
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true, // ✅ ส่งออกไปด้วย
      },
      orderBy: { id: "asc" },
    });

    // ✅ 2) ดึง timeRecord ของ "วันนี้"
    const todayRecords = await prisma.timeRecord.findMany({
      where: { workDate: { gte: todayStart } },
      select: {
        id: true,
        employeeId: true,
        workDate: true,
        checkInTime: true,
        checkOutTime: true,
        isLate: true,
        note: true,
      },
      orderBy: { id: "desc" },
    });

    // ✅ 3) เอา record ล่าสุดของแต่ละคน
    const recordMap = new Map();
    for (const r of todayRecords) {
      if (!recordMap.has(r.employeeId)) recordMap.set(r.employeeId, r);
    }

    // ✅ 4) merge เฉพาะ active employees
    const result = employees.map((emp) => {
      const r = recordMap.get(emp.id);

      return {
        employeeId: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        fullName: `${emp.firstName} ${emp.lastName}`.trim(),
        role: emp.role,

        isActive: emp.isActive, // ✅ สำคัญ: frontend จะได้ filter ได้ถูก

        checkInTime: r?.checkInTime || null,
        checkOutTime: r?.checkOutTime || null,
        checkInTimeDisplay: r?.checkInTime ? formatThaiTime(r.checkInTime) : null,
        checkOutTimeDisplay: r?.checkOutTime ? formatThaiTime(r.checkOutTime) : null,

        isLate: r?.isLate || false,
        note: r?.note || null,

        state: !r?.checkInTime ? "NOT_IN" : !r?.checkOutTime ? "IN" : "OUT",
      };
    });

    return res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error("getTeamTodayAttendance Error:", error);
    return res.status(500).json({
      success: false,
      error: "ดึงข้อมูลทีมวันนี้ไม่สำเร็จ",
    });
  }
};

// =============================
// ✅ HR: CHECK-IN EMPLOYEE
// =============================
exports.hrCheckInEmployee = async (req, res) => {
  try {
    const employeeId = Number(req.params.employeeId);
    if (!employeeId) {
      return res.status(400).json({ error: "employeeId ไม่ถูกต้อง" });
    }

    const { note } = req.body;
    const now = new Date();
    const todayStart = getThaiStartOfDay();

    // 1) หา record วันนี้ของพนักงานคนนี้
    const existingRecord = await prisma.timeRecord.findFirst({
      where: {
        employeeId,
        workDate: { gte: todayStart },
      },
      orderBy: { id: "desc" },
    });

    if (existingRecord?.checkInTime) {
      return res.status(400).json({ error: "พนักงานคนนี้ได้ลงเวลาเข้างานวันนี้ไปแล้ว" });
    }

    // 2) คำนวณสาย/ไม่สาย (ใช้ logic เดิมของคุณ)
    const workStartTime = new Date(todayStart);
    workStartTime.setHours(todayStart.getHours() + WORK_START_HOUR);
    workStartTime.setMinutes(WORK_START_MINUTE);

    const late = now > workStartTime;

    // 3) ถ้าไม่มี record วันนี้ -> create, ถ้ามี -> update
    let record;
    if (!existingRecord) {
      record = await prisma.timeRecord.create({
        data: {
          employeeId,
          workDate: now,
          checkInTime: now,
          isLate: late,
          note: note || null,
        },
      });
    } else {
      record = await prisma.timeRecord.update({
        where: { id: existingRecord.id },
        data: {
          checkInTime: now,
          isLate: late,
          note: note || existingRecord.note || null,
        },
      });
    }

    return res.status(200).json({
      message: late ? "HR ลงเวลาเข้างานสำเร็จ (สาย)" : "HR ลงเวลาเข้างานสำเร็จ",
      result: {
        employeeId,
        date: formatShortDate(now),
        time: formatThaiTime(now),
        isLate: late,
      },
      data: record,
    });
  } catch (error) {
    console.error("hrCheckInEmployee Error:", error);
    return res.status(500).json({ error: "HR ลงเวลาเข้างานไม่สำเร็จ" });
  }
};

// =============================
// ✅ HR: CHECK-OUT EMPLOYEE
// =============================
exports.hrCheckOutEmployee = async (req, res) => {
  try {
    const employeeId = Number(req.params.employeeId);
    if (!employeeId) {
      return res.status(400).json({ error: "employeeId ไม่ถูกต้อง" });
    }

    const now = new Date();
    const todayStart = getThaiStartOfDay();

    // 1) ต้องมี record วันนี้ และต้อง check-in ก่อน
    const record = await prisma.timeRecord.findFirst({
      where: {
        employeeId,
        workDate: { gte: todayStart },
      },
      orderBy: { id: "desc" },
    });

    if (!record?.checkInTime) {
      return res.status(400).json({ error: "ยังไม่พบการ Check-in วันนี้" });
    }

    if (record.checkOutTime) {
      return res.status(400).json({ error: "พนักงานคนนี้ได้ Check-out แล้ว" });
    }

    // 2) update checkout
    const updated = await prisma.timeRecord.update({
      where: { id: record.id },
      data: { checkOutTime: now },
    });

    return res.status(200).json({
      message: "HR ลงเวลาออกงานสำเร็จ",
      result: { employeeId, checkOutTime: formatThaiTime(now) },
      data: updated,
    });
  } catch (error) {
    console.error("hrCheckOutEmployee Error:", error);
    return res.status(500).json({ error: "HR ลงเวลาออกงานไม่สำเร็จ" });
  }
};