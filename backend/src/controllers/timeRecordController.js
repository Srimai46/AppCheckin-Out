const prisma = require("../config/prisma");

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
    const { note } = req.body;
    const now = new Date();

    // 1. ตรวจสอบวันหยุด/เสาร์-อาทิตย์
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

    // 3. คำนวณเวลาสาย (เฉพาะวันทำงานปกติ)
    const config = await prisma.workConfiguration.findUnique({ where: { role: userRole } });
    const startHour = config ? config.startHour : 9;
    const startMin = config ? config.startMin : 0;

    const workStartTime = new Date(todayStart);
    workStartTime.setHours(todayStart.getHours() + startHour);
    workStartTime.setMinutes(startMin);

    // ✅ ถ้าเป็นวันหยุด/เสาร์อาทิตย์ จะไม่ถือว่าสายเด็ดขาด
    const isLate = isSpecialDay ? false : now > workStartTime;
    const statusText = isSpecialDay ? (isHoliday ? `Holiday (${holidayName})` : "Weekend Work") : (isLate ? "Late" : "On Time");

    // 4. บันทึกข้อมูล
    const record = await prisma.timeRecord.create({
      data: {
        employeeId: userId,
        workDate: now,
        checkInTime: now,
        isLate: isLate,
        note: isSpecialDay ? `[${statusText}] ${note || ""}` : (note || null),
      },
    });

    // 5. แจ้งเตือน HR เฉพาะวันทำงานปกติที่สาย
    if (isLate && !isSpecialDay) {
      const hrUsers = await prisma.employee.findMany({ where: { role: "HR" } });
      const lateMessage = `Employee ${req.user.firstName} ${req.user.lastName} is late (${formatThaiTime(now)})`;

      if (hrUsers.length > 0) {
        await prisma.notification.createMany({
          data: hrUsers.map(hr => ({
            employeeId: hr.id,
            notificationType: "LateWarning",
            message: lateMessage,
          })),
        });

        const io = req.app.get("io");
        if (io) {
          hrUsers.forEach(hr => {
            io.to(`user_${hr.id}`).emit("notification", { type: "LateWarning", message: lateMessage, timestamp: now });
          });
        }
      }
    }

    res.status(201).json({
      message: `Check-in successful ${isSpecialDay ? "(Non-working day)" : ""}`,
      result: { date: formatShortDate(now), time: formatThaiTime(now), status: statusText, isLate },
      data: record,
    });
  } catch (error) {
    res.status(500).json({ message: "Error occurred during check-in." });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const now = new Date();
    const todayStart = getThaiStartOfDay();

    const { isWeekend, isHoliday } = await checkIsHolidayOrWeekend(now);
    const isSpecialDay = isWeekend || isHoliday;

    const record = await prisma.timeRecord.findFirst({
      where: { employeeId: userId, workDate: { gte: todayStart } },
      orderBy: { id: "desc" },
    });

    if (!record) return res.status(400).json({ error: "Check-in record not found." });

    // คำนวณเวลาเลิกงาน
    const config = await prisma.workConfiguration.findUnique({ where: { role: userRole } });
    const endHour = config ? config.endHour : 18;
    const endMin = config ? config.endMin : 0;

    const workEndTime = new Date(todayStart);
    workEndTime.setHours(todayStart.getHours() + endHour);
    workEndTime.setMinutes(endMin);

    // ✅ ถ้าเป็นวันหยุด จะไม่ถือว่าเลิกก่อนเวลา (Early Leave)
    const isEarlyLeave = isSpecialDay ? false : now < workEndTime;

    const updatedRecord = await prisma.timeRecord.update({
      where: { id: record.id },
      data: { checkOutTime: now },
    });

    // แจ้งเตือน HR เฉพาะวันทำงานปกติที่กลับก่อน
    if (isEarlyLeave && !isSpecialDay) {
      const hrUsers = await prisma.employee.findMany({ where: { role: "HR" } });
      const earlyMsg = `Employee ${req.user.firstName} ${req.user.lastName} left early (${formatThaiTime(now)})`;

      if (hrUsers.length > 0) {
        await prisma.notification.createMany({
          data: hrUsers.map(hr => ({ employeeId: hr.id, notificationType: "EarlyLeaveWarning", message: earlyMsg })),
        });

        const io = req.app.get("io");
        if (io) {
          hrUsers.forEach(hr => {
            io.to(`user_${hr.id}`).emit("notification", { type: "EarlyLeaveWarning", message: earlyMsg, timestamp: now });
          });
        }
      }
    }

    res.json({
      message: "Clock-out successful",
      result: { checkOutTime: formatThaiTime(now), isEarlyLeave },
      data: updatedRecord,
    });
  } catch (error) {
    res.status(500).json({ error: "Error occurred during check-out." });
  }
};

exports.getMyHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // 1. ดึงข้อมูลเกณฑ์เวลาปัจจุบันของ Role นี้มาเพื่อแสดงผลเปรียบเทียบ
    const config = await prisma.workConfiguration.findUnique({
      where: { role: userRole },
    });

    const history = await prisma.timeRecord.findMany({
      where: { employeeId: userId },
      orderBy: { workDate: "desc" },
    });

    const formattedHistory = history.map((item) => {
      // คำนวณชั่วโมงทำงาน (ถ้ามีการ Check-out แล้ว)
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
        dateDisplay: formatShortDate(item.workDate),
        checkInTimeDisplay: formatThaiTime(item.checkInTime),
        checkOutTimeDisplay: item.checkOutTime
          ? formatThaiTime(item.checkOutTime)
          : "Not checked out yet",
        statusDisplay: item.isLate ? "Late" : "On time",
        workingHours: workingHours, // เพิ่มชั่วโมงทำงาน
        // ส่งเกณฑ์เวลา ณ ปัจจุบันไปด้วยเพื่อให้ Frontend รู้ว่าเกณฑ์คืออะไร
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

// ✅ ฟังก์ชันสำหรับดึงประวัติพนักงานรายคน (ใช้โดย HR)
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

// =============================
// ✅ HR: TEAM TODAY ATTENDANCE (ACTIVE ONLY)
// =============================
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

// =============================
// ✅ HR: CHECK-IN EMPLOYEE
// =============================
exports.hrCheckInEmployee = async (req, res) => {
  try {
    const employeeId = Number(req.params.employeeId);
    if (!employeeId) {
      return res.status(400).json({ error: "Invalid Employee ID" });
    }

    const { note } = req.body;
    const now = new Date();
    const todayStart = getThaiStartOfDay();

    // 1) หาข้อมูลพนักงาน และเช็คว่าวันนี้มี record หรือยัง
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

    if (!employee) {
      return res.status(404).json({ error: "Employee not found." });
    }

    if (existingRecord?.checkInTime) {
      return res.status(400).json({ error: "This employee has already clocked in for today." });
    }

    // 2) ดึง Config ตาม Role ของพนักงานคนนั้น
    const config = await prisma.workConfiguration.findUnique({
      where: { role: employee.role }
    });

    const startHour = config ? config.startHour : 9;
    const startMin = config ? config.startMin : 0;

    const workStartTime = new Date(todayStart);
    workStartTime.setHours(todayStart.getHours() + startHour);
    workStartTime.setMinutes(startMin);

    const isLate = now > workStartTime;

    // 3) บันทึกข้อมูล (ถ้าไม่มี record -> create, ถ้ามี -> update)
    let record;
    if (!existingRecord) {
      record = await prisma.timeRecord.create({
        data: {
          employeeId,
          workDate: now,
          checkInTime: now,
          isLate: isLate,
          note: note || `HR Clock-in for ${employee.firstName}`,
        },
      });
    } else {
      record = await prisma.timeRecord.update({
        where: { id: existingRecord.id },
        data: {
          checkInTime: now,
          isLate: isLate,
          note: note || existingRecord.note || "HR Updated Clock-in",
        },
      });
    }

    return res.status(200).json({
      message: isLate
        ? "HR Clock-in successful (Late)"
        : "HR Clock-in successful",
      result: {
        employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        date: formatShortDate(now),
        time: formatThaiTime(now),
        isLate: isLate,
        standardStartTime: `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`
      },
      data: record,
    });
  } catch (error) {
    console.error("hrCheckInEmployee Error:", error);
    return res.status(500).json({ error: "HR Clock-in failed." });
  }
};

// =============================
// ✅ HR: CHECK-OUT EMPLOYEE
// =============================
exports.hrCheckOutEmployee = async (req, res) => {
  try {
    const employeeId = Number(req.params.employeeId);
    if (!employeeId) {
      return res.status(400).json({ error: "Invalid Employee ID" });
    }

    const now = new Date();
    const todayStart = getThaiStartOfDay();

    // 1) ดึงข้อมูลพนักงาน (เพื่อหา Role) และ Record ของวันนี้พร้อมกัน
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

    // ตรวจสอบความถูกต้องของข้อมูล
    if (!employee) {
      return res.status(404).json({ error: "Employee not found." });
    }

    if (!record?.checkInTime) {
      return res.status(400).json({ error: "Check-in record not found for today. Please check in first." });
    }

    if (record.checkOutTime) {
      return res.status(400).json({ error: "This employee has already checked out." });
    }

    // 2) ดึงการตั้งค่าเวลาเลิกงานตาม Role ของพนักงาน
    const config = await prisma.workConfiguration.findUnique({
      where: { role: employee.role }
    });

    const endHour = config ? config.endHour : 18;
    const endMin = config ? config.endMin : 0;

    const workEndTime = new Date(todayStart);
    workEndTime.setHours(todayStart.getHours() + endHour);
    workEndTime.setMinutes(endMin);

    // ตรวจสอบว่า HR กดออกให้ก่อนเวลาเลิกงานหรือไม่
    const isEarlyLeave = now < workEndTime;

    // 3) บันทึกข้อมูลการเลิกงาน
    const updated = await prisma.timeRecord.update({
      where: { id: record.id },
      data: { 
        checkOutTime: now,
        // เพิ่ม Note อัตโนมัติเพื่อให้รู้ว่าทำรายการโดย HR
        note: record.note ? `${record.note} (Out by HR)` : "Clocked out by HR"
      },
    });

    return res.status(200).json({
      message: isEarlyLeave 
        ? "HR Clock-out successful (Early Leave)" 
        : "HR Clock-out successful",
      result: { 
        employeeId, 
        employeeName: `${employee.firstName} ${employee.lastName}`,
        checkOutTime: formatThaiTime(now),
        isEarlyLeave: isEarlyLeave,
        standardEndTime: `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`
      },
      data: updated,
    });
  } catch (error) {
    console.error("hrCheckOutEmployee Error:", error);
    return res.status(500).json({ error: "HR Clock-out failed." });
  }
};
