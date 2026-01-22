// backend/src/controllers/departmentController.js
const prisma = require("../config/prisma");
const { auditLog } = require("../utils/logger"); // ✅ Import Logger

// 1. ดึงข้อมูลแผนกทั้งหมด (ไม่ต้อง Log ก็ได้ เพราะเป็นแค่การดูข้อมูล)
exports.getAllDepartments = async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        _count: {
          select: { employees: true }
        }
      },
      orderBy: { id: 'asc' }
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

    if (!name) {
      return res.status(400).json({ error: "Department name is required" });
    }

    const existing = await prisma.department.findFirst({
        where: { name: name.trim() }
    });

    if (existing) {
        return res.status(400).json({ error: "Department name already exists" });
    }

    // ✅ ใช้ Transaction
    const result = await prisma.$transaction(async (tx) => {
        const newDept = await tx.department.create({
            data: {
                name: name.trim(),
                description: description || null
            }
        });

        // ✅ บันทึก Log
        await auditLog(tx, {
            action: "CREATE",
            modelName: "Department",
            recordId: newDept.id,
            userId: adminId,
            details: `Created new department: ${newDept.name}`,
            newValue: newDept,
            req: req
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
            createdAt: new Date()
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
    const { id } = req.params;
    const { name, description } = req.body;
    const adminId = req.user.id;
    const deptId = parseInt(id);

    // เช็คว่ามีแผนกนี้จริงไหม
    const oldDept = await prisma.department.findUnique({
        where: { id: deptId }
    });

    if (!oldDept) return res.status(404).json({ error: "Department not found" });

    // เช็คชื่อซ้ำ
    if (name && name !== oldDept.name) {
        const duplicate = await prisma.department.findFirst({
            where: { name: name.trim() }
        });
        if (duplicate) return res.status(400).json({ error: "Department name already exists" });
    }

    // ✅ ใช้ Transaction
    const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.department.update({
            where: { id: deptId },
            data: {
                name: name ? name.trim() : undefined,
                description: description
            }
        });

        // เปรียบเทียบค่าที่เปลี่ยน
        const changes = [];
        if (name && name !== oldDept.name) changes.push(`Name: ${oldDept.name} -> ${name}`);
        if (description !== undefined && description !== oldDept.description) changes.push(`Description updated`);

        const details = changes.length > 0 
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
            req: req
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
            createdAt: new Date()
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
    const { id } = req.params;
    const deptId = parseInt(id);
    const adminId = req.user.id;

    // Safety Check: ห้ามลบถ้ายังมีพนักงาน
    const employeeCount = await prisma.employee.count({
        where: { departmentId: deptId }
    });

    if (employeeCount > 0) {
        return res.status(400).json({ 
            error: `Cannot delete. There are ${employeeCount} employees in this department.` 
        });
    }

    // ✅ ใช้ Transaction
    const result = await prisma.$transaction(async (tx) => {
        // ดึงข้อมูลก่อนลบ เพื่อเอาชื่อมาลง Log
        const target = await tx.department.findUnique({ where: { id: deptId } });
        if (!target) throw { code: 'P2025' };

        await tx.department.delete({
            where: { id: deptId }
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
            req: req
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
            createdAt: new Date()
        });
    }

    res.json({ message: "Department deleted successfully" });
  } catch (error) {
    console.error("Delete Department Error:", error);
    if (error.code === 'P2025') {
        return res.status(404).json({ error: "Department not found" });
    }
    res.status(500).json({ error: "Failed to delete department" });
  }
};