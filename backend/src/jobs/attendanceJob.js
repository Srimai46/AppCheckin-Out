const cron = require("node-cron");
const prisma = require("../config/prisma");

// Helper เช็ควันหยุด (Optional: เผื่อคุณอยากเช็ควันหยุดก่อนแจ้งเตือน)
const checkIsHolidayOrWeekend = async (date) => {
  const dayOfWeek = date.getDay(); // 0=Sun,6=Sat
  const dateStr = date.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
  const holiday = await prisma.holiday.findUnique({ where: { date: new Date(`${dateStr}T00:00:00.000Z`) } });
  return { isWeekend: dayOfWeek === 0 || dayOfWeek === 6, isHoliday: !!holiday };
};

// ฟังก์ชันที่จะรันตามเวลา
const checkAbsentEmployees = async (io) => {
  console.log("⏰ Running Cron Job: Checking absent employees...");

  try {
    const today = new Date();
    // 🛡️ เพิ่มการเช็ควันหยุด: ถ้าวันนี้เป็นวันหยุดไม่ต้องแจ้งเตือน Absent
    const { isWeekend, isHoliday } = await checkIsHolidayOrWeekend(today);
    if (isWeekend || isHoliday) {
        console.log("Skipping absent check (Holiday/Weekend)");
        return;
    }

    today.setHours(0, 0, 0, 0); // เที่ยงคืนของวันนี้

    // 1) หา HR ทั้งหมด (✅ Fix: query ผ่าน relation)
    const hrUsers = await prisma.employee.findMany({
      where: { 
          isActive: true, 
          role: { name: "HR" } // ✅ Relation Check
      },
      select: { id: true, firstName: true, lastName: true },
    });

    // 2) หาพนักงานทั้งหมดที่ Active และเป็น Worker (✅ Fix: query ผ่าน relation)
    const employees = await prisma.employee.findMany({
      where: { 
          isActive: true, 
          role: { name: "WORKER" } // ✅ Relation Check
      },
      select: { id: true, firstName: true, lastName: true },
    });

    for (const emp of employees) {
      // เช็คว่ามี Leave Request ที่ Approve แล้วหรือไม่ (ถ้าลา ไม่ต้องแจ้งเตือนสาย)
      const approvedLeave = await prisma.leaveRequest.findFirst({
          where: {
              employeeId: emp.id,
              status: 'Approved',
              startDate: { lte: today },
              endDate: { gte: today }
          }
      });

      // ถ้าลาเต็มวัน หรือลาครึ่งเช้า -> ไม่ถือว่า Absent ตอน 10 โมง
      if (approvedLeave) {
          // ถ้าลา Full หรือ HalfMorning ถือว่ายังไม่สาย (หรือยังไม่จำเป็นต้องเตือน Absent เช้า)
          if (approvedLeave.startDuration === 'Full' || approvedLeave.startDuration === 'HalfMorning' || approvedLeave.endDuration === 'HalfMorning') {
              continue;
          }
      }

      const record = await prisma.timeRecord.findFirst({
        where: {
          employeeId: emp.id,
          workDate: { gte: today },
        },
      });

      // ถ้ายังไม่มี Record แสดงว่ายังไม่มาทำงาน
      if (!record) {
        const dateText = today.toLocaleDateString("th-TH");
        const messageToWorker = `คุณยังไม่ได้ลงเวลาเข้างานประจำวันที่ ${dateText} กรุณาตรวจสอบ`;

        // ✅ สร้าง noti ให้พนักงานคนนั้นเอง
        await prisma.notification.create({
          data: {
            employeeId: emp.id, 
            notificationType: "LateWarning",
            message: messageToWorker,
            relatedEmployeeId: emp.id,
            isRead: false,
          },
        });

        // สร้าง noti ให้ HR ทุกคนด้วย
        if (hrUsers.length > 0) {
          const fullName = `${emp.firstName} ${emp.lastName}`;
          const messageToHr = `Employee ${fullName} has not checked in (${dateText})`;

          await prisma.notification.createMany({
            data: hrUsers.map((hr) => ({
              employeeId: hr.id,
              notificationType: "LateWarning",
              message: messageToHr,
              relatedEmployeeId: emp.id,
              isRead: false,
            })),
          });

          // ส่ง realtime ให้ HR refresh list
          if (io) {
            io.to("hr_group").emit("notification_refresh"); // ถ้า FE ใช้ room นี้
          }

          // ส่ง realtime แบบรายคน
          if (io) {
            for (const hr of hrUsers) {
              const unreadCount = await prisma.notification.count({
                where: { employeeId: hr.id, isRead: false },
              });

              io.to(`user_${hr.id}`).emit("new_notification", {
                id: Date.now(),
                notificationType: "LateWarning",
                message: messageToHr,
                relatedEmployeeId: emp.id,
                createdAt: new Date(),
                unreadCount,
              });
            }
          }
        }

        // ส่ง Socket บอกพนักงานคนนั้น
        if (io) {
          const unreadCount = await prisma.notification.count({
            where: { employeeId: emp.id, isRead: false },
          });

          io.to(`user_${emp.id}`).emit("new_notification", {
            id: Date.now(),
            notificationType: "LateWarning",
            message: messageToWorker,
            relatedEmployeeId: emp.id,
            createdAt: new Date(),
            unreadCount,
          });
        }

        console.log(`⚠️ Sent warning to ${emp.firstName}`);
      }
    }
  } catch (error) {
    console.error("❌ Cron Job Error:", error);
  }
};

// ตั้งเวลา: รันทุกวันจันทร์-ศุกร์ ตอน 10:00 น.
const startCronJobs = (io) => {
  cron.schedule("0 10 * * 1-5", () => {
    checkAbsentEmployees(io);
  });

  console.log("✅ Cron Jobs started");
};

module.exports = startCronJobs;