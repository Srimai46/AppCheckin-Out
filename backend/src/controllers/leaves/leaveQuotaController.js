const prisma = require('../../config/prisma'); 
const { validateAndApplyQuotaCaps } = require("../../utils/leaveUtils");
const { auditLog } = require("../../utils/logger"); 

/* ===================== helpers ===================== */
// ✅ NEW: แปลงเป็น number แบบปลอดภัย (0 ถือว่า valid)
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// ✅ NEW: clamp ให้ไม่ติดลบ
const clamp0 = (v) => Math.max(toNum(v), 0);

exports.getMyQuotas = async (req, res) => {
  try {
    let year = req.query.year
      ? parseInt(req.query.year, 10)
      : new Date().getFullYear();

    if (year > 2500) year -= 543;

    const quotas = await prisma.leaveQuota.findMany({
      where: {
        employeeId: req.user.id,
        year: year,
      },
      include: { leaveType: true },
    });

    const result = quotas.map((q) => {
      // ✅ FIX: ไม่ใช้ parseFloat(x) || 0 (0 จะถูกมองเป็น falsy)
      const base = clamp0(q.totalDays);
      const carry = clamp0(q.carryOverDays);
      const used = clamp0(q.usedDays);

      const totalAvailable = base + carry;

      return {
        id: q.id,

        // ✅ ส่ง key ที่เสถียรให้ FE ใช้ logic (เช่น isSpecial)
        typeKey: q.leaveType?.typeName || "UNKNOWN",
        // ✅ คง field เดิมไว้ (เพื่อไม่ให้ FE พัง)
        type: q.leaveType?.typeName || "Unknown",

        baseQuota: base,
        carryOver: carry,
        total: totalAvailable,
        used: used,

        // ✅ FIX: clamp remaining ไม่ให้ติดลบ
        remaining: Math.max(totalAvailable - used, 0),

        year: q.year,
      };
    });

    res.json(result);
  } catch (error) {
    console.error("getMyQuotas Error:", error);
    res.status(500).json({ error: "Failed to fetch quota data" });
  }
};

exports.updateCompanyQuotasByType = async (req, res) => {
  try {
    const { quotas, year, onlyActive, configs = {} } = req.body;
    const hrId = req.user.id;

    let targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
    if (targetYear > 2500) targetYear -= 543;

    const normalized = normalizeQuotas(quotas);
    const typeNames = Object.keys(normalized);
    const leaveTypes = await getLeaveTypesByNames(typeNames);

    const employees = await prisma.employee.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      select: { id: true },
    });

    const result = await prisma.$transaction(
      async (tx) => {
        let updatedCount = 0;

        for (const emp of employees) {
          for (const lt of leaveTypes) {
            const typeName = lt.typeName.toUpperCase();
            const setting = configs[typeName] || {
              totalCap: typeName === "ANNUAL" ? 12 : 999,
            };

            const existing = await tx.leaveQuota.findUnique({
              where: {
                employeeId_leaveTypeId_year: {
                  employeeId: emp.id,
                  leaveTypeId: lt.id,
                  year: targetYear,
                },
              },
              select: { usedDays: true, carryOverDays: true },
            });

            const { finalBase, finalCarry } = validateAndApplyQuotaCaps({
              typeName: lt.typeName,
              totalDays: normalized[typeName],
              carryOverDays: existing?.carryOverDays || 0,
              currentUsed: existing?.usedDays || 0,
              hrMaxCarry: lt.maxCarryOver,
              hrTotalCap: setting.totalCap,
            });

            await tx.leaveQuota.upsert({
              where: {
                employeeId_leaveTypeId_year: {
                  employeeId: emp.id,
                  leaveTypeId: lt.id,
                  year: targetYear,
                },
              },
              update: { totalDays: finalBase },
              create: {
                employeeId: emp.id,
                leaveTypeId: lt.id,
                year: targetYear,
                totalDays: finalBase,
                carryOverDays: finalCarry,
                usedDays: 0,
              },
            });
            updatedCount++;
          }
        }

        const auditDetails = `Bulk update company quotas for year ${targetYear}. Affected employees: ${employees.length}`;

        await auditLog(tx, {
          action: "UPDATE",
          modelName: "LeaveQuota",
          recordId: targetYear,
          userId: hrId,
          details: auditDetails,
          newValue: {
            quotasSent: quotas,
            configsUsed: configs,
            onlyActiveOnly: onlyActive,
          },
          req: req
        });

        return { updatedCount, employeeCount: employees.length, auditDetails };
      },
      { timeout: 30000 }
    );

    const io = req.app.get("io");
    if (io) {
      io.emit("notification_refresh");
      io.emit("new-audit-log", {
        id: Date.now(),
        action: "UPDATE",
        modelName: "LeaveQuota",
        recordId: targetYear,
        performedBy: {
          firstName: req.user.firstName,
          lastName: req.user.lastName,
        },
        details: result.auditDetails,
        createdAt: new Date(),
      });
    }

    res.json({
      message: `Updated quotas for ${targetYear} successfully using Capped Logic.`,
      ...result,
    });
  } catch (error) {
    console.error("updateCompanyQuotasByType error:", error);
    res.status(400).json({ error: error.message });
  }
};

exports.updateEmployeeQuotasByType = async (req, res) => {
  try {
    const employeeId = parseInt(req.params.employeeId, 10);
    const { quotas, year, configs = {} } = req.body;
    const hrId = req.user.id;

    if (!Number.isFinite(employeeId) || employeeId <= 0) {
      throw new Error("Invalid employee ID");
    }

    let targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
    if (targetYear > 2500) targetYear -= 543;

    const normalized = normalizeQuotas(quotas);
    const typeNames = Object.keys(normalized);

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!employee) throw new Error("Employee not found.");

    const leaveTypes = await getLeaveTypesByNames(typeNames);

    const result = await prisma.$transaction(async (tx) => {
      let updatedCount = 0;
      let changeLogs = [];

      for (const lt of leaveTypes) {
        const key = lt.typeName.toUpperCase();
        let newBaseInput = Number(normalized[key] || 0);

        const setting = configs[key] || {
          totalCap: key === "ANNUAL" ? 12 : 999,
        };

        const existing = await tx.leaveQuota.findUnique({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId,
              leaveTypeId: lt.id,
              year: targetYear,
            },
          },
        });

        const currentUsed = existing ? Number(existing.usedDays || 0) : 0;
        const currentCarry = existing ? Number(existing.carryOverDays || 0) : 0;
        const currentTotal = existing ? Number(existing.totalDays || 0) : 0;

        const { finalBase } = validateAndApplyQuotaCaps({
          typeName: lt.typeName,
          totalDays: newBaseInput,
          carryOverDays: currentCarry,
          currentUsed: currentUsed,
          hrMaxCarry: lt.maxCarryOver,
          hrTotalCap: setting.totalCap
        });

        const updatedQuota = await tx.leaveQuota.upsert({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId,
              leaveTypeId: lt.id,
              year: targetYear,
            },
          },
          update: { totalDays: finalBase },
          create: {
            employeeId,
            leaveTypeId: lt.id,
            year: targetYear,
            totalDays: finalBase,
            carryOverDays: 0, 
            usedDays: 0,
          },
        });

        if (currentTotal !== finalBase) {
          const detailStr = `${lt.typeName}: ${currentTotal} -> ${finalBase}`;
          changeLogs.push(detailStr);

          await auditLog(tx, {
            action: "UPDATE",
            modelName: "LeaveQuota",
            recordId: updatedQuota.id,
            userId: hrId,
            details: `HR updated quota for ${employee.firstName}. Change: ${detailStr}`,
            oldValue: { totalDays: currentTotal },
            newValue: { totalDays: finalBase },
            req: req
          });
        }

        updatedCount++;
      }

      return { updatedCount, changeLogs };
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("notification_refresh");
      if (result.changeLogs.length > 0) {
        const summaryDetails = `Updated quotas for ${employee.firstName}: ${result.changeLogs.join(", ")}`;
        io.emit("new-audit-log", {
          id: Date.now(),
          action: "UPDATE",
          modelName: "LeaveQuota",
          recordId: employeeId,
          performedBy: {
            firstName: req.user.firstName,
            lastName: req.user.lastName,
          },
          details: summaryDetails,
          createdAt: new Date(),
        });
      }
    }

    res.json({
      message: `Quotas for ${targetYear} updated successfully.`,
      employeeId,
      year: targetYear,
      ...result,
    });
  } catch (error) {
    console.error("updateEmployeeQuotasByType error:", error);
    res.status(400).json({ error: error.message });
  }
};

function normalizeQuotas(quotas) {
  if (!quotas || typeof quotas !== "object") return {};
  const normalized = {};
  for (const [key, value] of Object.entries(quotas)) {
    normalized[key.toUpperCase()] = Number(value);
  }
  return normalized;
}

async function getLeaveTypesByNames(typeNames) {
  if (!typeNames || typeNames.length === 0) return [];
  return await prisma.leaveType.findMany({
    where: {
      typeName: {
        in: typeNames,
        mode: 'insensitive'
      }
    }
  });
}
