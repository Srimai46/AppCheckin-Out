const prisma = require("../config/prisma");
const { auditLog } = require("../utils/logger");
// --- Helper Functions ---

const getThaiStartOfDay = () => {
  const now = new Date();
  // ปรับให้เป็นเวลาไทย (UTC+7) และตั้งค่าเป็น 00:00:00
  const start = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  start.setUTCHours(0, 0, 0, 0);
  return new Date(start.getTime() - 7 * 60 * 60 * 1000); // กลับเป็น UTC สำหรับ Prisma
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

const checkIsHolidayOrWeekend = async (date) => {
  const dayOfWeek = date.getDay(); // 0 = อาทิตย์, 6 = เสาร์

  // สร้างวันที่แบบ YYYY-MM-DDT00:00:00.000Z เพื่อให้ตรงกับ normalizeDate ที่ใช้ตอนบันทึก Holiday
  const dateStr = date.toLocaleDateString("en-CA", {
    timeZone: "Asia/Bangkok",
  }); // ได้ "YYYY-MM-DD"
  const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

  const holiday = await prisma.holiday.findUnique({
    where: { date: targetDate },
  });

  return {
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    isHoliday: !!holiday,
    holidayName: holiday?.name || null,
  };
};

const calculateMidpoint = (start, end) => {
  const startMs = start.getTime();
  const endMs = end.getTime();
  const midMs = (startMs + endMs) / 2;
  const midDate = new Date(midMs);
  midDate.setSeconds(0);
  midDate.setMilliseconds(0);
  return midDate;
};

// --- Controllers ---

exports.checkIn = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { note, location } = req.body;
    const now = new Date();

    // 1. ตรวจสอบวันหยุด
    const { isWeekend, isHoliday, holidayName } = await checkIsHolidayOrWeekend(now);
    const isSpecialDay = isWeekend || isHoliday;

    // 2. เช็คว่าวันนี้ลงเวลาไปแล้วหรือยัง
    const todayStart = getThaiStartOfDay();
    const existingRecord = await prisma.timeRecord.findFirst({
      where: {
        employeeId: userId,
        workDate: { gte: todayStart },
      },
    });

    if (existingRecord) {
      return res.status(400).json({ error: "You have already checked in for today." });
    }

    // --- เช็คใบลา ---
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    const approvedLeave = await prisma.leaveRequest.findFirst({
      where: {
        employeeId: userId,
        status: "Approved",
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart },
      },
    });

    let isHalfMorningLeave = false;
    if (approvedLeave) {
      if (
        approvedLeave.startDuration === "HalfMorning" ||
        approvedLeave.endDuration === "HalfMorning"
      ) {
        isHalfMorningLeave = true;
      }
    }

    // 3. ดึง Config และคำนวณเวลาเข้างาน
    const config = await prisma.workConfiguration.findUnique({
      where: { role: userRole },
    });
    const startHour = config ? config.startHour : 9;
    const startMin = config ? config.startMin : 0;
    const endHour = config ? config.endHour : 18;
    const endMin = config ? config.endMin : 0;

    // เวลาเข้างานมาตรฐาน (Full Day)
    const standardStartTime = new Date(todayStart);
    standardStartTime.setHours(todayStart.getHours() + startHour);
    standardStartTime.setMinutes(startMin);

    // เวลาเลิกงานมาตรฐาน
    const standardEndTime = new Date(todayStart);
    standardEndTime.setHours(todayStart.getHours() + endHour);
    standardEndTime.setMinutes(endMin);

    // กำหนดเวลาที่ "ต้องมา" (Expected Check-in Time)
    let expectedCheckInTime = standardStartTime;

    // --- 🔥 แก้ไข LOGIC ตรงนี้ (Fixed) ---
    if (isHalfMorningLeave) {
        // กรณีลาเช้า ให้เวลาที่คาดหวังคือ "เวลาเริ่มงานช่วงบ่าย" เสมอ
        // เพื่อให้การสแกนนิ้ว "ทุกช่วงเวลา" ก่อนบ่าย ถือว่าเป็นการมาก่อนเวลา (ไม่สาย)
        expectedCheckInTime = calculateMidpoint(standardStartTime, standardEndTime);
    }

    // ✅ Logic กำหนด Status
    let isLate = false;
    let checkInStatusEnum = "ON_TIME";

    if (isSpecialDay) {
      checkInStatusEnum = "ON_TIME";
    } else {
      // เทียบเวลากับ expectedCheckInTime
      if (now > expectedCheckInTime) {
        isLate = true;
        checkInStatusEnum = "LATE";
      } else {
        isLate = false;
        // ✅ ถ้าไม่สาย ให้เป็น ON_TIME เสมอ
        checkInStatusEnum = "ON_TIME";
      }
    }

    // สร้างข้อความอธิบาย Status
    // const expectedTimeStr = formatThaiTime(expectedCheckInTime); // ไม่ได้ใช้ ลบออกได้
    
    let statusText = "On Time";
    if (isSpecialDay) {
        statusText = isHoliday ? `Holiday (${holidayName})` : "Weekend Work";
    } else if (isLate) {
        statusText = "Late";
    } else {
        // มาทันเวลา
        if (isHalfMorningLeave) {
             // เช็คเวลาเพื่อ Display ข้อความให้ถูกต้อง (แต่สถานะ Late คือ False แล้ว)
             if (now < standardStartTime) {
                 statusText = "Full Day (Worked on Morning Leave)"; // มาเช้ากว่า 09:00 ทั้งที่ลา
             } else if (now < new Date(todayStart).setHours(12,0,0,0)) {
                 statusText = "Early Arrival (Morning)"; // มา 09:23 จะเข้าเคสนี้ (ไม่สาย)
             } else {
                 statusText = "Half Day (Afternoon Shift)"; // มาบ่ายตามใบลาปกติ
             }
        } else {
             statusText = "On Time";
        }
    }

    // 4. บันทึกข้อมูล
    const result = await prisma.$transaction(async (tx) => {
      const record = await tx.timeRecord.create({
        data: {
          employeeId: userId,
          workDate: now,
          checkInTime: now,
          isLate: isLate,
          checkInStatus: checkInStatusEnum, 
          note: isSpecialDay || isHalfMorningLeave ? `[${statusText}] ${note || ""}` : note || null,
          checkInLat: location?.lat ? parseFloat(location.lat) : null,
          checkInLng: location?.lng ? parseFloat(location.lng) : null,
        },
      });

      await auditLog(tx, {
        action: "CREATE",
        modelName: "TimeRecord",
        recordId: record.id,
        userId: userId,
        details: `Employee checked in: ${statusText} (Status: ${checkInStatusEnum})`,
        newValue: record,
        req: req,
      });

      return record;
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("new-audit-log", {
        id: Date.now(),
        action: "CREATE",
        modelName: "TimeRecord",
        recordId: result.id,
        performedBy: {
          firstName: req.user.firstName,
          lastName: req.user.lastName,
        },
        details: `Employee checked in: ${statusText}`,
        createdAt: now,
      });
    }

    res.status(201).json({
      message: `Check-in successful`,
      result: {
        date: formatShortDate(now),
        time: formatThaiTime(now),
        status: statusText,
        isLate,
        location,
      },
      data: result,
    });
  } catch (error) {
    console.error("Check-in Error:", error);
    res.status(500).json({ message: "Error occurred during check-in." });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { location } = req.body;
    const now = new Date();
    const todayStart = getThaiStartOfDay();

    // ตรวจสอบสถานะวัน
    const { isWeekend, isHoliday } = await checkIsHolidayOrWeekend(now);
    const isSpecialDay = isWeekend || isHoliday;

    const record = await prisma.timeRecord.findFirst({
      where: { employeeId: userId, workDate: { gte: todayStart } },
      orderBy: { id: "desc" },
    });

    if (!record)
      return res.status(400).json({ error: "Check-in record not found." });

    // --- เช็คใบลา (แก้ไข Logic ให้เหมือน CheckIn เพื่อความชัวร์) ---
    // ✅ สร้างขอบเขตเวลา "สิ้นสุดวันนี้"
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    const approvedLeave = await prisma.leaveRequest.findFirst({
      where: {
        employeeId: userId,
        status: "Approved",
        // ✅ เปลี่ยนจาก now เป็นการเช็คช่วงเวลาของ "วันนี้"
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart },
      },
    });

    let isHalfAfternoonLeave = false;
    if (approvedLeave) {
      if (
        approvedLeave.startDuration === "HalfAfternoon" ||
        approvedLeave.endDuration === "HalfAfternoon"
      ) {
        isHalfAfternoonLeave = true;
      }
    }

    // คำนวณเวลาเลิกงาน
    const config = await prisma.workConfiguration.findUnique({
      where: { role: userRole },
    });
    const startHour = config ? config.startHour : 9;
    const startMin = config ? config.startMin : 0;
    const endHour = config ? config.endHour : 18;
    const endMin = config ? config.endMin : 0;

    const standardStartTime = new Date(todayStart);
    standardStartTime.setHours(todayStart.getHours() + startHour);
    standardStartTime.setMinutes(startMin);

    const standardEndTime = new Date(todayStart);
    standardEndTime.setHours(todayStart.getHours() + endHour);
    standardEndTime.setMinutes(endMin);

    let expectedCheckOutTime = standardEndTime;

    if (isHalfAfternoonLeave) {
      expectedCheckOutTime = calculateMidpoint(
        standardStartTime,
        standardEndTime
      );
      expectedCheckOutTime.setSeconds(0);
      expectedCheckOutTime.setMilliseconds(0);
    }

    // ✅ Logic กำหนด Status
    let isEarlyLeave = false;
    let checkOutStatusEnum = "NORMAL";

    if (isSpecialDay) {
      checkOutStatusEnum = "NORMAL";
    } else {
      if (now < expectedCheckOutTime) {
        isEarlyLeave = true;
        checkOutStatusEnum = "EARLY";
      } else {
        isEarlyLeave = false;
        checkOutStatusEnum = "NORMAL";
      }

      if (isHalfAfternoonLeave) {
        checkOutStatusEnum = isEarlyLeave ? "EARLY" : "LEAVE";
      }
    }

    const expectedTimeStr = formatThaiTime(expectedCheckOutTime);
    const statusText = isHalfAfternoonLeave
      ? isEarlyLeave
        ? `Half Day (Early < ${expectedTimeStr})`
        : "Half Day (Afternoon Leave)"
      : isEarlyLeave
      ? "Early Leave"
      : "On Time";

    // 2. บันทึกข้อมูล
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.timeRecord.update({
        where: { id: record.id },
        data: {
          checkOutTime: now,
          checkOutStatus: checkOutStatusEnum,
          checkOutLat: location?.lat ? parseFloat(location.lat) : null,
          checkOutLng: location?.lng ? parseFloat(location.lng) : null,
          // เพิ่ม Note ว่ามีการ Update
          note: record.checkOutTime
            ? record.note
              ? `${record.note} (Updated Out)`
              : "Updated Out"
            : record.note,
        },
      });

      await auditLog(tx, {
        action: "UPDATE",
        modelName: "TimeRecord",
        recordId: updated.id,
        userId: userId,
        details: `Employee ${
          record.checkOutTime ? "updated check-out" : "checked out"
        }: ${statusText} (Status: ${checkOutStatusEnum})`,
        oldValue: { checkOutTime: record.checkOutTime },
        newValue: { checkOutTime: updated.checkOutTime },
        req: req,
      });

      return updated;
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("new-audit-log", {
        id: Date.now(),
        action: "UPDATE",
        modelName: "TimeRecord",
        recordId: result.id,
        performedBy: {
          firstName: req.user.firstName,
          lastName: req.user.lastName,
        },
        details: `Employee checked out: ${statusText}`,
        createdAt: now,
      });
    }

    res.json({
      message: "Clock-out successful",
      result: {
        checkOutTime: formatThaiTime(now),
        isEarlyLeave,
        status: statusText,
        location,
      },
      data: result,
    });
  } catch (error) {
    console.error("Check-out Error:", error);
    res.status(500).json({ error: "Error occurred during check-out." });
  }
};

exports.getMyHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { year, month } = req.query;

    // 1. ดึง Config
    const config = await prisma.workConfiguration.findUnique({
      where: { role: userRole },
    });

    // 2. สร้างเงื่อนไขเวลา
    let dateCondition = {};
    if (year) {
      const targetYear = parseInt(year);
      let startDate, endDate;

      if (month && month !== "All") {
        const m = parseInt(month) - 1;
        startDate = new Date(Date.UTC(targetYear, m, 1));
        endDate = new Date(Date.UTC(targetYear, m + 1, 0, 23, 59, 59));
      } else {
        startDate = new Date(Date.UTC(targetYear, 0, 1));
        endDate = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59));
      }

      dateCondition = {
        workDate: { gte: startDate, lte: endDate },
      };
    }

    // 3. Query
    const history = await prisma.timeRecord.findMany({
      where: {
        employeeId: userId,
        ...dateCondition,
      },
      orderBy: { workDate: "desc" },
    });

    const formattedHistory = history.map((item) => {
      let workingHours = "-";
      if (item.checkInTime && item.checkOutTime) {
        const diffInMs =
          new Date(item.checkOutTime) - new Date(item.checkInTime);
        const hours = Math.floor(diffInMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
        workingHours = `${hours} Hours ${minutes} Min`;
      }

      // ✅ 1. จัดการ Display Status ขาเข้า (อ่านจาก DB)
      let inStatusDisplay = "On Time";
      if (item.checkInStatus) {
        // แปลง Enum เป็นคำสวยๆ
        if (item.checkInStatus === "LATE") inStatusDisplay = "Late";
        else if (item.checkInStatus === "LEAVE")
          inStatusDisplay = "Leave (Half Day)";
        else if (item.checkInStatus === "ABSENT") inStatusDisplay = "Absent";
        else inStatusDisplay = "On Time";
      } else {
        // Fallback สำหรับข้อมูลเก่าที่ยังไม่มี Enum
        inStatusDisplay = item.isLate ? "Late" : "On Time";
      }

      // ✅ 2. จัดการ Display Status ขาออก (อ่านจาก DB)
      let outStatusDisplay = "-";
      if (item.checkOutTime) {
        if (item.checkOutStatus) {
          // อ่านค่าจาก Enum ที่เราบันทึกไว้
          if (item.checkOutStatus === "EARLY") outStatusDisplay = "Early Leave";
          else if (item.checkOutStatus === "LEAVE")
            outStatusDisplay = "Leave (Half Day)";
          else outStatusDisplay = "Normal";
        } else {
          // Fallback ข้อมูลเก่า (ถ้าจำเป็น)
          outStatusDisplay = "Normal";
        }
      } else {
        // เช็ควันอดีต เพื่อแจ้ง Missing Check-out
        const recordDate = new Date(item.workDate).toISOString().split("T")[0];
        const todayDate = new Date().toISOString().split("T")[0];
        if (recordDate === todayDate) {
          outStatusDisplay = "Still Working";
        } else {
          outStatusDisplay = "Missing Check-out";
        }
      }

      return {
        ...item,
        dateDisplay: item.workDate.toISOString().split("T")[0],
        checkInTimeDisplay: item.checkInTime
          ? new Date(item.checkInTime).toLocaleTimeString("th-TH")
          : "-",
        checkOutTimeDisplay: item.checkOutTime
          ? new Date(item.checkOutTime).toLocaleTimeString("th-TH")
          : "Not checked out yet",

        statusDisplay: inStatusDisplay, // ใช้ตัวแปรใหม่ที่แปลงค่าแล้ว
        outStatusDisplay: outStatusDisplay, // ส่ง field นี้กลับไปด้วย (Frontend อาจจะต้องใช้)

        workingHours: workingHours,
        standardConfig: config
          ? {
              start: `${String(config.startHour).padStart(2, "0")}:${String(
                config.startMin
              ).padStart(2, "0")}`,
              end: `${String(config.endHour).padStart(2, "0")}:${String(
                config.endMin
              ).padStart(2, "0")}`,
            }
          : null,
        note: item.note || "-",
      };
    });

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

    const [records, configs] = await Promise.all([
      prisma.timeRecord.findMany({
        where: whereCondition,
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              role: true,
              profileImageUrl: true,
            },
          },
        },
        orderBy: { workDate: "desc" },
      }),
      prisma.workConfiguration.findMany(),
    ]);

    const formattedRecords = records.map((item) => {
      // ✅ 1. Logic ขาเข้า (ใช้ Enum)
      let inStatusDisplay = "On Time";
      if (item.checkInStatus) {
        if (item.checkInStatus === "LATE") inStatusDisplay = "Late";
        else if (item.checkInStatus === "LEAVE")
          inStatusDisplay = "Leave (Half Day)";
        else if (item.checkInStatus === "ABSENT") inStatusDisplay = "Absent";
        else inStatusDisplay = "On Time";
      } else {
        inStatusDisplay = item.isLate ? "Late" : "On Time";
      }

      // ✅ 2. Logic ขาออก (ใช้ Enum + เช็ควันอดีต)
      let outStatusDisplay = "-";
      if (item.checkOutTime) {
        if (item.checkOutStatus) {
          if (item.checkOutStatus === "EARLY") outStatusDisplay = "Early Leave";
          else if (item.checkOutStatus === "LEAVE")
            outStatusDisplay = "Leave (Half Day)";
          else outStatusDisplay = "On Time";
        } else {
          outStatusDisplay = "On Time";
        }
      } else {
        const recordDate = new Date(item.workDate).toISOString().split("T")[0];
        const todayDate = new Date().toISOString().split("T")[0];
        if (recordDate === todayDate) {
          outStatusDisplay = "Still Working";
        } else {
          outStatusDisplay = "Missing Check-out";
        }
      }

      // 3. ชั่วโมงทำงาน
      let workingHours = "-";
      if (item.checkInTime && item.checkOutTime) {
        const diffMs = new Date(item.checkOutTime) - new Date(item.checkInTime);
        const hrs = Math.floor(diffMs / 3600000);
        const mins = Math.floor((diffMs % 3600000) / 60000);
        workingHours = `${hrs}h ${mins}m`;
      }

      return {
        ...item,
        employeeName: `${item.employee.firstName} ${item.employee.lastName}`,
        dateDisplay: formatShortDate(item.workDate),
        checkInDisplay: formatThaiTime(item.checkInTime),
        checkOutDisplay: item.checkOutTime
          ? formatThaiTime(item.checkOutTime)
          : "-",

        inStatus: inStatusDisplay,
        outStatus: outStatusDisplay,

        duration: workingHours,
        note: item.note || "-",
      };
    });

    res.json(formattedRecords);
  } catch (error) {
    console.error("GetAllAttendance Error:", error);
    res.status(500).json({ error: "Data retrieval failed." });
  }
};

// ฟังก์ชันสำหรับดึงประวัติพนักงานรายคน (ใช้โดย HR)
exports.getUserHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = Number(id);

    if (isNaN(employeeId))
      return res.status(400).json({ error: "Invalid Employee ID" });

    // 1. ดึงข้อมูล
    const [history, employee] = await Promise.all([
      prisma.timeRecord.findMany({
        where: { employeeId: employeeId },
        orderBy: { workDate: "desc" },
      }),
      prisma.employee.findUnique({
        where: { id: employeeId },
        select: { role: true },
      }),
    ]);

    if (!employee) return res.status(404).json({ error: "Employee not found" });

    // 2. ดึง Config (เอาไว้แค่โชว์ standardConfig ถ้าต้องการ)
    const config = await prisma.workConfiguration.findUnique({
      where: { role: employee.role },
    });

    const formattedHistory = history.map((item) => {
      // 3. คำนวณชั่วโมงทำงาน
      let workingHours = "-";
      if (item.checkInTime && item.checkOutTime) {
        const diffMs = new Date(item.checkOutTime) - new Date(item.checkInTime);
        const hrs = Math.floor(diffMs / 3600000);
        const mins = Math.floor((diffMs % 3600000) / 60000);
        workingHours = `${hrs}h ${mins}m`;
      }

      // 4. ✅ Logic ขาเข้า (อ่านจาก DB)
      let inStatusDisplay = "On Time";
      if (item.checkInStatus) {
        if (item.checkInStatus === "LATE") inStatusDisplay = "Late";
        else if (item.checkInStatus === "LEAVE")
          inStatusDisplay = "Leave (Half Day)";
        else if (item.checkInStatus === "ABSENT") inStatusDisplay = "Absent";
        else inStatusDisplay = "On Time";
      } else {
        inStatusDisplay = item.isLate ? "Late" : "On Time";
      }

      // 5. ✅ Logic ขาออก (อ่านจาก DB + เช็ค Missing Check-out)
      let outStatusDisplay = "-";
      if (item.checkOutTime) {
        if (item.checkOutStatus) {
          if (item.checkOutStatus === "EARLY") outStatusDisplay = "Early Leave";
          else if (item.checkOutStatus === "LEAVE")
            outStatusDisplay = "Leave (Half Day)";
          else outStatusDisplay = "Normal";
        } else {
          outStatusDisplay = "Normal";
        }
      } else {
        // ถ้ายังไม่ Check-out ให้ดูว่าเป็นวันเก่าไหม
        const recordDate = new Date(item.workDate).toISOString().split("T")[0];
        const todayDate = new Date().toISOString().split("T")[0];
        if (recordDate === todayDate) {
          outStatusDisplay = "Still Working";
        } else {
          outStatusDisplay = "Missing Check-out";
        }
      }

      return {
        ...item,
        dateDisplay: formatShortDate(item.workDate),
        checkInDisplay: formatThaiTime(item.checkInTime),
        checkOutDisplay: item.checkOutTime
          ? formatThaiTime(item.checkOutTime)
          : "-",

        inStatus: inStatusDisplay,
        outStatus: outStatusDisplay,

        duration: workingHours,
        note: item.note || "-",
      };
    });

    res.json(formattedHistory);
  } catch (error) {
    console.error("GetUserHistory Error:", error);
    res.status(500).json({ error: "Data retrieval failed." });
  }
};

// HR: TEAM TODAY ATTENDANCE (ACTIVE ONLY)
exports.getTeamTodayAttendance = async (req, res) => {
  try {
    const todayStart = getThaiStartOfDay();

    // 1) ดึงข้อมูล
    const [employees, todayRecords] = await Promise.all([
      prisma.employee.findMany({
        where: { isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
        },
        orderBy: { id: "asc" },
      }),
      prisma.timeRecord.findMany({
        where: { workDate: { gte: todayStart } },
        orderBy: { id: "desc" },
      }),
    ]);

    // 2) Map Record
    const recordMap = new Map();
    for (const r of todayRecords) {
      if (!recordMap.has(r.employeeId)) recordMap.set(r.employeeId, r);
    }

    // 3) ผสมข้อมูล
    const result = employees.map((emp) => {
      const r = recordMap.get(emp.id);

      // ✅ Logic ขาเข้า
      let inStatus = "Waiting";
      if (r?.checkInTime) {
        if (r.checkInStatus) {
          if (r.checkInStatus === "LATE") inStatus = "Late";
          else if (r.checkInStatus === "LEAVE") inStatus = "Leave";
          else inStatus = "On Time";
        } else {
          inStatus = r.isLate ? "Late" : "On Time";
        }
      }

      // ✅ Logic ขาออก
      let outStatus = "-";
      if (r?.checkOutTime) {
        if (r.checkOutStatus) {
          if (r.checkOutStatus === "EARLY") outStatus = "Early Leave";
          else if (r.checkOutStatus === "LEAVE") outStatus = "Leave (PM)";
          else outStatus = "Normal";
        } else {
          outStatus = "Normal";
        }
      }

      // คำนวณ Working Hours
      let duration = "-";
      if (r?.checkInTime) {
        const endTime = r.checkOutTime ? new Date(r.checkOutTime) : new Date();
        const diffMs = endTime - new Date(r.checkInTime);
        const hrs = Math.floor(diffMs / 3600000);
        const mins = Math.floor((diffMs % 3600000) / 60000);
        duration = `${hrs}h ${mins}m`;
      }

      return {
        employeeId: emp.id,
        fullName: `${emp.firstName} ${emp.lastName}`,
        role: emp.role,
        isActive: emp.isActive,

        checkInTimeDisplay: r?.checkInTime
          ? formatThaiTime(r.checkInTime)
          : null,
        checkOutTimeDisplay: r?.checkOutTime
          ? formatThaiTime(r.checkOutTime)
          : null,

        inStatus: inStatus,
        outStatus: outStatus,

        duration: duration,
        state: !r?.checkInTime
          ? "ABSENT"
          : !r?.checkOutTime
          ? "WORKING"
          : "COMPLETED",
        note: r?.note || null,
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
      error: "Team data retrieval failed today.",
    });
  }
};

// HR: CHECK-IN EMPLOYEE
exports.hrCheckInEmployee = async (req, res) => {
  try {
    const employeeId = Number(req.params.employeeId);
    const hrId = req.user.id;
    const { note } = req.body;
    const now = new Date();
    
    // --- 1. เพิ่ม: ตรวจสอบวันหยุด (ให้เหมือน User Check-in) ---
    const { isWeekend, isHoliday, holidayName } = await checkIsHolidayOrWeekend(now);
    const isSpecialDay = isWeekend || isHoliday;
    
    const todayStart = getThaiStartOfDay();

    if (!employeeId)
      return res.status(400).json({ error: "Invalid Employee ID" });

    // 2. หาข้อมูลพนักงาน
    const [employee, existingRecord] = await Promise.all([
      prisma.employee.findUnique({
        where: { id: employeeId },
        select: { role: true, firstName: true, lastName: true },
      }),
      prisma.timeRecord.findFirst({
        where: {
          employeeId,
          workDate: { gte: todayStart },
        },
        orderBy: { id: "desc" },
      }),
    ]);

    if (!employee)
      return res.status(404).json({ error: "Employee not found." });
    
    // HR อาจจะต้องการแก้เวลาให้พนักงานที่ Check-in ไปแล้ว แต่ในที่นี้ Logic เดิมคือห้ามซ้ำ
    if (existingRecord?.checkInTime) {
      return res
        .status(400)
        .json({ error: "This employee has already clocked in for today." });
    }

    // --- เช็คใบลา ---
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    const approvedLeave = await prisma.leaveRequest.findFirst({
      where: {
        employeeId: employeeId,
        status: "Approved",
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart },
      },
    });

    let isHalfMorningLeave = false;
    if (approvedLeave) {
      if (
        approvedLeave.startDuration === "HalfMorning" ||
        approvedLeave.endDuration === "HalfMorning"
      ) {
        isHalfMorningLeave = true;
      }
    }

    // 3. ดึง Config และคำนวณเวลาเข้างาน
    const config = await prisma.workConfiguration.findUnique({
      where: { role: employee.role },
    });
    const startHour = config ? config.startHour : 9;
    const startMin = config ? config.startMin : 0;
    const endHour = config ? config.endHour : 18;
    const endMin = config ? config.endMin : 0;

    const standardStartTime = new Date(todayStart);
    standardStartTime.setHours(todayStart.getHours() + startHour);
    standardStartTime.setMinutes(startMin);

    const standardEndTime = new Date(todayStart);
    standardEndTime.setHours(todayStart.getHours() + endHour);
    standardEndTime.setMinutes(endMin);

    // กำหนดเวลาที่ "ต้องมา"
    let expectedCheckInTime = standardStartTime;

    // --- 🔥 แก้ไข LOGIC ตรงนี้ (ให้เหมือน User Check-in) ---
    // ไม่ต้องเช็ค now < noon แล้ว เพราะถ้าลาเช้า เป้าหมายคือเข้างานบ่าย
    // การมาตอนเช้าคือกำไร (มาก่อนเวลา) ไม่ควรนับว่าสาย
    if (isHalfMorningLeave) {
       expectedCheckInTime = calculateMidpoint(standardStartTime, standardEndTime);
    }

    // ✅ Logic กำหนด Status
    let isLate = false;
    let checkInStatusEnum = "ON_TIME";

    if (isSpecialDay) {
      // วันหยุด HR กดให้ = On Time เสมอ (หรือจะเป็น OT ก็แล้วแต่ Business Logic)
      checkInStatusEnum = "ON_TIME";
    } else {
      if (now > expectedCheckInTime) {
        isLate = true;
        checkInStatusEnum = "LATE";
      } else {
        isLate = false;
        checkInStatusEnum = "ON_TIME";
      }
    }

    // สร้างข้อความ Status Text
    let statusText = "On Time";
    if (isSpecialDay) {
        statusText = isHoliday ? `Holiday (${holidayName})` : "Weekend Work";
    } else if (isLate) {
        statusText = "Late";
    } else {
        // กรณีไม่สาย
        if (isHalfMorningLeave) {
             if (now < standardStartTime) {
                 statusText = "Full Day (Worked on Morning Leave)"; 
             } else if (now < new Date(todayStart).setHours(12,0,0,0)) {
                 statusText = "Early Arrival (Morning)";
             } else {
                 statusText = "Half Day (Afternoon Shift)";
             }
        } else {
             statusText = "On Time";
        }
    }

    // 4. Transaction
    const result = await prisma.$transaction(async (tx) => {
      let record;
      // ใส่ Status Text ลงใน Note
      const logDetails = note ? `[${statusText}] ${note}` : `HR Clock-in: ${statusText}`;

      // (Logic create/update เดิมของคุณ)
      if (!existingRecord) {
        record = await tx.timeRecord.create({
          data: {
            employeeId,
            workDate: now,
            checkInTime: now,
            isLate: isLate,
            checkInStatus: checkInStatusEnum,
            note: logDetails,
          },
        });
      } else {
        // เผื่อเคสที่ update ได้ในอนาคต
        record = await tx.timeRecord.update({
          where: { id: existingRecord.id },
          data: {
            checkInTime: now,
            isLate: isLate,
            checkInStatus: checkInStatusEnum,
            note: logDetails,
          },
        });
      }

      await auditLog(tx, {
        action: "CREATE",
        modelName: "TimeRecord",
        recordId: record.id,
        userId: hrId,
        details: `HR manually clocked in for ${employee.firstName} ${employee.lastName} (${statusText})`,
        newValue: record,
        req: req,
      });

      return record;
    });

    // Socket Emit
    const io = req.app.get("io");
    if (io) {
      io.emit("new-audit-log", {
        id: Date.now(),
        action: "CREATE",
        modelName: "TimeRecord",
        recordId: result.id,
        performedBy: {
          firstName: req.user.firstName,
          lastName: req.user.lastName,
        },
        details: `HR Manual Check-in for: ${employee.firstName} ${employee.lastName} (${statusText})`,
        createdAt: now,
      });
    }

    return res.status(200).json({
      message: `HR Clock-in successful`,
      result: {
        employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        date: formatShortDate(now),
        time: formatThaiTime(now),
        isLate: isLate,
        status: statusText,
      },
      data: result,
    });
  } catch (error) {
    console.error("hrCheckInEmployee Error:", error);
    return res.status(500).json({ error: "HR Clock-in failed." });
  }
};

// HR: CHECK-OUT EMPLOYEE 
exports.hrCheckOutEmployee = async (req, res) => {
  try {
    const employeeId = Number(req.params.employeeId);
    const hrId = req.user.id;
    // รับ note จาก body เพิ่มเผื่อ HR อยากใส่เหตุผล
    const { note } = req.body; 

    if (!employeeId)
      return res.status(400).json({ error: "Invalid Employee ID" });

    const now = new Date();
    const todayStart = getThaiStartOfDay();

    // 1) ดึงข้อมูล
    const [employee, record] = await Promise.all([
      prisma.employee.findUnique({
        where: { id: employeeId },
        select: { role: true, firstName: true, lastName: true },
      }),
      prisma.timeRecord.findFirst({
        where: {
          employeeId,
          workDate: { gte: todayStart },
        },
        orderBy: { id: "desc" },
      }),
    ]);

    if (!employee)
      return res.status(404).json({ error: "Employee not found." });
    if (!record?.checkInTime)
      return res.status(400).json({ error: "Check-in record not found." });
    if (record.checkOutTime)
      return res.status(400).json({ error: "Already checked out." });

    // --- เช็คใบลา ---
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    const approvedLeave = await prisma.leaveRequest.findFirst({
      where: {
        employeeId: employeeId,
        status: "Approved",
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart },
      },
    });

    let isHalfAfternoonLeave = false;
    if (approvedLeave) {
      if (
        approvedLeave.startDuration === "HalfAfternoon" ||
        approvedLeave.endDuration === "HalfAfternoon"
      ) {
        isHalfAfternoonLeave = true;
      }
    }

    // 2) คำนวณเวลาออก
    const config = await prisma.workConfiguration.findUnique({
      where: { role: employee.role },
    });

    const startHour = config ? config.startHour : 9;
    const startMin = config ? config.startMin : 0;
    const endHour = config ? config.endHour : 18;
    const endMin = config ? config.endMin : 0;

    const standardStartTime = new Date(todayStart);
    standardStartTime.setHours(todayStart.getHours() + startHour);
    standardStartTime.setMinutes(startMin);

    const standardEndTime = new Date(todayStart);
    standardEndTime.setHours(todayStart.getHours() + endHour);
    standardEndTime.setMinutes(endMin);

    let expectedCheckOutTime = standardEndTime;

    // 🔥 LOGIC: ถ้าลาครึ่งบ่าย -> เวลาเลิกงานคือ "กึ่งกลางวัน"
    if (isHalfAfternoonLeave) {
      expectedCheckOutTime = calculateMidpoint(
        standardStartTime,
        standardEndTime
      );
    }

    let isEarlyLeave = false;
    let checkOutStatusEnum = "NORMAL";

    if (now < expectedCheckOutTime) {
      isEarlyLeave = true;
      checkOutStatusEnum = "EARLY";
    } else {
      isEarlyLeave = false;
      checkOutStatusEnum = "NORMAL";
    }

    // ❌ เอา Logic เดิมที่บังคับ LEAVE ออก
    // if (isHalfAfternoonLeave) { checkOutStatusEnum = isEarlyLeave ? "EARLY" : "LEAVE"; }

    const expectedTimeStr = formatThaiTime(expectedCheckOutTime);
    const statusText = isHalfAfternoonLeave
      ? isEarlyLeave
        ? `Half Day (Early < ${expectedTimeStr})`
        : "Half Day (Afternoon Leave)"
      : isEarlyLeave
      ? "Early Leave"
      : "Normal";

    // 3) Transaction
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.timeRecord.update({
        where: { id: record.id },
        data: {
          checkOutTime: now,
          checkOutStatus: checkOutStatusEnum, // ✅ NORMAL หรือ EARLY
          note: record.note
            ? `${record.note} (Out by HR: ${statusText})`
            : `Clocked out by HR: ${statusText}`,
        },
      });

      await auditLog(tx, {
        action: "UPDATE",
        modelName: "TimeRecord",
        recordId: updated.id,
        userId: hrId,
        details: `HR manually clocked out for ${employee.firstName} ${employee.lastName}. Status: ${statusText}`,
        oldValue: { checkOutTime: record.checkOutTime, note: record.note },
        newValue: { checkOutTime: updated.checkOutTime, note: updated.note },
        req: req,
      });

      return updated;
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("new-audit-log", {
        id: Date.now(),
        action: "UPDATE",
        modelName: "TimeRecord",
        recordId: result.id,
        performedBy: {
          firstName: req.user.firstName,
          lastName: req.user.lastName,
        },
        details: `HR Manual Check-out for: ${employee.firstName} ${employee.lastName} (${statusText})`,
        createdAt: now,
      });
    }

    return res.status(200).json({
      message: "HR Clock-out successful",
      result: {
        employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        checkOutTime: formatThaiTime(now),
        isEarlyLeave: isEarlyLeave,
        status: statusText,
      },
      data: result,
    });
  } catch (error) {
    console.error("hrCheckOutEmployee Error:", error);
    return res.status(500).json({ error: "HR Clock-out failed." });
  }
};

exports.updateWorkConfig = async (req, res) => {
  try {
    const { role, startHour, startMin, endHour, endMin } = req.body;
    const hrId = req.user.id;

    // 1. ตรวจสอบความถูกต้องของข้อมูล (เพิ่มเช็คนาที)
    if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) {
      return res.status(400).json({ error: "ชั่วโมงต้องอยู่ระหว่าง 0-23" });
    }
    if (startMin < 0 || startMin > 59 || endMin < 0 || endMin > 59) {
      return res.status(400).json({ error: "นาทีต้องอยู่ระหว่าง 0-59" });
    }

    const detailsText = `HR แก้ไขเวลาทำงานของ Role: ${role} เป็น ${startHour}:${String(
      startMin
    ).padStart(2, "0")} - ${endHour}:${String(endMin).padStart(2, "0")}`;

    // 🚀 2. ใช้ Transaction (เพื่อให้ Log กับ Data ไปพร้อมกัน)
    const updatedConfig = await prisma.$transaction(async (tx) => {
      // อัปเดตลง Database
      const config = await tx.workConfiguration.upsert({
        where: { role: role },
        update: { startHour, startMin, endHour, endMin },
        create: { role, startHour, startMin, endHour, endMin },
      });

      // บันทึก Audit Log ลง Database (ใช้ tx)
      await auditLog(tx, {
        action: "UPDATE",
        modelName: "WorkConfiguration",
        recordId: config.id,
        userId: hrId,
        details: detailsText,
        newValue: config,
        req: req,
      });

      return config;
    });

    // ✅ 4. เพิ่มส่วนส่ง Real-time (Socket.io)
    const io = req.app.get("io");

    if (io) {
      io.emit("new-audit-log", {
        id: Date.now(),
        action: "UPDATE", // ใช้สีส้ม (Update)
        modelName: "WorkConfig",
        recordId: updatedConfig.id,
        performedBy: {
          firstName: req.user.firstName,
          lastName: req.user.lastName,
        },
        details: detailsText,
        createdAt: new Date(),
      });
    }

    res.json({
      success: true,
      message: `อัปเดตเวลาทำงานของ Role ${role} สำเร็จ`,
      data: updatedConfig,
    });
  } catch (error) {
    console.error("Update Config Error:", error);
    res.status(500).json({ error: "ไม่สามารถอัปเดตการตั้งค่าได้" });
  }
};

exports.getWorkConfigs = async (req, res) => {
  try {
    const configs = await prisma.workConfiguration.findMany({
      orderBy: { role: "asc" }, // เรียงลำดับ Role ให้สวยงาม
    });
    res.json({
      success: true,
      data: configs,
    });
  } catch (error) {
    console.error("Get Config Error:", error);
    res.status(500).json({ error: "ไม่สามารถดึงข้อมูลการตั้งค่าได้" });
  }
};
