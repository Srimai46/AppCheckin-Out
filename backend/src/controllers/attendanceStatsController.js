// backend/src/controllers/timeRecordController.js

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
    // ✅ Loop ถึงสิ้นเดือนเสมอ (เพื่อให้แสดงวันลาล่วงหน้าได้)
    const loopEndDate = endDate; 

    // --- 3. Fetch Data ---
    const targetEmployee = await prisma.employee.findUnique({ 
        where: { id: targetId },
        select: { role: true, firstName: true, lastName: true } 
    });

    if (!targetEmployee) return res.status(404).json({ error: "Employee not found" });

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
      lateMinutes: 0, lateDates: [],       
      earlyLeave: 0, earlyLeaveMinutes: 0, earlyLeaveDates: [],  
      leave: 0, leaveBreakdown: {}, leaveDates: [],
      absent: 0, absentDates: []      
    };

    // --- 5. Main Loop ---
    for (let d = new Date(startDate); d <= loopEndDate; d.setDate(d.getDate() + 1)) {
        const currentDateStr = formatDateStr(d);
        const isCurrentWeekend = isWeekend(d);
        const isCurrentHoliday = holidays.some(h => formatDateStr(h.date) === currentDateStr);
        
        // เช็คว่าเป็นวันในอนาคตหรือไม่?
        const isFuture = d > today; 

        const record = timeRecords.find(r => formatDateStr(r.workDate) === currentDateStr);
        
        const leave = leaves.find(l => {
            const start = new Date(l.startDate);
            const end = new Date(l.endDate);
            const dTime = d.getTime();
            const sTime = new Date(formatDateStr(start)).getTime();
            const eTime = new Date(formatDateStr(end)).getTime();
            return dTime >= sTime && dTime <= eTime;
        });

        // 🔥 Logic ตรวจสอบประเภทการลา (Full / Half)
        let isHalfDayLeave = false;
        let isMorningLeave = false;   // ลาเช้า (เข้าบ่าย)
        let isAfternoonLeave = false; // ลาบ่าย (กลับเที่ยง)

        if (leave) {
            if (leave.startDuration === 'HalfMorning' || leave.endDuration === 'HalfMorning') {
                isHalfDayLeave = true; isMorningLeave = true;
            } else if (leave.startDuration === 'HalfAfternoon' || leave.endDuration === 'HalfAfternoon') {
                isHalfDayLeave = true; isAfternoonLeave = true;
            }

            // Case 1: ลาเต็มวัน (Full Day)
            if (!isHalfDayLeave) {
                // ถ้ามี Record มาทำงาน -> ให้นับเป็น Present (ข้าม Logic Leave ไป)
                if (!record) {
                    if (!isCurrentWeekend && !isCurrentHoliday) {
                        stats.leave++; // บวก 1 วัน
                        const typeName = leave.leaveType.typeName;
                        stats.leaveBreakdown[typeName] = (stats.leaveBreakdown[typeName] || 0) + 1;
                    }
                    stats.leaveDates.push({ date: currentDateStr, type: leave.leaveType.typeName });
                    continue; // จบวัน (หยุดนับ)
                }
            }

            // Case 2: ลาครึ่งวัน (Half Day)
            if (isHalfDayLeave) {
                if (!isCurrentWeekend && !isCurrentHoliday) {
                    stats.leave += 0.5; // บวก 0.5 วัน
                    const typeName = leave.leaveType.typeName;
                    stats.leaveBreakdown[typeName] = (stats.leaveBreakdown[typeName] || 0) + 0.5;
                }
                stats.leaveDates.push({ date: currentDateStr, type: leave.leaveType.typeName + " (0.5)" });
                // ไม่ continue เพราะต้องลงไปเช็ค Record ว่ามาสาย/กลับก่อนไหม
            }
        }

        // เช็ควันหยุด (ถ้าไม่ได้ลาเต็มวัน และเป็นวันหยุด ก็ข้าม)
        if ((isCurrentWeekend || isCurrentHoliday) && !record) continue;

        // ถ้าเป็นอนาคต หยุดเช็คแค่นี้ (หลังจาก push leaveDates ไปแล้ว)
        if (isFuture) continue;

        // --- เริ่มนับสถิติการทำงาน ---
        stats.totalDaysExpected++; 

        if (record) {
            stats.present++;

            // 1. เช็คสาย (Late)
            // ✅ ถ้าลาครึ่งเช้า (isMorningLeave) -> ไม่นับสาย
            if (record.isLate && !isMorningLeave) {
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

            // 2. เช็คกลับก่อน (Early Leave)
            if (record.checkOutTime) {
                const out = new Date(record.checkOutTime);
                const outMinutes = (out.getHours() * 60) + out.getMinutes();
                // ✅ ถ้าลาครึ่งบ่าย (isAfternoonLeave) -> ไม่นับกลับก่อน
                if (outMinutes < endWorkMinutes && !isAfternoonLeave) {
                    stats.earlyLeave++;
                    stats.earlyLeaveDates.push(currentDateStr);
                    stats.earlyLeaveMinutes += (endWorkMinutes - outMinutes);
                }
            }
        } else {
            // ไม่มี Record
            if (isHalfDayLeave) {
                // ลาครึ่งวันแต่ไม่มาตอกบัตรเลย = ขาดงาน (หรือจะนับ 0.5 แล้วแต่นโยบาย ในที่นี้ให้นับขาด)
                stats.absent++;
                stats.absentDates.push(currentDateStr + " (No Check-in)");
            } else {
                // ขาดงานปกติ
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