// backend/src/utils/notify.js
const prisma = require("../config/prisma");

const fmtTime = (d) =>
  new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/**
 * สร้าง notification ให้ HR ทุกคน (employeeId = hr.id)
 * และตั้ง relatedEmployeeId = employeeId ของคนที่เกิดเหตุ (เข้า/ออก/มาสาย/ออกก่อน)
 */
async function notifyHrEmployees({ io, hrUserIds, actorEmployee, type, message, relatedRequestId = null }) {
  if (!io) throw new Error("io is required");
  if (!Array.isArray(hrUserIds) || hrUserIds.length === 0) return;

  // ✅ สร้าง noti ให้ HR ทีละคน เพื่อให้ query ตาม employeeId ได้ง่าย
  const rows = hrUserIds.map((hrId) => ({
    employeeId: hrId, // ✅ เจ้าของ noti คือ HR
    notificationType: type,
    message,
    relatedRequestId,
    relatedEmployeeId: actorEmployee?.id ?? null, // ✅ คนที่เกี่ยวข้อง (กด View ไปหน้า /employees/:id)
    isRead: false,
  }));

  // createMany จะไม่คืน record ที่สร้างมา -> เราจะ emit แบบ fetch ล่าสุดอีกที
  await prisma.notification.createMany({ data: rows });

  // ✅ ยิงให้ refresh ดึง noti ใหม่ (ง่ายและชัวร์)
  hrUserIds.forEach((hrId) => {
    io.to(`user_${hrId}`).emit("notification_refresh");
  });

  // (optional) ถ้าอยาก “เด้ง realtime แบบ append” ด้วย new_notification จริง ๆ
  // ต้อง query record ที่เพิ่งสร้างต่อ HR แต่ละคน แล้ว emit เป็นรายคน
  // เพื่อให้ได้ id/createdAt ถูกต้อง
  for (const hrId of hrUserIds) {
    const latest = await prisma.notification.findFirst({
      where: {
        employeeId: hrId,
        notificationType: type,
        message,
        relatedEmployeeId: actorEmployee?.id ?? null,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        notificationType: true,
        message: true,
        relatedEmployeeId: true,
        relatedRequestId: true,
        isRead: true,
        createdAt: true,
      },
    });

    if (latest) {
      io.to(`user_${hrId}`).emit("new_notification", {
        id: latest.id,
        type: latest.notificationType, // ✅ ให้ frontend อ่านง่าย (n.type)
        message: latest.message,
        relatedEmployeeId: latest.relatedEmployeeId,
        relatedRequestId: latest.relatedRequestId,
        isRead: latest.isRead,
        createdAt: latest.createdAt,
      });
    }
  }
}

module.exports = { notifyHrEmployees, fmtTime };
