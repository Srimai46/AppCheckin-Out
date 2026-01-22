// backend/src/controllers/departmentController.js
const prisma = require("../config/prisma");
const { auditLog } = require("../utils/logger"); // ✅ Import Logger

// =========================
// Helpers
// =========================
const toInt = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

// 1. ดึงข้อมูลแผนกทั้งหมด
// ✅ รองรับ query:
// - ?simple=1        -> คืน [{id,name}] สำหรับ dropdown/filter (เบาและเร็ว)
// - ?includeCount=1  -> include _count.employees
// - ?order=name|id   -> default name
exports.getAllDepartments = async (req, res) => {
  try {
    const simple = String(req.query.simple || "0") === "1";
    const includeCount = String(req.query.includeCount || "0") === "1";
    const order = String(req.query.order || "name").toLowerCase(); // name | id

    // ✅ dropdown/filter ต้องการแค่ id,name
    if (simple) {
      const departments = await prisma.department.findMany({
        select: { id: true, name: true },
        orderBy: order === "id" ? { id: "asc" } : { name: "asc" },
      });
      return res.json(departments);
    }

    // ✅ full list (หน้า manage)
    const departments = await prisma.department.findMany({
      ...(includeCount
        ? {
            include: {
              _count: {
                select: { employees: true },
              },
            },
          }
        : {}),
      orderBy: order === "id" ? { id: "asc" } : { name: "asc" },
    });

    res.json(departments);
  } catch (error) {
    console.error("Get Departments Error:", error);
    res.status(500).json({ error: "Failed to fetch departments" });
  }
};

// 2. เพิ่มแผนกใหม่ + Log
exports.createDepartment = async (req, res) => {
  try {
    const { name, description } = req.body;
    const adminId = req.user.id; // ✅ เอา ID คนทำรายการ

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "Department name is required" });
    }

    const trimmedName = String(name).trim();

    const existing = await prisma.department.findFirst({
      where: { name: trimmedName },
    });

    if (existing) {
      return res.status(400).json({ error: "Department name already exists" });
    }

    // ✅ ใช้ Transaction
    const result = await prisma.$transaction(async (tx) => {
      const newDept = await tx.department.create({
        data: {
          name: trimmedName,
          description: description ? String(description) : null,
        },
      });

      // ✅ บันทึก Log
      await auditLog(tx, {
        action: "CREATE",
        modelName: "Department",
        recordId: newDept.id,
        userId: adminId,
        details: `Created new department: ${newDept.name}`,
        newValue: newDept,
        req: req,
      });

      return newDept;
    });

    // ✅ ส่ง Socket Realtime
    const io = req.app.get("io");
    if (io) {
      io.emit("new-audit-log", {
        id: Date.now(),
        action: "CREATE",
        modelName: "Department",
        recordId: result.id,
        performedBy: { firstName: req.user.firstName, lastName: req.user.lastName },
        details: `Created new department: ${result.name}`,
        createdAt: new Date(),
      });
    }

    res.status(201).json({ message: "Department created", data: result });
  } catch (error) {
    console.error("Create Department Error:", error);
    res.status(500).json({ error: "Failed to create department" });
  }
};

// 3. แก้ไขแผนก + Log
exports.updateDepartment = async (req, res) => {
  try {
    const deptId = toInt(req.params.id);
    if (!deptId) return res.status(400).json({ error: "Invalid department id" });

    const { name, description } = req.body;
    const adminId = req.user.id;

    // เช็คว่ามีแผนกนี้จริงไหม
    const oldDept = await prisma.department.findUnique({
      where: { id: deptId },
    });

    if (!oldDept) return res.status(404).json({ error: "Department not found" });

    const nextName = name != null ? String(name).trim() : undefined;

    // เช็คชื่อซ้ำ
    if (nextName && nextName !== oldDept.name) {
      const duplicate = await prisma.department.findFirst({
        where: { name: nextName },
      });
      if (duplicate) return res.status(400).json({ error: "Department name already exists" });
    }

    // ✅ ใช้ Transaction
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.department.update({
        where: { id: deptId },
        data: {
          name: nextName || undefined,
          // ✅ ถ้าไม่ได้ส่งมา อย่า overwrite
          description: description === undefined ? undefined : description ? String(description) : null,
        },
      });

      // เปรียบเทียบค่าที่เปลี่ยน
      const changes = [];
      if (nextName && nextName !== oldDept.name)
        changes.push(`Name: ${oldDept.name} -> ${nextName}`);
      if (description !== undefined && description !== oldDept.description)
        changes.push(`Description updated`);

      const details =
        changes.length > 0
          ? `Updated Department ${oldDept.name}: ${changes.join(", ")}`
          : `Updated Department ${oldDept.name} (No changes)`;

      // ✅ บันทึก Log
      await auditLog(tx, {
        action: "UPDATE",
        modelName: "Department",
        recordId: deptId,
        userId: adminId,
        details: details,
        oldValue: oldDept,
        newValue: updated,
        req: req,
      });

      return { updated, details };
    });

    // ✅ ส่ง Socket Realtime
    const io = req.app.get("io");
    if (io) {
      io.emit("new-audit-log", {
        id: Date.now(),
        action: "UPDATE",
        modelName: "Department",
        recordId: deptId,
        performedBy: { firstName: req.user.firstName, lastName: req.user.lastName },
        details: result.details,
        createdAt: new Date(),
      });
    }

    res.json({ message: "Department updated", data: result.updated });
  } catch (error) {
    console.error("Update Department Error:", error);
    res.status(500).json({ error: "Failed to update department" });
  }
};

// 4. ลบแผนก + Log
exports.deleteDepartment = async (req, res) => {
  try {
    const deptId = toInt(req.params.id);
    if (!deptId) return res.status(400).json({ error: "Invalid department id" });

    const adminId = req.user.id;

    // Safety Check: ห้ามลบถ้ายังมีพนักงาน
    const employeeCount = await prisma.employee.count({
      where: { departmentId: deptId },
    });

    if (employeeCount > 0) {
      return res.status(400).json({
        error: `Cannot delete. There are ${employeeCount} employees in this department.`,
      });
    }

    // ✅ ใช้ Transaction
    const result = await prisma.$transaction(async (tx) => {
      // ดึงข้อมูลก่อนลบ เพื่อเอาชื่อมาลง Log
      const target = await tx.department.findUnique({ where: { id: deptId } });
      if (!target) throw { code: "P2025" };

      await tx.department.delete({
        where: { id: deptId },
      });

      const details = `Deleted Department: ${target.name}`;

      // ✅ บันทึก Log
      await auditLog(tx, {
        action: "DELETE",
        modelName: "Department",
        recordId: deptId,
        userId: adminId,
        details: details,
        oldValue: target, // เก็บข้อมูลที่ถูกลบไว้ดูย้อนหลัง
        req: req,
      });

      return { details, targetName: target.name };
    });

    // ✅ ส่ง Socket Realtime
    const io = req.app.get("io");
    if (io) {
      io.emit("new-audit-log", {
        id: Date.now(),
        action: "DELETE",
        modelName: "Department",
        recordId: deptId,
        performedBy: { firstName: req.user.firstName, lastName: req.user.lastName },
        details: result.details,
        createdAt: new Date(),
      });
    }

    res.json({ message: "Department deleted successfully" });
  } catch (error) {
    console.error("Delete Department Error:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Department not found" });
    }
    res.status(500).json({ error: "Failed to delete department" });
  }
};
