// backend/src/controllers/attendanceStatsController.js

const prisma = require("../config/prisma");

// Helper Functions
const formatDateStr = (date) => date.toISOString().split('T')[0];
const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};
const isSameDay = (d1, d2) => formatDateStr(d1) === formatDateStr(d2);

exports.getStats = async (req, res) => {
  try {
    const { year, month, employeeId } = req.query;
    const requesterId = req.user.id;
    const requesterRole = req.user.role;

    // --- 1. Security Check ---
    let targetId = requesterId;
    if (employeeId && requesterRole === 'HR') {
      targetId = parseInt(employeeId, 10);
    } else if (employeeId && requesterRole !== 'HR' && parseInt(employeeId, 10) !== requesterId) {
      return res.status(403).json({ error: "Access denied." });
    }

    // --- 2. Fetch Employee Info First ---
    // ดึง joiningDate และ resignationDate เพื่อใช้กำหนดช่วงเวลา
    const targetEmployee = await prisma.employee.findUnique({ 
        where: { id: targetId },
        select: { 
            role: true, 
            firstName: true, 
            lastName: true, 
            joiningDate: true,     // วันเริ่มงาน
            resignationDate: true  // ✅ วันลาออก
        } 
    });

    if (!targetEmployee) return res.status(404).json({ error: "Employee not found" });

    // --- 3. Prepare Date Range ---
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

    // ✅ Logic A: ปรับ StartDate ตามวันเริ่มงาน (ถ้าเริ่มงานทีหลัง)
    if (targetEmployee.joiningDate) {
        const joinDate = new Date(targetEmployee.joiningDate);
        joinDate.setHours(0, 0, 0, 0);
        if (joinDate > startDate) {
            startDate = joinDate;
        }
    }

    // ✅ Logic B: ปรับ EndDate ตามวันลาออก (ถ้าลาออกก่อนสิ้นเดือน)
    if (targetEmployee.resignationDate) {
        const resignDate = new Date(targetEmployee.resignationDate);
        resignDate.setHours(23, 59, 59, 999); // จบวัน

        // ถ้าวันลาออก เกิดขึ้นก่อนวันสิ้นสุดช่วงที่เลือกดู -> ให้จบการนับแค่วันลาออก
        if (resignDate < endDate) {
            endDate = resignDate;
        }
    }

    // ตรวจสอบว่าช่วงเวลาถูกต้องหรือไม่ (เช่น ลาออกไปก่อนปีที่เลือกดู หรือ ยังไม่เริ่มงาน)
    if (startDate > endDate) {
        return res.json({
            employee: {
                id: targetId,
                name: `${targetEmployee.firstName} ${targetEmployee.lastName}`,
                role: targetEmployee.role
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

    // --- 4. Fetch Transaction Data ---
    // ใช้ startDate/loopEndDate ที่ปรับแล้ว เพื่อประสิทธิภาพและความถูกต้อง
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

    // Config เวลาเข้างาน
    const startHour = realWorkConfig?.startHour || 9;
    const startMin = realWorkConfig?.startMin || 0;
    const startWorkMinutes = (startHour * 60) + startMin;

    const endHour = realWorkConfig?.endHour || 17;
    const endMin = realWorkConfig?.endMin || 0;
    const endWorkMinutes = (endHour * 60) + endMin;

    // --- 5. Initialization ---
    const stats = {
      totalDaysExpected: 0,
      present: 0,
      late: 0, lateMinutes: 0, lateDates: [],      
      earlyLeave: 0, earlyLeaveMinutes: 0, earlyLeaveDates: [],  
      leave: 0, leaveBreakdown: {}, leaveDates: [],
      absent: 0, absentDates: [],
      holidayDates: []      
    };

    // --- 6. Main Loop ---
    for (let d = new Date(startDate); d <= loopEndDate; d.setDate(d.getDate() + 1)) {
        const currentDateStr = formatDateStr(d);
        const isCurrentWeekend = isWeekend(d);
        const isFuture = d > today; 

        // Check Holiday
        const currentHoliday = holidays.find(h => formatDateStr(h.date) === currentDateStr);
        if (currentHoliday) {
            stats.holidayDates.push({ 
                date: currentDateStr, 
                name: currentHoliday.name 
            });
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

        // 🔥 1. Logic ตรวจสอบการลา
        let isHalfDayLeave = false;
        
        if (leave) {
            if (leave.startDuration === 'HalfMorning' || leave.endDuration === 'HalfMorning' ||
                leave.startDuration === 'HalfAfternoon' || leave.endDuration === 'HalfAfternoon') {
                isHalfDayLeave = true;
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
            if (isHalfDayLeave) {
                if (!isCurrentWeekend && !currentHoliday) {
                    stats.leave += 0.5;
                    const typeName = leave.leaveType.typeName;
                    stats.leaveBreakdown[typeName] = (stats.leaveBreakdown[typeName] || 0) + 0.5;
                }
                stats.leaveDates.push({ date: currentDateStr, type: leave.leaveType.typeName + " (0.5)" });
            }
        }

        // Logic ข้ามวันหยุด
        if ((isCurrentWeekend || currentHoliday) && !record) {
            continue;
        }

        if (isFuture) continue;

        stats.totalDaysExpected++; 

        // 🔥 2. Logic เช็คเวลาทำงาน
        if (record) {
            stats.present++;

            // Check Late
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
                    const inMinutes = (inTime.getHours() * 60) + inTime.getMinutes();
                    if (inMinutes > startWorkMinutes) {
                         stats.lateMinutes += (inMinutes - startWorkMinutes);
                    }
                }
            }

            // Check Early Leave
            let isEarly = false;
            if (record.checkOutStatus) {
                isEarly = (record.checkOutStatus === 'EARLY');
            } else {
                if (record.checkOutTime) {
                    const out = new Date(record.checkOutTime);
                    const outMinutes = (out.getHours() * 60) + out.getMinutes();
                    const isAfternoonLeave = leave && (leave.startDuration === 'HalfAfternoon' || leave.endDuration === 'HalfAfternoon');
                    if (outMinutes < endWorkMinutes && !isAfternoonLeave) isEarly = true;
                }
            }

            if (isEarly && record.checkOutTime) {
                stats.earlyLeave++;
                stats.earlyLeaveDates.push(currentDateStr);
                
                const out = new Date(record.checkOutTime);
                const outMinutes = (out.getHours() * 60) + out.getMinutes();
                if (outMinutes < endWorkMinutes) {
                    stats.earlyLeaveMinutes += (endWorkMinutes - outMinutes);
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
                if (isToday) {
                    const nowMinutes = (today.getHours() * 60) + today.getMinutes();
                    if (nowMinutes < endWorkMinutes) isPending = true;
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
        role: targetEmployee.role
      },
      period: { year: targetYear, month: month || 'All' },
      stats: stats
    });

  } catch (error) {
    console.error("Stats Error:", error);
    res.status(500).json({ error: "Calculation failed" });
  }
};