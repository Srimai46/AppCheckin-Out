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

    // --- 2. Fetch Employee Info First (เพื่อเอา joiningDate) ---
    // ย้ายขึ้นมาก่อน เพื่อใช้ปรับ startDate
    const targetEmployee = await prisma.employee.findUnique({ 
        where: { id: targetId },
        select: { 
            role: true, 
            firstName: true, 
            lastName: true, 
            joiningDate: true // ✅ 1. ดึงวันที่เริ่มงานมาด้วย
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

    // ✅ 2. Logic ปรับ StartDate ตามวันเริ่มงาน
    if (targetEmployee.joiningDate) {
        // แปลง joiningDate เป็น Date Object (ตัดเวลาออกให้เหลือแค่เที่ยงคืนเพื่อการเปรียบเทียบที่แม่นยำ)
        const joinDate = new Date(targetEmployee.joiningDate);
        joinDate.setHours(0, 0, 0, 0);

        // ถ้าวันที่เริ่มงาน มาทีหลัง วันที่เลือกดูรายงาน
        // ให้เริ่มนับตั้งแต่วันเริ่มงานแทน
        if (joinDate > startDate) {
            startDate = joinDate;
        }
    }

    // ป้องกันกรณี User เลือกดูปีเก่ากว่าที่พนักงานจะเข้าทำงาน (startDate อาจจะเกิน endDate)
    // ถ้าเกิน endDate แสดงว่าช่วงเวลานั้นพนักงานยังไม่มา ให้ return stats เป็น 0 ไปเลย
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
    // ใช้ startDate ที่ปรับแล้ว เพื่อไม่ให้ดึงข้อมูลเกินความจำเป็น
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
    // Loop เริ่มต้นที่ startDate (ซึ่งถูกปรับให้เท่ากับ joiningDate แล้ว ถ้าจำเป็น)
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