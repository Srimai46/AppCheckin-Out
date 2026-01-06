const cron = require("node-cron");
const prisma = require("../config/prisma");

// ฟังก์ชันที่จะรันตามเวลา
const checkAbsentEmployees = async (io) => {
  console.log("⏰ Running Cron Job: Checking absent employees...");

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // เที่ยงคืนของวันนี้

    // 1) หา HR ทั้งหมด (ไว้แจ้ง HR ด้วย)
    const hrUsers = await prisma.employee.findMany({
      where: { isActive: true, role: "HR" },
      select: { id: true, firstName: true, lastName: true },
    });

    // 2) หาพนักงานทั้งหมดที่ Active และเป็น Worker
    const employees = await prisma.employee.findMany({
      where: { isActive: true, role: "Worker" },
      select: { id: true, firstName: true, lastName: true },
    });

    for (const emp of employees) {
      const record = await prisma.timeRecord.findFirst({
        where: {
          employeeId: emp.id,
          workDate: { gte: today },
        },
      });

      if (!record) {
        const dateText = today.toLocaleDateString("th-TH");
        const messageToWorker = `คุณยังไม่ได้ลงเวลาเข้างานประจำวันที่ ${dateText} กรุณาตรวจสอบ`;

        // ✅ สร้าง noti ให้พนักงานคนนั้นเอง + ใส่ relatedEmployeeId (route ไปหน้าตัวเองได้)
        await prisma.notification.create({
          data: {
            employeeId: emp.id,                 // ผู้รับ = พนักงานคนนี้
            notificationType: "LateWarning",
            message: messageToWorker,
            relatedEmployeeId: emp.id,          // ✅ เพิ่ม (สำคัญ)
            isRead: false,
          },
        });

        // สร้าง noti ให้ HR ทุกคนด้วย เพื่อให้ HR กดแล้วไปดู employee detail ของ emp ได้
        if (hrUsers.length > 0) {
          const fullName = `${emp.firstName} ${emp.lastName}`;
          const messageToHr = `Employee ${fullName} has not checked in (${dateText})`;

          await prisma.notification.createMany({
            data: hrUsers.map((hr) => ({
              employeeId: hr.id,                // ผู้รับ = HR
              notificationType: "LateWarning",
              message: messageToHr,
              relatedEmployeeId: emp.id,
              isRead: false,
            })),
          });

          // ส่ง realtime ให้ HR refresh list
          if (io) {
            io.to("hr_group").emit("notification_refresh");
          }

          // ส่ง realtime แบบรายคน (ถ้าคุณอยากให้มันเด้งทันทีโดยไม่ต้อง fetch)
          if (io) {
            for (const hr of hrUsers) {
              const unreadCount = await prisma.notification.count({
                where: { employeeId: hr.id, isRead: false },
              });

              io.to(`user_${hr.id}`).emit("new_notification", {
                id: Date.now(), // ถ้า backend ไม่ได้ส่ง id จริง ให้ FE fetch ใหม่ (FE คุณรองรับแล้ว)
                notificationType: "LateWarning",
                message: messageToHr,
                relatedEmployeeId: emp.id,
                createdAt: new Date(),
                unreadCount,
              });
            }
          }
        }

        // ส่ง Socket บอกพนักงานคนนั้น (ถ้าเขาเปิดเว็บอยู่)
        if (io) {
          const unreadCount = await prisma.notification.count({
            where: { employeeId: emp.id, isRead: false },
          });

          io.to(`user_${emp.id}`).emit("new_notification", {
            id: Date.now(), // ถ้าไม่มี id จริง FE จะ fetch ใหม่เอง
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
