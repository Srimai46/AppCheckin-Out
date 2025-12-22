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

        res.json(quotas.map(q => {
            const totalAvailable = Number(q.totalDays) + Number(q.carryOverDays);
            return {
                type: q.leaveType.typeName,
                baseQuota: Number(q.totalDays),
                carryOver: Number(q.carryOverDays),
                total: totalAvailable,
                used: Number(q.usedDays),
                remaining: totalAvailable - Number(q.usedDays),
            };
        }));
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
exports.grantSpecialLeave = async (req, res) => {
    try {
        const { employeeId, leaveTypeId, amount, reason, year } = req.body;

        await prisma.$transaction(async (tx) => {
            // 1. บันทึกประวัติการมอบวันลาพิเศษ (ถ้ามีตาราง SpecialLeaveGrant)
            // 2. อัปเดตโควตาพนักงานทันที
            await tx.leaveQuota.upsert({
                where: {
                    employeeId_leaveTypeId_year: {
                        employeeId: parseInt(employeeId),
                        leaveTypeId: parseInt(leaveTypeId),
                        year: parseInt(year)
                    }
                },
                update: {
                    totalDays: { increment: parseFloat(amount) }
                },
                create: {
                    employeeId: parseInt(employeeId),
                    leaveTypeId: parseInt(leaveTypeId),
                    year: parseInt(year),
                    totalDays: parseFloat(amount),
                    usedDays: 0
                }
            });
        });

        res.json({ message: "มอบสิทธิ์วันลาพิเศษสำเร็จและอัปเดตโควตาแล้ว" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "ไม่สามารถมอบวันลาพิเศษได้" });
    }
};

// แก้ไขฟังก์ชันสร้างคำขอลา (เพิ่มการเช็ควันลาติดต่อกัน)
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
        
        // ✅ เพิ่ม: ตรวจสอบห้ามลาติดต่อกันเกินกำหนด (Consecutive Check)
        if (leaveType.maxConsecutiveDays > 0 && totalDaysRequested > leaveType.maxConsecutiveDays) {
            return res.status(400).json({ 
                error: `ประเภทการลา ${type} ห้ามลาติดต่อกันเกิน ${leaveType.maxConsecutiveDays} วัน` 
            });
        }

        if (totalDaysRequested <= 0) {
            return res.status(400).json({ error: "จำนวนวันลาต้องมากกว่า 0 (ตรวจสอบวันหยุด)" });
        }

        const result = await prisma.$transaction(async (tx) => {
            // ... (Logic เดิม: Check Overlap & Check Quota)
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
            
            const remaining = Number(quota.totalDays) + Number(quota.carryOverDays || 0) - Number(quota.usedDays);
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

        // ... (Logic ส่ง Notification)
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

// 8. ประมวลผลการทบวันลา (Carry Over) สิ้นปี
exports.processCarryOver = async (req, res) => {
    try {
        const { targetYear } = req.body; // เช่น 2026
        const lastYear = targetYear - 1;

        await prisma.$transaction(async (tx) => {
            // ดึงโควตาทุกคนของปีที่แล้วมาตรวจสอบวันคงเหลือ
            const oldQuotas = await tx.leaveQuota.findMany({
                where: { year: lastYear },
                include: { leaveType: true }
            });

            for (const quota of oldQuotas) {
                // คำนวณวันคงเหลือ: (วันโควตาเดิม + วันที่เคยทบมา) - วันที่ใช้ไป
                const remaining = Number(quota.totalDays) + Number(quota.carryOverDays) - Number(quota.usedDays);
                const maxLimit = Number(quota.leaveType.maxCarryOver);
                
                // จำนวนวันที่จะทบได้ต้องไม่เกินที่ HR กำหนด
                const carryAmount = Math.min(Math.max(remaining, 0), maxLimit);

                if (carryAmount > 0) {
                    await tx.leaveQuota.upsert({
                        where: {
                            employeeId_leaveTypeId_year: {
                                employeeId: quota.employeeId,
                                leaveTypeId: quota.leaveTypeId,
                                year: targetYear
                            }
                        },
                        update: { carryOverDays: carryAmount },
                        create: {
                            employeeId: quota.employeeId,
                            leaveTypeId: quota.leaveTypeId,
                            year: targetYear,
                            totalDays: 0, 
                            carryOverDays: carryAmount,
                            usedDays: 0
                        }
                    });
                }
            }
        });

        res.json({ message: `ประมวลผลการทบวันลาเข้าสู่ปี ${targetYear} สำเร็จ` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 9. มอบสิทธิ์วันลาพิเศษให้พนักงาน
exports.grantSpecialLeave = async (req, res) => {
    try {
        const { employeeId, leaveTypeId, amount, reason, year } = req.body;

        await prisma.$transaction(async (tx) => {
            // 1. บันทึกประวัติการให้วันลาพิเศษ
            await tx.specialLeaveGrant.create({
                data: {
                    employeeId: parseInt(employeeId),
                    leaveTypeId: parseInt(leaveTypeId),
                    amount: parseFloat(amount),
                    reason: reason,
                    expiryDate: new Date(`${year}-12-31`) // หมดอายุสิ้นปี
                }
            });

            // 2. อัปเดตโควตาใน LeaveQuota (เพิ่ม totalDays)
            await tx.leaveQuota.upsert({
                where: {
                    employeeId_leaveTypeId_year: {
                        employeeId: parseInt(employeeId),
                        leaveTypeId: parseInt(leaveTypeId),
                        year: parseInt(year)
                    }
                },
                update: {
                    totalDays: { increment: parseFloat(amount) }
                },
                create: {
                    employeeId: parseInt(employeeId),
                    leaveTypeId: parseInt(leaveTypeId),
                    year: parseInt(year),
                    totalDays: parseFloat(amount),
                    usedDays: 0
                }
            });
        });

        res.json({ message: "มอบสิทธิ์วันลาพิเศษสำเร็จ" });
    } catch (error) {
        res.status(500).json({ error: "ล้มเหลวในการมอบสิทธิ์วันลาพิเศษ" });
    }
};