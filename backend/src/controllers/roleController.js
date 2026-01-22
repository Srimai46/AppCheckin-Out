// backend/src/controllers/roleController.js
const prisma = require("../config/prisma");
const { auditLog } = require("../utils/logger");

// GET /roles?simple=1
exports.getAllRoles = async (req, res) => {
  try {
    const simple = String(req.query.simple || "") === "1";

    const roles = await prisma.role.findMany({
      ...(simple
        ? { select: { id: true, name: true } }
        : {
            include: {
              _count: { select: { employees: true } },
              workConfig: true,
            },
          }),
      orderBy: { id: "asc" },
    });

    // ✅ ส่งเป็น array ตรงๆ เพื่อให้ FE ง่ายที่สุด
    return res.json(roles);
  } catch (error) {
    console.error("Get Roles Error:", error);
    return res.status(500).json({ error: "Failed to fetch roles" });
  }
};

// POST /roles
exports.createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    const userId = req.user?.id;

    if (!name) return res.status(400).json({ error: "Role name is required" });

    const existing = await prisma.role.findFirst({
      where: { name: String(name).trim() },
    });
    if (existing) return res.status(400).json({ error: "Role name already exists" });

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          name: String(name).trim(),
          description: description ?? null,
          permissions: permissions ?? null,
        },
      });

      await auditLog(tx, {
        action: "CREATE",
        modelName: "Role",
        recordId: created.id,
        userId,
        details: `Created role: ${created.name}`,
        newValue: created,
        req,
      });

      return created;
    });

    return res.status(201).json({ message: "Role created", data: result });
  } catch (error) {
    console.error("Create Role Error:", error);
    return res.status(500).json({ error: "Failed to create role" });
  }
};

// PUT /roles/:id
exports.updateRole = async (req, res) => {
  try {
    const roleId = Number(req.params.id);
    const { name, description, permissions } = req.body;
    const userId = req.user?.id;

    const oldRole = await prisma.role.findUnique({ where: { id: roleId } });
    if (!oldRole) return res.status(404).json({ error: "Role not found" });

    if (name && String(name).trim() !== oldRole.name) {
      const dup = await prisma.role.findFirst({ where: { name: String(name).trim() } });
      if (dup) return res.status(400).json({ error: "Role name already exists" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.role.update({
        where: { id: roleId },
        data: {
          name: name ? String(name).trim() : undefined,
          description: description !== undefined ? description : undefined,
          permissions: permissions !== undefined ? permissions : undefined,
        },
      });

      await auditLog(tx, {
        action: "UPDATE",
        modelName: "Role",
        recordId: roleId,
        userId,
        details: `Updated role: ${oldRole.name}`,
        oldValue: oldRole,
        newValue: updated,
        req,
      });

      return updated;
    });

    return res.json({ message: "Role updated", data: result });
  } catch (error) {
    console.error("Update Role Error:", error);
    return res.status(500).json({ error: "Failed to update role" });
  }
};

// DELETE /roles/:id
exports.deleteRole = async (req, res) => {
  try {
    const roleId = Number(req.params.id);
    const userId = req.user?.id;

    // safety: ห้ามลบถ้ามีพนักงานอยู่
    const employeeCount = await prisma.employee.count({ where: { roleId } });
    if (employeeCount > 0) {
      return res.status(400).json({
        error: `Cannot delete. There are ${employeeCount} employees in this role.`,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const target = await tx.role.findUnique({ where: { id: roleId } });
      if (!target) return null;

      await tx.role.delete({ where: { id: roleId } });

      await auditLog(tx, {
        action: "DELETE",
        modelName: "Role",
        recordId: roleId,
        userId,
        details: `Deleted role: ${target.name}`,
        oldValue: target,
        req,
      });

      return target;
    });

    if (!result) return res.status(404).json({ error: "Role not found" });

    return res.json({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("Delete Role Error:", error);
    return res.status(500).json({ error: "Failed to delete role" });
  }
};
