const prisma = require("../config/prisma");

// --- Helper Functions ---
const formatDateStr = (date) => date.toISOString().split('T')[0];

const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

const isSameDay = (d1, d2) => formatDateStr(d1) === formatDateStr(d2);

// --- Main Controller ---
exports.getStats = async (req, res) => {
  try {
    const { year, month, employeeId } = req.query;
    const requesterId = req.user.id;
    const requesterRole = req.user.role; // Middleware แปลงเป็น String แล้ว ("HR"/"ADMIN")

    // 1. Security Check (เพิ่ม ADMIN)
    let targetId = requesterId;
    
    // ถ้าเป็น HR หรือ ADMIN สามารถดูของคนอื่นได้
    if (employeeId && (requesterRole === 'HR' || requesterRole === 'ADMIN')) {
      targetId = parseInt(employeeId, 10);
    } else if (employeeId && parseInt(employeeId, 10) !== requesterId) {
      // ถ้าเป็น User ธรรมดา ห้ามดูของคนอื่น
      return res.status(403).json({ error: "Access denied." });
    }

    // 2. Fetch Employee Info (✅ แก้ให้รองรับ Relation)
    const targetEmployee = await prisma.employee.findUnique({ 
        where: { id: targetId },
        select: { 
            id: true,
            firstName: true, 
            lastName: true, 
            joiningDate: true,
            resignationDate: true, 
            isActive: true,
            // ✅ ดึง Role ID และ Name
            roleId: true,
            role: { select: { name: true } }
        } 
    });

    if (!targetEmployee) return res.status(404).json({ error: "Employee not found" });

    // 3. Prepare Date Range (เหมือนเดิม)
    const targetYear = parseInt(year);
    let startDate, endDate;
    
    if (month && month !== 'All') {
      const m = parseInt(month) - 1; 
      startDate = new Date(Date.UTC(targetYear, m, 1));
      endDate = new Date(Date.UTC(targetYear, m + 1, 0, 23, 59, 59));
    } else {
      startDate = new Date(Date.UTC(targetYear, 0, 1));
      endDate = new Date(targetYear, 11, 31, 23, 59, 59);
    }

    // Logic A & B: Adjust Start/End Date (เหมือนเดิม)
    if (targetEmployee.joiningDate) {
        const joinDate = new Date(targetEmployee.joiningDate);
        joinDate.setHours(0, 0, 0, 0);
        if (joinDate > startDate) startDate = joinDate;
    }
    if (targetEmployee.resignationDate) {
        const resignDate = new Date(targetEmployee.resignationDate);
        resignDate.setHours(23, 59, 59, 999);
        if (resignDate < endDate) endDate = resignDate;
    }

    if (startDate > endDate) {
        return res.json({ /* ...Empty Response... */ });
    }

    const today = new Date();
    const loopEndDate = endDate; 

    // 4. Fetch Transaction Data
    const [timeRecords, leaves, holidays, realWorkConfig] = await Promise.all([
      prisma.timeRecord.findMany({
        where: { employeeId: targetId, workDate: { gte: startDate, lte: loopEndDate } }
      }),
      prisma.leaveRequest.findMany({
        where: { 
            employeeId: targetId, 
            status: 'Approved', 
            startDate: { lte: loopEndDate }, 
            endDate: { gte: startDate }
        },
        include: { leaveType: true }
      }),
      prisma.holiday.findMany({
        where: { date: { gte: startDate, lte: loopEndDate } }
      }),
      // ✅ แก้การดึง Config โดยใช้ roleId
      prisma.workConfiguration.findUnique({
        where: { roleId: targetEmployee.roleId }
      })
    ]);

    // ✅ Config เวลาทำงาน (ดึงจาก DB หรือ Default)
    const startHour = realWorkConfig?.startHour || 9;
    const startMin = realWorkConfig?.startMin || 0;
    const endHour = realWorkConfig?.endHour || 18;
    const endMin = realWorkConfig?.endMin || 0;

    // ✅ NEW: Config เวลาพัก (Break Time)
    // ถ้าใน DB ไม่มี ให้ Default เป็น 12:00 - 13:00
    const breakStartHour = realWorkConfig?.breakStartHour || 12;
    const breakStartMin = realWorkConfig?.breakStartMin || 0;
    const breakEndHour = realWorkConfig?.breakEndHour || 13;
    const breakEndMin = realWorkConfig?.breakEndMin || 0;

    // แปลงเวลาเป็นนาทีเพื่อคำนวณ
    const standardStartMinutes = (startHour * 60) + startMin;
    const standardEndMinutes = (endHour * 60) + endMin;
    
    // ✅ จุดตัดเวลาครึ่งวัน (ใช้เวลาพักมาคำนวณ)
    const morningEndMinutes = (breakStartHour * 60) + breakStartMin; // เลิกงานครึ่งเช้า (12:00)
    const afternoonStartMinutes = (breakEndHour * 60) + breakEndMin; // เริ่มงานครึ่งบ่าย (13:00)

    // 5. Initialization
    const stats = {
      totalDaysExpected: 0,
      present: 0,
      late: 0, lateMinutes: 0, lateDates: [],      
      earlyLeave: 0, earlyLeaveMinutes: 0, earlyLeaveDates: [],  
      leave: 0, leaveBreakdown: {}, leaveDates: [],
      absent: 0, absentDates: [],
      holidayDates: []      
    };

    // 6. Main Loop
    for (let d = new Date(startDate); d <= loopEndDate; d.setDate(d.getDate() + 1)) {
        const currentDateStr = formatDateStr(d);
        const isCurrentWeekend = isWeekend(d);
        const isFuture = d > today; 

        // Check Holiday
        const currentHoliday = holidays.find(h => formatDateStr(h.date) === currentDateStr);
        if (currentHoliday) {
            stats.holidayDates.push({ date: currentDateStr, name: currentHoliday.name });
        }

        const record = timeRecords.find(r => formatDateStr(r.workDate) === currentDateStr);
        
        const leave = leaves.find(l => {
            const start = new Date(l.startDate);
            const end = new Date(l.endDate);
            const dTime = d.getTime();
            const sTime = new Date(formatDateStr(start)).getTime();
            const eTime = new Date(formatDateStr(end)).getTime();
            return dTime >= sTime && dTime <= eTime;
        });

        // 🔥 Logic ตรวจสอบการลา
        let isHalfDayLeave = false;
        let isHalfMorning = false;   // ลาครึ่งเช้า (มาเข้างานบ่าย)
        let isHalfAfternoon = false; // ลาครึ่งบ่าย (กลับตอนเที่ยง)
        
        if (leave) {
            if (leave.startDuration === 'HalfMorning' || leave.endDuration === 'HalfMorning') {
                isHalfDayLeave = true;
                isHalfMorning = true; // ลาเช้า -> ต้องมาทำงานบ่าย
            } else if (leave.startDuration === 'HalfAfternoon' || leave.endDuration === 'HalfAfternoon') {
                isHalfDayLeave = true;
                isHalfAfternoon = true; // ลาบ่าย -> เลิกงานตอนพักเที่ยง
            }

            // Case 1: ลาเต็มวัน
            if (!isHalfDayLeave) {
                if (!record) {
                    if (!isCurrentWeekend && !currentHoliday) {
                        stats.leave++; 
                        const typeName = leave.leaveType.typeName;
                        stats.leaveBreakdown[typeName] = (stats.leaveBreakdown[typeName] || 0) + 1;
                    }
                    stats.leaveDates.push({ date: currentDateStr, type: leave.leaveType.typeName });
                    continue; // จบวัน
                }
            } 
            // Case 2: ลาครึ่งวัน
            else {
                if (!isCurrentWeekend && !currentHoliday) {
                    stats.leave += 0.5;
                    const typeName = leave.leaveType.typeName;
                    stats.leaveBreakdown[typeName] = (stats.leaveBreakdown[typeName] || 0) + 0.5;
                }
                stats.leaveDates.push({ date: currentDateStr, type: leave.leaveType.typeName + " (0.5)" });
            }
        }

        if ((isCurrentWeekend || currentHoliday) && !record) continue;
        if (isFuture) continue;

        stats.totalDaysExpected++; 

        // 🔥 Logic เช็คเวลาทำงาน
        if (record) {
            stats.present++;

            // กำหนด Expected Start/End Time
            let expectedStartMinutes = standardStartMinutes;
            let expectedEndMinutes = standardEndMinutes;

            // ✅ ปรับเวลาตามการลาครึ่งวัน (ใช้ Logic เวลาพัก)
            if (isHalfMorning) {
                // ลาเช้า: ต้องเข้างานตอน "หมดเวลาพัก" (13:00)
                expectedStartMinutes = afternoonStartMinutes; 
            }
            if (isHalfAfternoon) {
                // ลาบ่าย: เลิกงานได้ตอน "เริ่มเวลาพัก" (12:00)
                expectedEndMinutes = morningEndMinutes; 
            }

            // --- เช็คสาย (LATE) ---
            let isLate = false;
            if (record.checkInStatus) {
                isLate = (record.checkInStatus === 'LATE');
            } else {
                isLate = record.isLate; 
            }

            if (isLate) {
                stats.late++;
                stats.lateDates.push(currentDateStr);
                
                if (record.checkInTime) {
                    const inTime = new Date(record.checkInTime);
                    const localInTime = new Date(inTime.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
                    const inMinutes = (localInTime.getHours() * 60) + localInTime.getMinutes();
                    
                    if (inMinutes > expectedStartMinutes) {
                         stats.lateMinutes += (inMinutes - expectedStartMinutes);
                    }
                }
            }

            // --- เช็คกลับก่อน (EARLY) ---
            let isEarly = false;
            if (record.checkOutStatus) {
                isEarly = (record.checkOutStatus === 'EARLY');
            } else {
                if (record.checkOutTime) {
                    const outTime = new Date(record.checkOutTime);
                    const localOutTime = new Date(outTime.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
                    const outMinutes = (localOutTime.getHours() * 60) + localOutTime.getMinutes();
                    
                    // กลับก่อนเวลาที่กำหนด
                    if (outMinutes < expectedEndMinutes) isEarly = true;
                }
            }

            if (isEarly && record.checkOutTime) {
                stats.earlyLeave++;
                stats.earlyLeaveDates.push(currentDateStr);
                
                const outTime = new Date(record.checkOutTime);
                const localOutTime = new Date(outTime.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
                const outMinutes = (localOutTime.getHours() * 60) + localOutTime.getMinutes();
                
                if (outMinutes < expectedEndMinutes) {
                    stats.earlyLeaveMinutes += (expectedEndMinutes - outMinutes);
                }
            }

        } else {
            // Absent Logic
            if (isHalfDayLeave) {
                // ลาครึ่งวัน แต่ไม่มาตอกบัตรเลย = ขาดงาน (อีกครึ่งที่เหลือ)
                stats.absent++;
                stats.absentDates.push(currentDateStr); 
            } else {
                const isToday = isSameDay(d, today);
                let isPending = false;
                if (isToday) {
                    const nowLocal = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
                    const nowMinutes = (nowLocal.getHours() * 60) + nowLocal.getMinutes();
                    if (nowMinutes < standardEndMinutes) isPending = true;
                }
                
                if (!isPending) {
                    stats.absent++;
                    stats.absentDates.push(currentDateStr);
                } else {
                    stats.totalDaysExpected--;
                }
            }
        }
    }

    res.json({
      employee: {
        id: targetId,
        name: `${targetEmployee.firstName} ${targetEmployee.lastName}`,
        role: targetEmployee.role?.name || "Unknown", // ส่ง String กลับไป
        isResigned: !!targetEmployee.resignationDate
      },
      period: { year: targetYear, month: month || 'All' },
      stats: stats
    });

  } catch (error) {
    console.error("Stats Error:", error);
    res.status(500).json({ error: "Calculation failed" });
  }
};