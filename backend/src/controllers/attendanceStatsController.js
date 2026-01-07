// src/controllers/attendanceStatsController.js
const prisma = require("../config/prisma");

// Helper: Format วันที่ให้เป็น string (YYYY-MM-DD) เพื่อส่งให้ FE ใช้ง่ายๆ
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

    // 1. Security Check
    let targetId = requesterId;
    if (employeeId && requesterRole === 'HR') {
      targetId = parseInt(employeeId, 10);
    } else if (employeeId && requesterRole !== 'HR' && parseInt(employeeId, 10) !== requesterId) {
      return res.status(403).json({ error: "Access denied." });
    }

    // 2. Prepare Date Range
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
    // Loop ถึงแค่วันปัจจุบัน (ถ้าดูเดือนปัจจุบัน) หรือวันสุดท้ายของเดือน (ถ้าดูย้อนหลัง)
    const calculationEndDate = endDate > today ? today : endDate;

    // 3. Fetch Data
    const targetEmployee = await prisma.employee.findUnique({ 
        where: { id: targetId },
        select: { role: true, firstName: true, lastName: true } 
    });

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
        include: { leaveType: true } // ✅ ดึงประเภทวันลามาด้วย
      }),
      prisma.holiday.findMany({
        where: { date: { gte: startDate, lte: calculationEndDate } }
      }),
      prisma.workConfiguration.findUnique({
        where: { role: targetEmployee.role }
      })
    ]);

    const endHour = realWorkConfig?.endHour || 17;
    const endMin = realWorkConfig?.endMin || 0;
    const endWorkMinutes = (endHour * 60) + endMin;

    // 4. Initialization (เตรียมตัวแปรเก็บผลลัพธ์)
    const stats = {
      totalDaysExpected: 0,
      present: 0,
      late: 0,
      lateMinutes: 0,       // ✅ เพิ่ม: นาทีสายรวม
      lateDates: [],        // ✅ เพิ่ม: วันที่สาย
      earlyLeave: 0,
      earlyLeaveMinutes: 0, // ✅ เพิ่ม: นาทีออกก่อนรวม
      earlyLeaveDates: [],  // ✅ เพิ่ม: วันที่ออกก่อน
      leave: 0,
      leaveBreakdown: {},   // ✅ เพิ่ม: แยกประเภทลา { "Sick": 1, "Business": 2 }
      absent: 0,
      absentDates: []       // ✅ เพิ่ม: วันที่ขาดงาน (สำคัญมากสำหรับ FE)
    };

    // 5. Main Loop (วนลูปทีละวันเพื่อความแม่นยำสูงสุดในการระบุวันที่)
    // การวนลูป 30-365 รอบใน Node.js ใช้เวลาไม่ถึง 1ms หายห่วงเรื่อง Performance
    for (let d = new Date(startDate); d <= calculationEndDate; d.setDate(d.getDate() + 1)) {
        const currentDateStr = formatDateStr(d);
        const isCurrentWeekend = isWeekend(d);
        const isCurrentHoliday = holidays.some(h => formatDateStr(h.date) === currentDateStr);

        // ถ้าเป็นวันหยุด -> ข้าม (ไม่นับเป็นวันทำการ)
        if (isCurrentWeekend || isCurrentHoliday) continue;

        stats.totalDaysExpected++; // นับเป็นวันทำการ

        // หา Record ของวันนี้
        const record = timeRecords.find(r => formatDateStr(r.workDate) === currentDateStr);
        // หา Leave ของวันนี้
        const leave = leaves.find(l => {
            const start = new Date(l.startDate);
            const end = new Date(l.endDate);
            return d >= start && d <= end;
        });

        if (record) {
            // --- กรณีมาทำงาน ---
            stats.present++;
            
            // เช็คสาย
            if (record.isLate) {
                stats.late++;
                stats.lateDates.push(currentDateStr);
                // คำนวณนาทีที่สาย (ถ้าอยากละเอียด) - สมมติ Config เริ่ม 08:00
                // const startWorkMinutes = (realWorkConfig.startHour * 60) + realWorkConfig.startMin;
                // const checkInTime = new Date(record.checkInTime);
                // const checkInMinutes = (checkInTime.getHours() * 60) + checkInTime.getMinutes();
                // stats.lateMinutes += Math.max(0, checkInMinutes - startWorkMinutes);
            }

            // เช็คออกก่อน
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
            // --- กรณีลา ---
            // (นับเฉพาะวันลาที่ไม่ตรงกับวันหยุด - ซึ่งเรา filter weekend/holiday ด้านบนแล้ว)
            stats.leave++;
            const typeName = leave.leaveType.typeName;
            stats.leaveBreakdown[typeName] = (stats.leaveBreakdown[typeName] || 0) + 1;
            
        } else {
            // --- กรณีขาดงาน (Absent) ---
            
            // เช็คว่าเป็น "วันนี้" ที่ยังไม่จบวันหรือไม่?
            const isToday = isSameDay(d, today);
            let isPending = false;
            
            if (isToday) {
                const nowMinutes = (today.getHours() * 60) + today.getMinutes();
                if (nowMinutes < endWorkMinutes) {
                    isPending = true; // ยังไม่จบวัน ยังไม่นับขาด
                }
            }

            if (!isPending) {
                stats.absent++;
                stats.absentDates.push(currentDateStr); // ✅ ส่งวันที่ขาดกลับไป
            } else {
                // ถ้าเป็น Pending ให้ลบออกจาก Total Expected ด้วย เพราะยังสรุปไม่ได้
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
      stats: stats // ส่ง Object ที่มี Breakdown ครบๆ กลับไป
    });

  } catch (error) {
    console.error("Stats Error:", error);
    res.status(500).json({ error: "Calculation failed" });
  }
};