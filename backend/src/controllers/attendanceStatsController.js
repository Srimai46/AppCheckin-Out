// backend/src/controllers/timeRecordController.js

// Helper Functions (คงเดิม)
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
    
    // ✅ แก้จุดที่ 1: ให้ loop ถึงสิ้นเดือนเสมอ (เพื่อให้แสดงวันลาล่วงหน้าได้)
    // ไม่ตัดจบแค่ today แล้ว
    const loopEndDate = endDate; 

    // --- 3. Fetch Data ---
    const targetEmployee = await prisma.employee.findUnique({ 
        where: { id: targetId },
        select: { role: true, firstName: true, lastName: true } 
    });

    if (!targetEmployee) {
        return res.status(404).json({ error: "Employee not found" });
    }

    const [timeRecords, leaves, holidays, realWorkConfig] = await Promise.all([
      // ดึง Record ทั้งเดือน (อนาคตไม่มีอยู่แล้ว ไม่เป็นไร)
      prisma.timeRecord.findMany({
        where: { employeeId: targetId, workDate: { gte: startDate, lte: loopEndDate } }
      }),
      // ดึงวันลาทั้งเดือน (รวมอนาคต)
      prisma.leaveRequest.findMany({
        where: { 
            employeeId: targetId, 
            status: 'Approved', 
            startDate: { lte: loopEndDate }, 
            endDate: { gte: startDate }
        },
        include: { leaveType: true }
      }),
      // ดึงวันหยุดทั้งเดือน (รวมอนาคต)
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
    // วนลูปตั้งแต่วันแรก ถึง "สิ้นเดือน" (ไม่ใช่แค่วันนี้)
    for (let d = new Date(startDate); d <= loopEndDate; d.setDate(d.getDate() + 1)) {
        const currentDateStr = formatDateStr(d);
        const isCurrentWeekend = isWeekend(d);
        const isCurrentHoliday = holidays.some(h => formatDateStr(h.date) === currentDateStr);
        
        // เช็คว่าเป็นวันในอนาคตหรือไม่?
        // (d คือ 00:00 UTC, today คือเวลาปัจจุบัน)
        // ถ้า d > today แปลว่าเป็นวันพรุ่งนี้เป็นต้นไป
        const isFuture = d > today; 

        // ดึง Record เวลาทำงาน
        const record = timeRecords.find(r => formatDateStr(r.workDate) === currentDateStr);
        
        // หาข้อมูลการลาในวันนั้น
        const leave = leaves.find(l => {
            const start = new Date(l.startDate);
            const end = new Date(l.endDate);
            const dTime = d.getTime();
            const sTime = new Date(formatDateStr(start)).getTime();
            const eTime = new Date(formatDateStr(end)).getTime();
            return dTime >= sTime && dTime <= eTime;
        });

        // 1. เช็ควันลาก่อน (แสดงได้ทั้งอดีตและอนาคต)
        if (leave) {
            // นับสถิติวันลา (ไม่ว่าจะอดีตหรืออนาคต ก็นับว่าใช้โควตาแล้ว)
            if (!isCurrentWeekend && !isCurrentHoliday) {
                stats.leave++;
                const typeName = leave.leaveType.typeName;
                stats.leaveBreakdown[typeName] = (stats.leaveBreakdown[typeName] || 0) + 1;
            }
            // ใส่ลง Array เพื่อโชว์ในปฏิทิน
            stats.leaveDates.push({
                date: currentDateStr,
                type: leave.leaveType.typeName
            });
            continue; // จบวัน
        }

        // 2. เช็ควันหยุด (แสดงได้ทั้งอดีตและอนาคต)
        if (isCurrentWeekend || isCurrentHoliday) continue;

        // ✅ แก้จุดที่ 2: ถ้าเป็น "วันในอนาคต" ให้หยุดแค่นี้ (ไม่เช็ค ขาด/ลา/มาสาย)
        // เพราะเรายังไม่รู้อนาคตว่าจะมาทำงานไหม
        if (isFuture) continue;

        // --- ด้านล่างนี้คือ Logic สำหรับ "อดีตและปัจจุบัน" เท่านั้น ---
        
        stats.totalDaysExpected++; 

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
        } else {
            // Logic เช็คขาดงาน (Absent)
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