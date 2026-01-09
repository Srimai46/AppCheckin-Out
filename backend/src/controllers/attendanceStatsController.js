const prisma = require("../config/prisma");

// --- Helper Functions ---
const formatDateStr = (date) => date.toISOString().split('T')[0];

const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

const isSameDay = (d1, d2) => formatDateStr(d1) === formatDateStr(d2);

// คำนวณจุดกึ่งกลาง (Midpoint) เป็นนาที (เพื่อหาเวลาตัดรอบเช้า/บ่าย)
const calculateMidpointMinutes = (startHour, startMin, endHour, endMin) => {
    const startTotal = (startHour * 60) + startMin;
    const endTotal = (endHour * 60) + endMin;
    return Math.floor((startTotal + endTotal) / 2);
};

// --- Main Controller ---
exports.getStats = async (req, res) => {
  try {
    const { year, month, employeeId } = req.query;
    const requesterId = req.user.id;
    const requesterRole = req.user.role;

    // 1. Security Check
    let targetId = requesterId;
    if (employeeId && requesterRole === 'HR') {
      targetId = parseInt(employeeId, 10);
    } else if (employeeId && requesterRole !== 'HR' && parseInt(employeeId, 10) !== requesterId) {
      return res.status(403).json({ error: "Access denied." });
    }

    // 2. Fetch Employee Info
    const targetEmployee = await prisma.employee.findUnique({ 
        where: { id: targetId },
        select: { 
            role: true, 
            firstName: true, 
            lastName: true, 
            joiningDate: true,     // วันเริ่มงาน
            resignationDate: true, // วันลาออก
            isActive: true
        } 
    });

    if (!targetEmployee) return res.status(404).json({ error: "Employee not found" });

    // 3. Prepare Date Range
    const targetYear = parseInt(year);
    let startDate, endDate;
    
    // ตั้งค่าวันเริ่มต้น/สิ้นสุด ตามที่ User เลือก
    if (month && month !== 'All') {
      const m = parseInt(month) - 1; 
      startDate = new Date(Date.UTC(targetYear, m, 1));
      endDate = new Date(Date.UTC(targetYear, m + 1, 0, 23, 59, 59));
    } else {
      startDate = new Date(Date.UTC(targetYear, 0, 1));
      endDate = new Date(targetYear, 11, 31, 23, 59, 59);
    }

    // Logic A: ปรับ StartDate ตามวันเริ่มงาน
    if (targetEmployee.joiningDate) {
        const joinDate = new Date(targetEmployee.joiningDate);
        joinDate.setHours(0, 0, 0, 0);
        if (joinDate > startDate) {
            startDate = joinDate;
        }
    }

    // Logic B: ปรับ EndDate ตามวันลาออก
    if (targetEmployee.resignationDate) {
        const resignDate = new Date(targetEmployee.resignationDate);
        resignDate.setHours(23, 59, 59, 999);
        if (resignDate < endDate) {
            endDate = resignDate;
        }
    }

    // ตรวจสอบความถูกต้องของช่วงเวลา
    if (startDate > endDate) {
        return res.json({
            employee: {
                id: targetId,
                name: `${targetEmployee.firstName} ${targetEmployee.lastName}`,
                role: targetEmployee.role,
                isResigned: !!targetEmployee.resignationDate
            },
            period: { year: targetYear, month: month || 'All' },
            stats: {
                totalDaysExpected: 0,
                present: 0, late: 0, earlyLeave: 0, leave: 0, absent: 0,
                leaveBreakdown: {}, leaveDates: [], lateDates: [], earlyLeaveDates: [], absentDates: [], holidayDates: []
            }
        });
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
      prisma.workConfiguration.findUnique({
        where: { role: targetEmployee.role }
      })
    ]);

    // Config เวลาทำงานพื้นฐาน
    const startHour = realWorkConfig?.startHour || 9;
    const startMin = realWorkConfig?.startMin || 0;
    const endHour = realWorkConfig?.endHour || 17;
    const endMin = realWorkConfig?.endMin || 0;

    // แปลงเวลามาตรฐานเป็นนาที
    const standardStartMinutes = (startHour * 60) + startMin;
    const standardEndMinutes = (endHour * 60) + endMin;
    // คำนวณ Midpoint (เที่ยง/บ่าย) เป็นนาทีไว้เลย
    const midpointMinutes = calculateMidpointMinutes(startHour, startMin, endHour, endMin);

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

        // 🔥 Logic ตรวจสอบการลา (Full / Half)
        let isHalfDayLeave = false;
        let isHalfMorning = false;
        let isHalfAfternoon = false;
        
        if (leave) {
            if (leave.startDuration === 'HalfMorning' || leave.endDuration === 'HalfMorning') {
                isHalfDayLeave = true;
                isHalfMorning = true;
            } else if (leave.startDuration === 'HalfAfternoon' || leave.endDuration === 'HalfAfternoon') {
                isHalfDayLeave = true;
                isHalfAfternoon = true;
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

            // กำหนด Expected Start/End Time (นาที)
            let expectedStartMinutes = standardStartMinutes;
            let expectedEndMinutes = standardEndMinutes;

            // ปรับเวลาตามการลาครึ่งวัน (Half Day Logic)
            if (isHalfMorning) {
                expectedStartMinutes = midpointMinutes; // ต้องเข้าบ่าย
            }
            if (isHalfAfternoon) {
                expectedEndMinutes = midpointMinutes; // เลิกเที่ยงได้
            }

            // --- เช็คสาย (LATE) ---
            let isLate = false;
            // 1. เชื่อ Status จาก DB ก่อน
            if (record.checkInStatus) {
                isLate = (record.checkInStatus === 'LATE');
            } else {
                // 2. Fallback: คำนวณเอง
                isLate = record.isLate; 
            }

            if (isLate) {
                stats.late++;
                stats.lateDates.push(currentDateStr);
                
                // คำนวณนาทีสาย (เทียบกับ Expected Time ที่ปรับแล้ว)
                if (record.checkInTime) {
                    const inTime = new Date(record.checkInTime);
                    // แปลงเป็น Local Time (+7) เพื่อคำนวณนาที
                    const localInTime = new Date(inTime.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
                    const inMinutes = (localInTime.getHours() * 60) + localInTime.getMinutes();
                    
                    if (inMinutes > expectedStartMinutes) {
                         stats.lateMinutes += (inMinutes - expectedStartMinutes);
                    }
                }
            }

            // --- เช็คกลับก่อน (EARLY) ---
            let isEarly = false;
            // 1. เชื่อ Status จาก DB ก่อน
            if (record.checkOutStatus) {
                isEarly = (record.checkOutStatus === 'EARLY');
            } else {
                // 2. Fallback
                if (record.checkOutTime) {
                    const outTime = new Date(record.checkOutTime);
                    const localOutTime = new Date(outTime.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
                    const outMinutes = (localOutTime.getHours() * 60) + localOutTime.getMinutes();
                    
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
                stats.absent++;
                stats.absentDates.push(currentDateStr); 
            } else {
                const isToday = isSameDay(d, today);
                let isPending = false;
                // เช็คว่าตอนนี้เลยเวลาเลิกงานหรือยัง
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
        role: targetEmployee.role,
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