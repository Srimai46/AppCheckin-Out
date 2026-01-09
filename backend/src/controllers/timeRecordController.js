const prisma = require("../config/prisma");
const { auditLog } = require("../utils/logger");
// --- Helper Functions ---

const getThaiStartOfDay = () => {
  const now = new Date();
  // ปรับให้เป็นเวลาไทย (UTC+7) และตั้งค่าเป็น 00:00:00
  const start = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  start.setUTCHours(0, 0, 0, 0);
  return new Date(start.getTime() - (7 * 60 * 60 * 1000)); // กลับเป็น UTC สำหรับ Prisma
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
  const dateStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }); // ได้ "YYYY-MM-DD"
  const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

  const holiday = await prisma.holiday.findUnique({
    where: { date: targetDate },
  });

  return {
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    isHoliday: !!holiday,
    holidayName: holiday?.name || null
  };
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

    // --- 🔥 ส่วนที่เพิ่ม: เช็คว่ามีใบลาที่อนุมัติแล้วหรือไม่ ---
    const approvedLeave = await prisma.leaveRequest.findFirst({
        where: {
            employeeId: userId,
            status: 'Approved',
            startDate: { lte: now },
            endDate: { gte: now }
        }
    });

    // เช็คว่าเป็นลาครึ่งเช้าหรือไม่?
    let isHalfMorningLeave = false;
    if (approvedLeave) {
        if (approvedLeave.startDuration === 'HalfMorning' || approvedLeave.endDuration === 'HalfMorning') {
            isHalfMorningLeave = true;
        }
        // ถ้าลา Full Day อาจจะไม่ต้องนับสายเลยก็ได้ แล้วแต่นโยบาย
    }
    // -----------------------------------------------------

    // 3. คำนวณเวลาสาย
    const config = await prisma.workConfiguration.findUnique({ where: { role: userRole } });
    const startHour = config ? config.startHour : 9;
    const startMin = config ? config.startMin : 0;

    const workStartTime = new Date(todayStart);
    workStartTime.setHours(todayStart.getHours() + startHour);
    workStartTime.setMinutes(startMin);

    // Logic เดิม: const isLate = isSpecialDay ? false : now > workStartTime;
    // ✅ Logic ใหม่: ถ้าลาครึ่งเช้า ให้ถือว่า "ไม่สาย" (isLate = false) เสมอ
    let isLate = false;
    if (!isSpecialDay && !isHalfMorningLeave) {
         isLate = now > workStartTime;
    }

    const statusText = isSpecialDay 
      ? (isHoliday ? `Holiday (${holidayName})` : "Weekend Work") 
      : (isHalfMorningLeave ? "Half Day (Morning)" : (isLate ? "Late" : "On Time"));

    // 4. ใช้ Transaction บันทึกข้อมูล
    const result = await prisma.$transaction(async (tx) => {
      const record = await tx.timeRecord.create({
        data: {
          employeeId: userId,
          workDate: now,
          checkInTime: now,
          isLate: isLate,
          note: isSpecialDay ? `[${statusText}] ${note || ""}` : (note || null),
          checkInLat: location?.lat ? parseFloat(location.lat) : null,
          checkInLng: location?.lng ? parseFloat(location.lng) : null,
        },
      });

      await auditLog(tx, {
        action: "CREATE",
        modelName: "TimeRecord",
        recordId: record.id,
        userId: userId,
        details: `Employee checked in: ${statusText}`,
        newValue: record,
        req: req
      });

      return record;
    });

    // 5. & 6. Send Socket IO
    const io = req.app.get("io");
    if (io) {
      io.emit("new-audit-log", {
        id: Date.now(),
        action: "CREATE",
        modelName: "TimeRecord",
        recordId: result.id,
        performedBy: { firstName: req.user.firstName, lastName: req.user.lastName },
        details: `Employee checked in: ${statusText}`,
        createdAt: now
      });
    }

    // 7. แจ้งเตือน HR (กรณีสาย)
    // ✅ แจ้งเฉพาะตอนที่สายจริงๆ (ถ้ามีลาครึ่งเช้า isLate จะเป็น false แล้ว HR จะไม่โดนสแปม)
    if (isLate && !isSpecialDay) {
      const hrUsers = await prisma.employee.findMany({ where: { role: "HR" } });
      const lateMessage = `Employee ${req.user.firstName} ${req.user.lastName} is late (${formatThaiTime(now)})`;

      if (hrUsers.length > 0) {
        await prisma.notification.createMany({
          data: hrUsers.map(hr => ({
            employeeId: hr.id,
            notificationType: "LateWarning",
            message: lateMessage,
            relatedEmployeeId: userId,
          })),
        });

        if (io) {
          io.to("hr_group").emit("notification_refresh");
        }
      }
    }

    res.status(201).json({
      message: `Check-in successful`,
      result: { 
        date: formatShortDate(now), 
        time: formatThaiTime(now), 
        status: statusText, 
        isLate, 
        location 
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

    // ค้นหา Record ของวันนี้
    const record = await prisma.timeRecord.findFirst({
      where: { employeeId: userId, workDate: { gte: todayStart } },
      orderBy: { id: "desc" },
    });

    if (!record) return res.status(400).json({ error: "Check-in record not found." });
    if (record.checkOutTime) return res.status(400).json({ error: "You have already checked out." });

    // --- 🔥 ส่วนที่เพิ่ม: เช็คว่ามีใบลาครึ่งบ่ายที่อนุมัติแล้วหรือไม่ ---
    const approvedLeave = await prisma.leaveRequest.findFirst({
        where: {
            employeeId: userId,
            status: 'Approved',
            startDate: { lte: now },
            endDate: { gte: now }
        }
    });

    let isHalfAfternoonLeave = false;
    if (approvedLeave) {
        if (approvedLeave.startDuration === 'HalfAfternoon' || approvedLeave.endDuration === 'HalfAfternoon') {
            isHalfAfternoonLeave = true;
        }
    }
    // -----------------------------------------------------------

    // คำนวณเวลาเลิกงาน
    const config = await prisma.workConfiguration.findUnique({ where: { role: userRole } });
    const endHour = config ? config.endHour : 18;
    const endMin = config ? config.endMin : 0;

    const workEndTime = new Date(todayStart);
    workEndTime.setHours(todayStart.getHours() + endHour);
    workEndTime.setMinutes(endMin);

    // Logic เดิม: const isEarlyLeave = isSpecialDay ? false : now < workEndTime;
    // ✅ Logic ใหม่: ถ้าลาครึ่งบ่าย ให้ถือว่า "ไม่กลับก่อน" (isEarlyLeave = false) เสมอ
    let isEarlyLeave = false;
    if (!isSpecialDay && !isHalfAfternoonLeave) {
        isEarlyLeave = now < workEndTime;
    }

    const statusText = isHalfAfternoonLeave ? "Half Day (Afternoon)" : (isEarlyLeave ? "Early Leave" : "On Time");

    // 2. ใช้ Transaction บันทึกข้อมูล
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.timeRecord.update({
        where: { id: record.id },
        data: { 
          checkOutTime: now,
          checkOutLat: location?.lat ? parseFloat(location.lat) : null,
          checkOutLng: location?.lng ? parseFloat(location.lng) : null,
        },
      });

      await auditLog(tx, {
        action: "UPDATE",
        modelName: "TimeRecord",
        recordId: updated.id,
        userId: userId,
        details: `Employee checked out: ${statusText}`,
        oldValue: { checkOutTime: record.checkOutTime },
        newValue: { checkOutTime: updated.checkOutTime },
        req: req
      });

      return updated;
    });

    // Send Socket IO
    const io = req.app.get("io");
    if (io) {
      io.emit("new-audit-log", {
        id: Date.now(),
        action: "UPDATE",
        modelName: "TimeRecord",
        recordId: result.id,
        performedBy: { firstName: req.user.firstName, lastName: req.user.lastName },
        details: `Employee checked out: ${statusText}`,
        createdAt: now
      });
    }

    // 4. แจ้งเตือน HR (กรณีกลับก่อนเวลา)
    // ✅ แจ้งเฉพาะถ้าไม่ได้ลาครึ่งบ่าย
    if (isEarlyLeave && !isSpecialDay) {
      const hrUsers = await prisma.employee.findMany({ where: { role: "HR" } });
      const earlyMsg = `Employee ${req.user.firstName} ${req.user.lastName} left early (${formatThaiTime(now)})`;

      if (hrUsers.length > 0) {
        await prisma.notification.createMany({
          data: hrUsers.map((hr) => ({
            employeeId: hr.id,
            notificationType: "EarlyLeaveWarning",
            message: earlyMsg,
            relatedEmployeeId: userId,
          })),
        });

        if (io) {
          io.to("hr_group").emit("notification_refresh");
        }
      }
    }

    res.json({
      message: "Clock-out successful",
      result: { 
        checkOutTime: formatThaiTime(now), 
        isEarlyLeave,
        status: statusText,
        location 
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
    
    // ✅ รับ Query Params (เหมือน getStats)
    const { year, month } = req.query; 

    // 1. ดึง Config
    const config = await prisma.workConfiguration.findUnique({
      where: { role: userRole },
    });

    // ✅ 2. สร้างเงื่อนไขเวลา (Filter Logic)
    let dateCondition = {};
    
    if (year) {
      const targetYear = parseInt(year);
      let startDate, endDate;

      if (month && month !== 'All') {
        const m = parseInt(month) - 1;
        startDate = new Date(Date.UTC(targetYear, m, 1));
        endDate = new Date(Date.UTC(targetYear, m + 1, 0, 23, 59, 59));
      } else {
        startDate = new Date(Date.UTC(targetYear, 0, 1));
        endDate = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59));
      }
      
      dateCondition = {
        workDate: {
          gte: startDate,
          lte: endDate
        }
      };
    }

    // 3. Query โดยใส่เงื่อนไขวันที่เข้าไป
    const history = await prisma.timeRecord.findMany({
      where: { 
        employeeId: userId,
        ...dateCondition // ✅ ใส่ Filter ตรงนี้
      },
      orderBy: { workDate: "desc" },
    });

    const formattedHistory = history.map((item) => {
      // ... (Logic การจัด Format เดิมของคุณ ใช้ต่อได้เลย ไม่ต้องแก้) ...
       let workingHours = "-";
      if (item.checkInTime && item.checkOutTime) {
        const diffInMs =
          new Date(item.checkOutTime) - new Date(item.checkInTime);
        const hours = Math.floor(diffInMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
        workingHours = `${hours} Hours ${minutes} Min`;
      }

      return {
        ...item,
        // (Helper function พวก formatShortDate ต้อง import มาให้ครบนะครับ)
        dateDisplay: item.workDate.toISOString().split('T')[0], 
        checkInTimeDisplay: item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString('th-TH') : "-",
        checkOutTimeDisplay: item.checkOutTime
          ? new Date(item.checkOutTime).toLocaleTimeString('th-TH')
          : "Not checked out yet",
        statusDisplay: item.isLate ? "Late" : "On time",
        workingHours: workingHours,
        standardConfig: config
          ? {
              start: `${String(config.startHour).padStart(2, "0")}:${String(config.startMin).padStart(2, "0")}`,
              end: `${String(config.endHour).padStart(2, "0")}:${String(config.endMin).padStart(2, "0")}`,
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

    // 1. ดึงข้อมูลบันทึกเวลา พร้อมข้อมูลพนักงานและ Role
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
      prisma.workConfiguration.findMany(), // ดึงค่า Config ทั้งหมดมาไว้เทียบ
    ]);

    const formattedRecords = records.map((item) => {
      // 2. ค้นหา Config ของ Role พนักงานคนนั้น
      const userConfig = configs.find((c) => c.role === item.employee.role);
      const endHour = userConfig ? userConfig.endHour : 18;
      const endMin = userConfig ? userConfig.endMin : 0;

      // 3. เช็คสถานะการเลิกงาน (Early Leave)
      let outStatusDisplay = "-";
      if (item.checkOutTime) {
        const workEndTime = new Date(item.workDate);

        workEndTime.setHours(endHour, endMin, 0, 0);

        outStatusDisplay =
          new Date(item.checkOutTime) < workEndTime ? "Early Leave" : "On Time";
      } else {
        outStatusDisplay = "Still Working";
      }

      // 4. คำนวณชั่วโมงทำงาน
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
        inStatus: item.isLate ? "Late" : "On Time",
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

    if (isNaN(employeeId)) {
      return res.status(400).json({ error: "Invalid Employee ID" });
    }

    // 1. ดึงข้อมูลประวัติ และข้อมูลพนักงานเพื่อหา Role
    const [history, employee] = await Promise.all([
      prisma.timeRecord.findMany({
        where: { employeeId: employeeId },
        orderBy: { workDate: "desc" },
      }),
      prisma.employee.findUnique({
        where: { id: employeeId },
        select: { role: true }
      })
    ]);

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // 2. ดึง Config ของ Role นั้นมาเพื่อเทียบ Early Leave
    const config = await prisma.workConfiguration.findUnique({
      where: { role: employee.role }
    });

    const endHour = config ? config.endHour : 18;
    const endMin = config ? config.endMin : 0;

    const formattedHistory = history.map((item) => {
      // 3. คำนวณชั่วโมงทำงาน
      let workingHours = "-";
      if (item.checkInTime && item.checkOutTime) {
        const diffMs = new Date(item.checkOutTime) - new Date(item.checkInTime);
        const hrs = Math.floor(diffMs / 3600000);
        const mins = Math.floor((diffMs % 3600000) / 60000);
        workingHours = `${hrs}h ${mins}m`;
      }

      // 4. เช็คสถานะการเลิกงาน
      let outStatusDisplay = "-";
      if (item.checkOutTime) {
        const workEndTime = new Date(item.workDate);
        workEndTime.setHours(endHour, endMin, 0, 0);
        outStatusDisplay = new Date(item.checkOutTime) < workEndTime ? "Early Leave" : "On Time";
      } else {
        outStatusDisplay = "Still Working";
      }

      return {
        ...item,
        dateDisplay: formatShortDate(item.workDate),
        checkInDisplay: formatThaiTime(item.checkInTime),
        checkOutDisplay: item.checkOutTime ? formatThaiTime(item.checkOutTime) : "-",
        inStatus: item.isLate ? "Late" : "On Time",
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

    // 1) ดึงข้อมูลพร้อมกันเพื่อประสิทธิภาพ (Active employees + Today's records + Role configs)
    const [employees, todayRecords, configs] = await Promise.all([
      prisma.employee.findMany({
        where: { isActive: true },
        select: { id: true, firstName: true, lastName: true, role: true, isActive: true },
        orderBy: { id: "asc" },
      }),
      prisma.timeRecord.findMany({
        where: { workDate: { gte: todayStart } },
        orderBy: { id: "desc" },
      }),
      prisma.workConfiguration.findMany()
    ]);

    // 2) จัดการ Record ล่าสุดของแต่ละคน (กรณีมีบันทึกซ้ำ)
    const recordMap = new Map();
    for (const r of todayRecords) {
      if (!recordMap.has(r.employeeId)) recordMap.set(r.employeeId, r);
    }

    // 3) ผสมข้อมูล (Merge) และคำนวณสถานะละเอียด
    const result = employees.map((emp) => {
      const r = recordMap.get(emp.id);
      const userConfig = configs.find(c => c.role === emp.role);
      
      const endHour = userConfig ? userConfig.endHour : 18;
      const endMin = userConfig ? userConfig.endMin : 0;

      // คำนวณ Early Leave
      let outStatus = "-";
      if (r?.checkOutTime) {
        const workEndTime = new Date(r.workDate);
        workEndTime.setHours(endHour, endMin, 0, 0);
        outStatus = new Date(r.checkOutTime) < workEndTime ? "Early Leave" : "On Time";
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
        
        checkInTimeDisplay: r?.checkInTime ? formatThaiTime(r.checkInTime) : null,
        checkOutTimeDisplay: r?.checkOutTime ? formatThaiTime(r.checkOutTime) : null,
        
        inStatus: r?.checkInTime ? (r.isLate ? "Late" : "On Time") : "Waiting",
        outStatus: outStatus,
        duration: duration,
        
        // สถานะหลักสำหรับ Filter หรือทำสี UI: Absent, Working, Completed
        state: !r?.checkInTime ? "ABSENT" : !r?.checkOutTime ? "WORKING" : "COMPLETED",
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
    const todayStart = getThaiStartOfDay();

    if (!employeeId) return res.status(400).json({ error: "Invalid Employee ID" });

    // 1) หาข้อมูลพนักงาน และเช็ค record
    const [employee, existingRecord] = await Promise.all([
      prisma.employee.findUnique({
        where: { id: employeeId },
        select: { role: true, firstName: true, lastName: true }
      }),
      prisma.timeRecord.findFirst({
        where: {
          employeeId,
          workDate: { gte: todayStart },
        },
        orderBy: { id: "desc" },
      })
    ]);

    if (!employee) return res.status(404).json({ error: "Employee not found." });
    if (existingRecord?.checkInTime) {
      return res.status(400).json({ error: "This employee has already clocked in for today." });
    }

    // --- 🔥 เพิ่ม: เช็คใบลา ---
    const approvedLeave = await prisma.leaveRequest.findFirst({
        where: {
            employeeId: employeeId,
            status: 'Approved',
            startDate: { lte: now },
            endDate: { gte: now }
        }
    });

    let isHalfMorningLeave = false;
    if (approvedLeave) {
        if (approvedLeave.startDuration === 'HalfMorning' || approvedLeave.endDuration === 'HalfMorning') {
            isHalfMorningLeave = true;
        }
    }
    // -----------------------

    // 2) คำนวณสาย
    const config = await prisma.workConfiguration.findUnique({ where: { role: employee.role } });
    const startHour = config ? config.startHour : 9;
    const startMin = config ? config.startMin : 0;

    const workStartTime = new Date(todayStart);
    workStartTime.setHours(todayStart.getHours() + startHour);
    workStartTime.setMinutes(startMin);

    // ✅ Logic ใหม่: ถ้าลาครึ่งเช้า HR กดให้ก็ไม่สาย
    let isLate = false;
    if (!isHalfMorningLeave) {
        isLate = now > workStartTime;
    }
    
    const statusText = isHalfMorningLeave ? "Half Day (Morning)" : (isLate ? "Late" : "On Time");

    // 3) Transaction
    const result = await prisma.$transaction(async (tx) => {
      let record;
      const logDetails = note || `HR Clock-in for ${employee.firstName} ${employee.lastName}`;

      if (!existingRecord) {
        record = await tx.timeRecord.create({
          data: {
            employeeId,
            workDate: now,
            checkInTime: now,
            isLate: isLate,
            note: logDetails,
          },
        });
      } else {
        record = await tx.timeRecord.update({
          where: { id: existingRecord.id },
          data: {
            checkInTime: now,
            isLate: isLate,
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
        req: req
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
        performedBy: { firstName: req.user.firstName, lastName: req.user.lastName },
        details: `HR Manual Check-in for: ${employee.firstName} ${employee.lastName} (${statusText})`,
        createdAt: now
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
        status: statusText
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

    if (!employeeId) return res.status(400).json({ error: "Invalid Employee ID" });

    const now = new Date();
    const todayStart = getThaiStartOfDay();

    // 1) ดึงข้อมูล
    const [employee, record] = await Promise.all([
      prisma.employee.findUnique({
        where: { id: employeeId },
        select: { role: true, firstName: true, lastName: true }
      }),
      prisma.timeRecord.findFirst({
        where: {
          employeeId,
          workDate: { gte: todayStart },
        },
        orderBy: { id: "desc" },
      })
    ]);

    if (!employee) return res.status(404).json({ error: "Employee not found." });
    if (!record?.checkInTime) return res.status(400).json({ error: "Check-in record not found." });
    if (record.checkOutTime) return res.status(400).json({ error: "Already checked out." });

    // --- 🔥 เพิ่ม: เช็คใบลา ---
    const approvedLeave = await prisma.leaveRequest.findFirst({
        where: {
            employeeId: employeeId,
            status: 'Approved',
            startDate: { lte: now },
            endDate: { gte: now }
        }
    });

    let isHalfAfternoonLeave = false;
    if (approvedLeave) {
        if (approvedLeave.startDuration === 'HalfAfternoon' || approvedLeave.endDuration === 'HalfAfternoon') {
            isHalfAfternoonLeave = true;
        }
    }
    // -----------------------

    // 2) คำนวณเวลาออก
    const config = await prisma.workConfiguration.findUnique({
      where: { role: employee.role }
    });

    const endHour = config ? config.endHour : 18;
    const endMin = config ? config.endMin : 0;

    const workEndTime = new Date(todayStart);
    workEndTime.setHours(todayStart.getHours() + endHour);
    workEndTime.setMinutes(endMin);

    // ✅ Logic ใหม่: ถ้าลาครึ่งบ่าย HR กดให้ก็ไม่ Early Leave
    let isEarlyLeave = false;
    if (!isHalfAfternoonLeave) {
        isEarlyLeave = now < workEndTime;
    }
    
    const statusText = isHalfAfternoonLeave ? 'Half Day (Afternoon)' : (isEarlyLeave ? 'Early Leave' : 'Normal');

    // 3) Transaction
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.timeRecord.update({
        where: { id: record.id },
        data: { 
          checkOutTime: now,
          note: record.note ? `${record.note} (Out by HR)` : "Clocked out by HR"
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
        req: req
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
        performedBy: { firstName: req.user.firstName, lastName: req.user.lastName },
        details: `HR Manual Check-out for: ${employee.firstName} ${employee.lastName} (${statusText})`,
        createdAt: now
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
        standardEndTime: `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`
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

    // 1. ตรวจสอบความถูกต้องของข้อมูล
    if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) {
      return res.status(400).json({ error: "ชั่วโมงต้องอยู่ระหว่าง 0-23" });
    }

    // 2. อัปเดตลง Database 
    const updatedConfig = await prisma.workConfiguration.upsert({
      where: { role: role },
      update: { startHour, startMin, endHour, endMin },
      create: { role, startHour, startMin, endHour, endMin },
    });

    const detailsText = `HR แก้ไขเวลาทำงานของ Role: ${role} เป็น ${startHour}:${startMin} - ${endHour}:${endMin}`;

    // 3. บันทึก Audit Log ลง Database
    await auditLog(prisma, {
      action: "UPDATE",
      modelName: "WorkConfiguration",
      recordId: updatedConfig.id,
      userId: hrId,
      details: detailsText,
      newValue: updatedConfig,
      req: req
    });

    // ✅ 4. เพิ่มส่วนส่ง Real-time (Socket.io)
    const io = req.app.get("io");

    if (io) {
      io.emit("new-audit-log", {
        id: Date.now(),
        action: "UPDATE", // ใช้สีส้ม (Update)
        modelName: "WorkConfig", // ชื่อย่อ หรือชื่อเต็มก็ได้
        recordId: updatedConfig.id,
        performedBy: {
            firstName: req.user.firstName, 
            lastName: req.user.lastName
        },
        details: detailsText, // ใช้ข้อความเดียวกับที่ลง DB
        createdAt: new Date()
      });
    }

    res.json({
      success: true,
      message: `อัปเดตเวลาทำงานของ Role ${role} สำเร็จ`,
      data: updatedConfig
    });

  } catch (error) {
    console.error("Update Config Error:", error);
    res.status(500).json({ error: "ไม่สามารถอัปเดตการตั้งค่าได้" });
  }
};

exports.getWorkConfigs = async (req, res) => {
  try {
    const configs = await prisma.workConfiguration.findMany();
    res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    console.error("Get Config Error:", error);
    res.status(500).json({ error: "ไม่สามารถดึงข้อมูลการตั้งค่าได้" });
  }
};