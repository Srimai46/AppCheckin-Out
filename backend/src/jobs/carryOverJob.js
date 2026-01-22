const cron = require("node-cron");
const prisma = require("../config/prisma");

function pad2(n) {
  return String(n).padStart(2, "0");
}
function ymd(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}


async function runCarryOverAnnual(targetYear) {
  const lastYear = targetYear - 1;
  const CAP = 12;

  await prisma.$transaction(async (tx) => {
    const oldQuotas = await tx.leaveQuota.findMany({
      where: { year: lastYear },
      include: { leaveType: true },
    });

    for (const quota of oldQuotas) {
      const typeName = String(quota.leaveType?.typeName || "").toLowerCase();
      if (typeName !== "annual") continue; // ✅ เฉพาะ Annual

      const totalDays = Number(quota.totalDays) || 0;
      const carryOverDays = Number(quota.carryOverDays) || 0;
      const usedDays = Number(quota.usedDays) || 0;

      const remaining = totalDays + carryOverDays - usedDays;
      const carryAmount = Math.min(Math.max(remaining, 0), CAP);
      if (carryAmount <= 0) continue;

      const existing = await tx.leaveQuota.findUnique({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: quota.employeeId,
            leaveTypeId: quota.leaveTypeId,
            year: targetYear,
          },
        },
      });

      if (existing) {
        const currentCarry = Number(existing.carryOverDays) || 0;
        const nextCarry = Math.min(Math.max(currentCarry, carryAmount), CAP);

        await tx.leaveQuota.update({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: quota.employeeId,
              leaveTypeId: quota.leaveTypeId,
              year: targetYear,
            },
          },
          data: { carryOverDays: nextCarry },
        });
      } else {
        await tx.leaveQuota.create({
          data: {
            employeeId: quota.employeeId,
            leaveTypeId: quota.leaveTypeId,
            year: targetYear,
            totalDays: 0, // ✅ โควต้าพื้นฐานปีใหม่ให้ไปจัดการผ่าน policy/seed ตามเดิม
            carryOverDays: carryAmount,
            usedDays: 0,
          },
        });
      }
    }
  });
}

/**
 * เริ่ม cron:
 * - รันทุกวันเวลา 00:05 (Asia/Bangkok)
 * - ทำงานเฉพาะวันที่ 1 มกราคม => ประมวลผลทบไปปีปัจจุบัน
 */
function startCarryOverJob() {
  cron.schedule(
    "5 0 * * *",
    async () => {
      try {
        const now = new Date();
        const month = now.getMonth() + 1;
        const day = now.getDate();

        // ✅ ทำเฉพาะวันที่ 1 ม.ค.
        if (month !== 1 || day !== 1) return;

        const targetYear = now.getFullYear();
        console.log(`🧾 CarryOverJob: start annual carry over -> year ${targetYear} (${ymd(now)})`);

        await runCarryOverAnnual(targetYear);

        console.log(`✅ CarryOverJob: success annual carry over -> year ${targetYear}`);
      } catch (err) {
        console.error("❌ CarryOverJob error:", err);
      }
    },
    { timezone: "Asia/Bangkok" }
  );

  console.log("⏰ CarryOverJob scheduled: every day 00:05 (Asia/Bangkok), run only on Jan 1");
}

module.exports = { startCarryOverJob, runCarryOverAnnual };
