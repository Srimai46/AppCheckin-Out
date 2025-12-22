const prisma = require("../config/prisma");
const { calculateTotalDays } = require("../utils/leaveHelpers");

// ---------------------------------------------------------
// ส่วนของ Worker (พนักงานทั่วไป)
// ---------------------------------------------------------

// 1. ดึงโควตาของตัวเอง
exports.getMyQuotas = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const quotas = await prisma.leaveQuota.findMany({
            where: { employeeId: req.user.id, year: currentYear },
            include: { leaveType: true },
        });

        res.json(quotas.map(q => ({
            type: q.leaveType.typeName,
            total: Number(q.totalDays),
            used: Number(q.usedDays),
            remaining: Number(q.totalDays) - Number(q.usedDays),
        })));
    } catch (error) {
        res.status(500).json({ error: "ดึงข้อมูลโควตาผิดพลาด" });
    }
};

// 2. ดูประวัติการลาของตนเอง
exports.getMyLeaves = async (req, res) => {
    try {
        const leaves = await prisma.leaveRequest.findMany({
            where: { employeeId: req.user.id },
            orderBy: { requestedAt: "desc" },
            include: { leaveType: true },
        });
        res.json(leaves);
    } catch (error) {
        res.status(500).json({ error: "ดึงข้อมูลประวัติผิดพลาด" });
    }
};

// 3. ยื่นคำขอลาใหม่
exports.createLeaveRequest = async (req, res) => {
    try {
        const { type, startDate, endDate, reason, startDuration, endDuration } = req.body;
        const userId = req.user.id;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const year = start.getFullYear();

        const leaveType = await prisma.leaveType.findUnique({ where: { typeName: type } });
        if (!leaveType) return res.status(400).json({ error: "ไม่พบประเภทการลานี้" });

        const totalDaysRequested = calculateTotalDays(start, end, startDuration, endDuration);
        if (totalDaysRequested <= 0) {
            return res.status(400).json({ error: "จำนวนวันลาต้องมากกว่า 0 (ตรวจสอบวันหยุด)" });
        }

        const result = await prisma.$transaction(async (tx) => {
            const overlap = await tx.leaveRequest.findFirst({
                where: {
                    employeeId: userId,
                    status: { in: ["Pending", "Approved"] },
                    OR: [{ startDate: { lte: end }, endDate: { gte: start } }],
                },
            });
            if (overlap) throw new Error("คุณมีรายการลาทับซ้อนในช่วงเวลานี้อยู่แล้ว");

            const quota = await tx.leaveQuota.findUnique({
                where: { employeeId_leaveTypeId_year: { employeeId: userId, leaveTypeId: leaveType.id, year } }
            });

            if (!quota) throw new Error("ไม่พบโควตาวันลาของคุณสำหรับปีนี้");
            
            const remaining = Number(quota.totalDays) - Number(quota.usedDays);
            if (remaining < totalDaysRequested) {
                throw new Error(`วันลาคงเหลือไม่พอ (เหลือ ${remaining} วัน)`);
            }

            return await tx.leaveRequest.create({
                data: {
                    employeeId: userId, leaveTypeId: leaveType.id,
                    startDate: start, endDate: end, totalDaysRequested,
                    reason, startDuration, endDuration, status: "Pending",
                },
            });
        });

        const hrUsers = await prisma.employee.findMany({ where: { role: "HR" }, select: { id: true } });
        if (hrUsers.length > 0) {
            await prisma.notification.createMany({
                data: hrUsers.map(hr => ({
                    employeeId: hr.id,
                    notificationType: "NewRequest",
                    message: `คำขอลาใหม่: พนักงาน ID ${userId} ขอลา ${type}`,
                    relatedRequestId: result.id,
                }))
            });
        }

        res.status(201).json({ message: "ส่งคำขอลาสำเร็จ", data: result });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// ---------------------------------------------------------
// ส่วนของ HR (จัดการและอนุมัติ)
// ---------------------------------------------------------

// 4. ดูใบลาที่รออนุมัติ (Pending)
exports.getPendingRequests = async (req, res) => {
    try {
        const requests = await prisma.leaveRequest.findMany({
            where: { status: "Pending" },
            include: {
                employee: {
                    select: { id: true, firstName: true, lastName: true, email: true, profileImageUrl: true },
                },
                leaveType: true,
            },
            orderBy: { requestedAt: "asc" },
        });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: "ไม่สามารถดึงรายการรออนุมัติได้" });
    }
};

// 5. ดูใบลาทั้งหมด (Calendar)
exports.getAllLeaves = async (req, res) => {
    try {
        const leaves = await prisma.leaveRequest.findMany({
            include: {
                employee: { select: { firstName: true, lastName: true, role: true } },
                leaveType: { select: { typeName: true } },
            },
            orderBy: { startDate: "desc" },
        });

        res.json(leaves.map((leave) => ({
            id: leave.id,
            employeeId: leave.employeeId,
            name: `${leave.employee.firstName} ${leave.employee.lastName}`,
            type: leave.leaveType.typeName,
            startDate: leave.startDate,
            endDate: leave.endDate,
            totalDays: Number(leave.totalDaysRequested),
            status: leave.status,
            reason: leave.reason,
            requestedAt: leave.requestedAt
        })));
    } catch (error) {
        res.status(500).json({ error: "ดึงข้อมูลประวัติการลาทั้งหมดไม่สำเร็จ" });
    }
};

// 6. อนุมัติหรือปฏิเสธใบลา
exports.updateLeaveStatus = async (req, res) => {
    try {
        const { id, status, rejectReason } = req.body;
        const hrId = req.user.id;

        await prisma.$transaction(async (tx) => {
            const request = await tx.leaveRequest.findUnique({
                where: { id: parseInt(id) },
                include: { leaveType: true }
            });

            if (!request || request.status !== "Pending") throw new Error("ใบลาไม่อยู่ในสถานะที่ดำเนินการได้");

            await tx.leaveRequest.update({
                where: { id: request.id },
                data: { status, approvedByHrId: hrId, approvalDate: new Date() }
            });

            if (status === "Approved") {
                await tx.leaveQuota.update({
                    where: {
                        employeeId_leaveTypeId_year: {
                            employeeId: request.employeeId,
                            leaveTypeId: request.leaveTypeId,
                            year: request.startDate.getFullYear()
                        }
                    },
                    data: { usedDays: { increment: request.totalDaysRequested } }
                });
            }

            await tx.notification.create({
                data: {
                    employeeId: request.employeeId,
                    notificationType: status === "Approved" ? "Approval" : "Rejection",
                    message: `คำขอลาของคุณได้รับการ ${status === "Approved" ? "อนุมัติ" : "ปฏิเสธ"}`,
                    relatedRequestId: request.id
                }
            });
        });

        res.json({ message: `ดำเนินการ ${status} เรียบร้อยแล้ว` });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// 7. แก้ไขโควตาพนักงาน
exports.updateEmployeeQuota = async (req, res) => {
    try {
        const { employeeId } = req.params; 
        const { leaveTypeId, year, totalDays } = req.body;
        const currentYear = new Date().getFullYear();

        if (parseInt(year) < currentYear) {
            return res.status(400).json({ error: "ห้ามแก้ไขโควตาย้อนหลัง" });
        }

        const result = await prisma.leaveQuota.upsert({
            where: {
                employeeId_leaveTypeId_year: {
                    employeeId: parseInt(employeeId),
                    leaveTypeId: parseInt(leaveTypeId),
                    year: parseInt(year)
                }
            },
            update: { totalDays: parseFloat(totalDays) },
            create: {
                employeeId: parseInt(employeeId),
                leaveTypeId: parseInt(leaveTypeId),
                year: parseInt(year),
                totalDays: parseFloat(totalDays),
                usedDays: 0
            }
        });

        res.json({ message: `จัดการโควตาปี ${year} สำเร็จ`, data: result });
    } catch (error) {
        res.status(500).json({ error: "ไม่สามารถจัดการโควตาได้" });
    }
};