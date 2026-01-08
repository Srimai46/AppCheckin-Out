const prisma = require("../config/prisma");

// Helper Functions
const formatDateStr = (date) => date.toISOString().split('T')[0];
const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};
const isSameDay = (d1, d2) => formatDateStr(d1) === formatDateStr(d2);

// ✅ จุดสำคัญ: ใช้ exports.getStats = ... (ห้ามใช้ const getStats = ...)
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

    // --- 2. Prepare Date Range ---
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

    const today = new Date();
    const calculationEndDate = endDate > today ? today : endDate;

    // --- 3. Fetch Data ---
    const targetEmployee = await prisma.employee.findUnique({ 
        where: { id: targetId },
        select: { role: true, firstName: true, lastName: true } 
    });

    if (!targetEmployee) {
        return res.status(404).json({ error: "Employee not found" });
    }

    const [timeRecords, leaves, holidays, realWorkConfig] = await Promise.all([
      prisma.timeRecord.findMany({
        where: { employeeId: targetId, workDate: { gte: startDate, lte: calculationEndDate } }
      }),
      prisma.leaveRequest.findMany({
        where: { 
            employeeId: targetId, 
            status: 'Approved', 
            startDate: { gte: startDate }, 
            endDate: { lte: calculationEndDate } 
        },
        include: { leaveType: true }
      }),
      prisma.holiday.findMany({
        where: { date: { gte: startDate, lte: calculationEndDate } }
      }),
      prisma.workConfiguration.findUnique({
        where: { role: targetEmployee.role }
      })
    ]);

    // --- Config เวลาเข้า-ออกงาน ---
    const startHour = realWorkConfig?.startHour || 9;
    const startMin = realWorkConfig?.startMin || 0;
    const startWorkMinutes = (startHour * 60) + startMin;

    const endHour = realWorkConfig?.endHour || 17;
    const endMin = realWorkConfig?.endMin || 0;
    const endWorkMinutes = (endHour * 60) + endMin;

    // --- 4. Initialization ---
    const stats = {
      totalDaysExpected: 0,
      present: 0,
      late: 0,
      lateMinutes: 0,      
      lateDates: [],       
      earlyLeave: 0,
      earlyLeaveMinutes: 0, 
      earlyLeaveDates: [],  
      leave: 0,
      leaveBreakdown: {}, 
      leaveDates: [],
      absent: 0,
      absentDates: []      
    };

    // --- 5. Main Loop ---
    for (let d = new Date(startDate); d <= calculationEndDate; d.setDate(d.getDate() + 1)) {
        const currentDateStr = formatDateStr(d);
        const isCurrentWeekend = isWeekend(d);
        const isCurrentHoliday = holidays.some(h => formatDateStr(h.date) === currentDateStr);

        if (isCurrentWeekend || isCurrentHoliday) continue;

        stats.totalDaysExpected++; 

        const record = timeRecords.find(r => formatDateStr(r.workDate) === currentDateStr);
        
        const leave = leaves.find(l => {
            const start = new Date(l.startDate);
            const end = new Date(l.endDate);
            const dTime = d.getTime();
            const sTime = new Date(formatDateStr(start)).getTime();
            const eTime = new Date(formatDateStr(end)).getTime();
            return dTime >= sTime && dTime <= eTime;
        });

        if (record) {
            stats.present++;
            if (record.isLate) {
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
            if (record.checkOutTime) {
                const out = new Date(record.checkOutTime);
                const outMinutes = (out.getHours() * 60) + out.getMinutes();
                if (outMinutes < endWorkMinutes) {
                    stats.earlyLeave++;
                    stats.earlyLeaveDates.push(currentDateStr);
                    stats.earlyLeaveMinutes += (endWorkMinutes - outMinutes);
                }
            }
        } else if (leave) {
            stats.leave++;
            const typeName = leave.leaveType.typeName;
            stats.leaveBreakdown[typeName] = (stats.leaveBreakdown[typeName] || 0) + 1;
            stats.leaveDates.push({
                date: currentDateStr,
                type: typeName
            });
        } else {
            const isToday = isSameDay(d, today);
            let isPending = false;
            
            if (isToday) {
                const nowMinutes = (today.getHours() * 60) + today.getMinutes();
                if (nowMinutes < endWorkMinutes) {
                    isPending = true;
                }
            }

            if (!isPending) {
                stats.absent++;
                stats.absentDates.push(currentDateStr);
            } else {
                stats.totalDaysExpected--;
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