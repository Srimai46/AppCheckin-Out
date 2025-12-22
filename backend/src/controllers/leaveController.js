const prisma = require("../config/prisma");
const { calculateTotalDays } = require("../utils/leaveHelpers");

// ---------------------------------------------------------
// ส่วนของ Worker (พนักงานทั่วไป)
// ---------------------------------------------------------

// 1. ดึงโควตาของตัวเอง
exports.getMyQuotas = async (req, res) => {
    try {
        // ✅ 1. ตรวจสอบปีปัจจุบัน (พิจารณาใช้ Timezone Asia/Bangkok เพื่อความแม่นยำ)
        const currentYear = new Date().getFullYear();
        
        // ✅ 2. ดึงข้อมูลโควตา
        const quotas = await prisma.leaveQuota.findMany({
            where: { 
                employeeId: Number(req.user.id), // มั่นใจว่าเป็น Number
                year: currentYear 
            },
            include: { 
                leaveType: {
                    select: {
                        typeName: true,
                        description: true // เพิ่มข้อมูลเพื่อให้ UI แสดงผลได้ดีขึ้น
                    }
                } 
            },
        });

        // ✅ 3. ประมวลผลและส่งออกข้อมูล
        const result = quotas.map(q => {
            // ใช้ Number() หรือ parseFloat() เพื่อจัดการกับ Decimal จาก Database
            const base = Number(q.totalDays) || 0;
            const carry = Number(q.carryOverDays) || 0;
            const used = Number(q.usedDays) || 0;
            
            const totalAvailable = base + carry;
            const remaining = totalAvailable - used;

            return {
                leaveTypeId: q.leaveTypeId,
                type: q.leaveType.typeName,
                description: q.leaveType.description,
                baseQuota: base,
                carryOver: carry,
                total: totalAvailable,
                used: used,
                // ✅ แก้ไข: ป้องกันกรณีเหลือติดลบ (ถ้ามี Logic การลาเกิน)
                remaining: remaining < 0 ? 0 : remaining, 
            };
        });

        res.json(result);
    } catch (error) {
        console.error("🔥 getMyQuotas Error:", error);
        res.status(500).json({ error: "ไม่สามารถดึงข้อมูลโควตาวันลาได้" });
    }
};

// 2. ดูประวัติการลาของตนเอง
exports.getMyLeaves = async (req, res) => {
    try {
        const userId = Number(req.user.id);

        const leaves = await prisma.leaveRequest.findMany({
            where: { employeeId: userId },
            orderBy: { 
                // ✅ แก้ไข: ใช้ createdAt หรือ id แทน หาก requestedAt ไม่มีใน Schema 
                // หรือหากมีอยู่แล้วให้คงไว้ตามความเหมาะสม
                createdAt: "desc" 
            },
            include: { 
                leaveType: {
                    select: {
                        typeName: true,
                    }
                } 
            },
        });

        // ✅ แก้ไข: จัด Format ข้อมูลก่อนส่งกลับ (Data Transformation)
        const formattedLeaves = leaves.map(leave => ({
            id: leave.id,
            type: leave.leaveType.typeName,
            startDate: leave.startDate,
            endDate: leave.endDate,
            totalDays: Number(leave.totalDaysRequested),
            status: leave.status,
            reason: leave.reason,
            // ✅ เพิ่ม: ส่ง URL ไฟล์แนบแบบเต็ม หรือตรวจสอบ null
            attachmentUrl: leave.attachmentUrl ? leave.attachmentUrl : null,
            createdAt: leave.createdAt,
            // ✅ เพิ่ม: คำนวณช่วงเวลาการลาสำหรับแสดงผล
            durationText: leave.startDuration === leave.endDuration 
                ? leave.startDuration 
                : `${leave.startDuration} - ${leave.endDuration}`
        }));

        res.json(formattedLeaves);
    } catch (error) {
        console.error("🔥 getMyLeaves Error:", error);
        res.status(500).json({ error: "ไม่สามารถดึงข้อมูลประวัติการลาได้" });
    }
};

// 3. ยื่นคำขอลาใหม่
exports.createLeaveRequest = async (req, res) => {
    try {
        const { type, startDate, endDate, reason, startDuration, endDuration } = req.body;
        const userId = Number(req.user.id); // ✅ ป้องกัน Type Mismatch

        const start = new Date(startDate);
        const end = new Date(endDate);
        const year = start.getFullYear();

        // ✅ จัดการ Path ไฟล์ (แนะนำให้เก็บแบบ Relative Path)
        const attachmentUrl = req.file ? `uploads/attachments/${req.file.filename}` : null;

        // 1. ตรวจสอบประเภทการลา
        const leaveType = await prisma.leaveType.findUnique({ where: { typeName: type } });
        if (!leaveType) return res.status(400).json({ error: "ไม่พบประเภทการลานี้ในระบบ" });

        // 2. คำนวณจำนวนวันลาที่ขอ (เรียกใช้ Helper Function)
        const totalDaysRequested = calculateTotalDays(start, end, startDuration, endDuration);
        
        // 3. ตรวจสอบเงื่อนไขวันลาสูงสุดต่อครั้ง
        if (leaveType.maxConsecutiveDays > 0 && totalDaysRequested > leaveType.maxConsecutiveDays) {
            return res.status(400).json({ 
                error: `ประเภทการลา ${type} ห้ามลาติดต่อกันเกิน ${leaveType.maxConsecutiveDays} วัน` 
            });
        }

        if (totalDaysRequested <= 0) {
            return res.status(400).json({ error: "จำนวนวันลาต้องมากกว่า 0 (โปรดตรวจสอบวันหยุดและระยะเวลา)" });
        }

        // --- เริ่มต้น Transaction ---
        const result = await prisma.$transaction(async (tx) => {
            
            // 4. ตรวจสอบการลาทับซ้อน (Overlap Check)
            // เช็คเฉพาะรายการที่ Pending หรือ Approved เท่านั้น
            const overlap = await tx.leaveRequest.findFirst({
                where: {
                    employeeId: userId,
                    status: { in: ["Pending", "Approved"] },
                    AND: [
                        { startDate: { lte: end } },
                        { endDate: { gte: start } }
                    ]
                },
            });

            if (overlap) throw new Error("คุณมีรายการลาที่ทับซ้อนในช่วงเวลานี้อยู่แล้ว (สถานะรอดำเนินการหรืออนุมัติแล้ว)");

            // 5. ตรวจสอบโควตาวันลา
            const quota = await tx.leaveQuota.findUnique({
                where: { 
                    employeeId_leaveTypeId_year: { 
                        employeeId: userId, 
                        leaveTypeId: leaveType.id, 
                        year: year 
                    } 
                }
            });

            if (!quota) throw new Error(`ไม่พบข้อมูลโควตาวันลาของคุณสำหรับปี ${year}`);
            
            // คำนวณวันลาคงเหลือ: (โควตาหลัก + ยอดเตยกมา) - ที่ใช้ไปแล้ว
            const remaining = Number(quota.totalDays) + Number(quota.carryOverDays || 0) - Number(quota.usedDays);
            
            if (remaining < totalDaysRequested) {
                throw new Error(`วันลาคงเหลือไม่พอ (คงเหลือ ${remaining} วัน, แต่ต้องการลา ${totalDaysRequested} วัน)`);
            }

            // 6. บันทึกคำขอลา
            return await tx.leaveRequest.create({
                data: {
                    employeeId: userId,
                    leaveTypeId: leaveType.id,
                    startDate: start,
                    endDate: end,
                    totalDaysRequested: totalDaysRequested,
                    reason: reason ? reason.trim() : null,
                    startDuration: startDuration || "Full",
                    endDuration: endDuration || "Full",
                    status: "Pending",
                    attachmentUrl: attachmentUrl, 
                },
            });
        });

        res.status(201).json({ message: "ส่งคำขอลาสำเร็จแล้ว", data: result });

    } catch (error) {
        console.error("🔥 createLeaveRequest Error:", error.message);
        // ส่งข้อความ Error ที่เหมาะสมกลับไปให้หน้าบ้าน
        res.status(400).json({ error: error.message });
    }
};

// ---------------------------------------------------------
// ส่วนของ HR (จัดการและอนุมัติ)
// ---------------------------------------------------------

// 1. ดึงคำขอลาที่ยังไม่อนุมัติ
exports.getPendingRequests = async (req, res) => {
    try {
        // ✅ 1. ตรวจสอบสิทธิ์ (ถ้าไม่ได้ใส่ไว้ใน Middleware ของ Routes)
        // แม้จะมี authorize('HR', 'Admin') ที่ Route แล้ว การเช็คซ้ำที่นี่ช่วยป้องกันอีกชั้น
        if (!["HR", "Admin"].includes(req.user.role)) {
            return res.status(403).json({ error: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลส่วนนี้" });
        }

        // ✅ 2. ดึงรายการคำขอที่รออนุมัติ
        const requests = await prisma.leaveRequest.findMany({
            where: { status: "Pending" },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        profileImageUrl: true,
                        // ✅ เพิ่ม: อาจดึงแผนกหรือตำแหน่งมาแสดงเพื่อให้ HR ตัดสินใจง่ายขึ้น
                        role: true 
                    }
                },
                leaveType: {
                    select: {
                        typeName: true,
                        maxConsecutiveDays: true // ✅ เพิ่ม: เพื่อให้ HR เห็นว่าลาเกินโควตาต่อครั้งหรือไม่
                    }
                },
            },
            // ✅ แก้ไข: เรียงจากเก่าไปใหม่ (asc) เพื่อให้ลำดับ "มาก่อน-ได้ก่อน" (First-come, First-served)
            orderBy: { 
                createdAt: "asc" // หากไม่มี requestedAt ให้ใช้ createdAt แทน
            },
        });

        // ✅ 3. จัดรูปแบบข้อมูล (Optional: ช่วยให้ Frontend แสดงผลง่ายขึ้น)
        const formattedRequests = requests.map(reqItem => ({
            ...reqItem,
            employeeName: `${reqItem.employee.firstName} ${reqItem.employee.lastName}`,
            totalDays: Number(reqItem.totalDaysRequested), // ป้องกันปัญหา Decimal จาก DB
            // ✅ เพิ่ม: ส่ง URL แบบเต็มสำหรับไฟล์แนบ (หากจำเป็น)
            attachmentUrl: reqItem.attachmentUrl ? reqItem.attachmentUrl : null
        }));

        res.status(200).json(formattedRequests);

    } catch (error) {
        console.error("🔥 getPendingRequests Error:", error);
        res.status(500).json({ error: "ไม่สามารถดึงรายการคำขอลาที่รออนุมัติได้" });
    }
};

// 2. ดึงคำขอลาทั้งหมด
exports.getAllLeaves = async (req, res) => {
    try {
        const leaves = await prisma.leaveRequest.findMany({
            include: {
                employee: { select: { firstName: true, lastName: true, role: true } },
                leaveType: { select: { typeName: true } },
            },
            orderBy: { startDate: "desc" },
        });
        res.json(leaves.map(l => ({
            ...l,
            name: `${l.employee.firstName} ${l.employee.lastName}`,
            type: l.leaveType.typeName,
            totalDays: Number(l.totalDaysRequested)
        })));
    } catch (error) {
        res.status(500).json({ error: "ดึงข้อมูลผิดพลาด" });
    }
};exports.getAllLeaves = async (req, res) => {
    try {
        // ✅ 1. รับค่า Filter จาก Query Parameters (เพื่อความยืดหยุ่นในหน้าบ้าน)
        const { status, leaveType, start, end } = req.query;

        // ✅ 2. สร้าง Condition สำหรับการค้นหา
        const where = {};
        if (status) where.status = status;
        if (leaveType) where.leaveType = { typeName: leaveType };
        if (start && end) {
            where.startDate = {
                gte: new Date(start),
                lte: new Date(end)
            };
        }

        // ✅ 3. ดึงข้อมูลพร้อมความสัมพันธ์
        const leaves = await prisma.leaveRequest.findMany({
            where,
            include: {
                employee: { 
                    select: { 
                        id: true, // ✅ เพิ่ม ID เพื่อให้หน้าบ้านลิงก์ไปหน้าพนักงานได้
                        firstName: true, 
                        lastName: true, 
                        role: true,
                        profileImageUrl: true // ✅ เพิ่มรูปโปรไฟล์เพื่อความสวยงามในตาราง
                    } 
                },
                leaveType: { 
                    select: { 
                        typeName: true 
                    } 
                },
            },
            orderBy: { startDate: "desc" },
        });

        // ✅ 4. จัดรูปแบบข้อมูล (Data Transformation)
        const result = leaves.map(l => ({
            id: l.id,
            employeeId: l.employee.id,
            fullName: `${l.employee.firstName} ${l.employee.lastName}`,
            profileImageUrl: l.employee.profileImageUrl,
            role: l.employee.role,
            leaveType: l.leaveType.typeName,
            startDate: l.startDate,
            endDate: l.endDate,
            totalDays: Number(l.totalDaysRequested), // ✅ มั่นใจว่าเป็น Number
            status: l.status,
            reason: l.reason,
            attachmentUrl: l.attachmentUrl,
            createdAt: l.createdAt
        }));

        res.status(200).json(result);

    } catch (error) {
        console.error("🔥 getAllLeaves Error:", error);
        res.status(500).json({ error: "ไม่สามารถดึงข้อมูลรายการลาทั้งหมดได้" });
    }
};

// 3. อนุมัติหรือปฏิเสธคำขอลา
exports.updateLeaveStatus = async (req, res) => {
    try {
        const { id, status, isSpecial } = req.body; 
        const hrId = req.user.id;
        const leaveId = parseInt(id);

        // 1. Validation เบื้องต้น
        if (!leaveId || !["Approved", "Rejected"].includes(status)) {
            return res.status(400).json({ error: "ข้อมูล ID หรือสถานะไม่ถูกต้อง" });
        }

        const result = await prisma.$transaction(async (tx) => {
            // 2. ล็อกข้อมูลใบลาและดึงข้อมูลล่าสุด
            const request = await tx.leaveRequest.findUnique({
                where: { id: leaveId },
                include: { leaveType: true }
            });

            // ตรวจสอบว่าใบลาต้องยังเป็น Pending เท่านั้น
            if (!request || request.status !== "Pending") {
                throw new Error("ใบลาไม่อยู่ในสถานะที่สามารถดำเนินการได้ หรือถูกดำเนินการไปแล้ว");
            }

            // 3. อัปเดตสถานะใบลา
            // ✅ ปรับปรุง: เพิ่มการเช็ค status: "Pending" ใน where เพื่อความปลอดภัยสูงสุด (Optimistic Locking)
            const updatedRequest = await tx.leaveRequest.update({
                where: { id: leaveId, status: "Pending" }, 
                data: { 
                    status, 
                    approvedByHrId: hrId, 
                    approvalDate: new Date(),
                    isSpecialApproved: status === "Approved" ? (!!isSpecial) : false
                }
            });

            // 4. จัดการหักโควตา (กรณีอนุมัติแบบปกติ)
            if (status === "Approved" && !isSpecial) {
                await tx.leaveQuota.update({
                    where: {
                        employeeId_leaveTypeId_year: {
                            employeeId: request.employeeId,
                            leaveTypeId: request.leaveTypeId,
                            year: request.startDate.getFullYear()
                        }
                    },
                    data: { 
                        // ✅ มั่นใจว่าใช้ Number และป้องกันค่า Null
                        usedDays: { increment: Number(request.totalDaysRequested) } 
                    }
                });
            }

            // 5. ระบบแจ้งเตือน (Notification)
            let notifyMsg = `คำขอลา ${request.leaveType.typeName} ของคุณได้รับการ ${status === "Approved" ? "อนุมัติ" : "ปฏิเสธ"}`;
            if (status === "Approved" && isSpecial) {
                notifyMsg = `คำขอลา ${request.leaveType.typeName} ได้รับการอนุมัติเป็นกรณีพิเศษ (ไม่หักโควตาวันลา)`;
            }

            const newNotification = await tx.notification.create({
                data: {
                    employeeId: request.employeeId,
                    notificationType: status === "Approved" ? "Approval" : "Rejection",
                    message: notifyMsg,
                    relatedRequestId: request.id,
                    isRead: false
                }
            });

            // 6. นับจำนวนแจ้งเตือนที่ยังไม่ได้อ่าน
            const unreadCount = await tx.notification.count({
                where: { employeeId: request.employeeId, isRead: false }
            });

            return { updatedRequest, newNotification, unreadCount };
        });

        // 7. ส่ง Real-time Notification ผ่าน Socket.io
        const io = req.app.get("io");
        if (io) {
            io.to(`user_${result.updatedRequest.employeeId}`).emit("new_notification", {
                id: result.newNotification.id,
                message: result.newNotification.message,
                type: result.newNotification.notificationType,
                relatedRequestId: result.newNotification.relatedRequestId,
                createdAt: result.newNotification.createdAt,
                unreadCount: result.unreadCount 
            });
        }

        res.json({ 
            success: true,
            message: `ดำเนินการ ${status === "Approved" ? "อนุมัติ" : "ปฏิเสธ"}${isSpecial ? ' (กรณีพิเศษ)' : ''} เรียบร้อยแล้ว`, 
            data: result.updatedRequest,
            unreadCount: result.unreadCount 
        });

    } catch (error) {
        console.error("🔥 Update Leave Status Error:", error);
        // แยกข้อความ Error ให้ User เข้าใจง่าย
        const statusCode = error.message.includes("สถานะ") ? 400 : 500;
        res.status(statusCode).json({ error: error.message });
    }
};


// 4. ปรับปรุงโควตาวันลาของพนักงาน
exports.updateEmployeeQuota = async (req, res) => {
    try {
        const { employeeId } = req.params; 
        const { leaveTypeId, year, totalDays } = req.body;

        // 1. Validate & Convert Data Types (ป้องกัน NaN)
        const targetEmployeeId = parseInt(employeeId);
        const targetLeaveTypeId = parseInt(leaveTypeId);
        const targetYear = parseInt(year);
        const targetTotalDays = parseFloat(totalDays);

        if (isNaN(targetEmployeeId) || isNaN(targetLeaveTypeId) || isNaN(targetTotalDays)) {
            return res.status(400).json({ error: "ข้อมูลตัวเลขไม่ถูกต้อง" });
        }

        // 2. ตรวจสอบความมีอยู่จริงของ Employee และ LeaveType (Foreign Key Integrity)
        // เพื่อป้องกันการสร้างโควตาให้กับพนักงานหรือประเภทการลาที่ไม่มีอยู่จริง
        const [employeeExists, leaveTypeExists] = await Promise.all([
            prisma.employee.findUnique({ where: { id: targetEmployeeId } }),
            prisma.leaveType.findUnique({ where: { id: targetLeaveTypeId } })
        ]);

        if (!employeeExists) return res.status(404).json({ error: "ไม่พบพนักงานในระบบ" });
        if (!leaveTypeExists) return res.status(404).json({ error: "ไม่พบประเภทการลานี้ในระบบ" });

        // 3. ดำเนินการ Upsert
        const result = await prisma.leaveQuota.upsert({
            where: { 
                employeeId_leaveTypeId_year: { 
                    employeeId: targetEmployeeId, 
                    leaveTypeId: targetLeaveTypeId, 
                    year: targetYear 
                } 
            },
            update: { 
                totalDays: targetTotalDays 
            },
            create: { 
                employeeId: targetEmployeeId, 
                leaveTypeId: targetLeaveTypeId, 
                year: targetYear, 
                totalDays: targetTotalDays, 
                usedDays: 0,
                carryOverDays: 0 // กำหนดค่าเริ่มต้นเพื่อป้องกันปัญหาการคำนวณวันลาคงเหลือ
            }
        });

        // 4. บันทึกประวัติการแก้ไข (Optional - เพื่อความโปร่งใส)
        console.log(`[QUOTA_UPDATE] HR ID: ${req.user.id} updated quota for Emp ID: ${targetEmployeeId}`);

        res.json({ 
            success: true,
            message: `จัดการโควตา ${leaveTypeExists.typeName} ปี ${targetYear} สำเร็จ`, 
            data: result 
        });

    } catch (error) {
        console.error("🔥 updateEmployeeQuota Error:", error);
        res.status(500).json({ error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ในการจัดการโควตา" });
    }
};


// 5. ประมวลผลทบวันลาที่เหลือจากปีก่อนหน้า
exports.processCarryOver = async (req, res) => {
    try {
        const { targetYear } = req.body;
        if (!targetYear) return res.status(400).json({ error: "กรุณาระบุปีที่ต้องการดำเนินการ" });

        const yearInt = parseInt(targetYear);
        const lastYear = yearInt - 1;

        // 1. ดึงข้อมูลโควตาทั้งหมดของปีที่แล้วมาประมวลผล (ประหยัด Query)
        const oldQuotas = await prisma.leaveQuota.findMany({
            where: { year: lastYear },
            include: { leaveType: true }
        });

        if (oldQuotas.length === 0) {
            return res.status(404).json({ message: `ไม่พบข้อมูลโควตาของปี ${lastYear} เพื่อใช้ประมวลผล` });
        }

        // 2. ใช้ Transaction เพื่อความถูกต้องของข้อมูล
        await prisma.$transaction(async (tx) => {
            // ✅ ปรับปรุง: เตรียมข้อมูลสำหรับการทำ Bulk Update หรือจัดการทีละกลุ่ม
            // หากพนักงานมีจำนวนมหาศาล แนะนำให้แบ่ง Chunk แต่เบื้องต้นใช้ Promise.all ภายใน tx ได้
            
            const tasks = oldQuotas.map((quota) => {
                // คำนวณวันลาคงเหลือที่แท้จริง
                const base = Number(quota.totalDays) || 0;
                const carry = Number(quota.carryOverDays) || 0;
                const used = Number(quota.usedDays) || 0;
                const maxCarry = Number(quota.leaveType.maxCarryOver) || 0;

                const remaining = (base + carry) - used;
                
                // ยอดที่จะทบไป (ต้องไม่ติดลบ และไม่เกินที่นโยบายกำหนด)
                const carryAmount = Math.min(Math.max(remaining, 0), maxCarry);

                // ดำเนินการเฉพาะคนที่มีวันลาทบไป หรือมีโควตาปีที่แล้ว
                // ใช้ Upsert เพื่อให้มั่นใจว่าถ้ามี Record ปีเป้าหมายอยู่แล้ว จะไม่ไปทับ totalDays ของเขา
                return tx.leaveQuota.upsert({
                    where: { 
                        employeeId_leaveTypeId_year: { 
                            employeeId: quota.employeeId, 
                            leaveTypeId: quota.leaveTypeId, 
                            year: yearInt 
                        } 
                    },
                    update: { 
                        carryOverDays: carryAmount 
                    },
                    create: { 
                        employeeId: quota.employeeId, 
                        leaveTypeId: quota.leaveTypeId, 
                        year: yearInt, 
                        totalDays: 0, // วันลาใหม่ปกติจะถูกเพิ่มผ่านฟังก์ชัน Reset ประจำปีแยกต่างหาก
                        carryOverDays: carryAmount, 
                        usedDays: 0 
                    }
                });
            });

            await Promise.all(tasks);
        }, {
            timeout: 30000 // ✅ เพิ่ม Timeout เป็น 30 วินาที สำหรับกรณีพนักงานเยอะ
        });

        // 3. บันทึก Log การประมวลผล
        console.log(`[CARRY_OVER] Processed for year ${yearInt} by HR ID: ${req.user.id}`);

        res.json({ 
            success: true,
            message: `ประมวลผลทบวันลาจากปี ${lastYear} ไปยังปี ${yearInt} สำเร็จ (ทั้งหมด ${oldQuotas.length} รายการ)` 
        });

    } catch (error) {
        console.error("🔥 processCarryOver Error:", error);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการประมวลผลวันลาสะสม: " + error.message });
    }
};


// 6. มอบสิทธิ์วันลาพิเศษให้พนักงาน
exports.grantSpecialLeave = async (req, res) => {
    try {
        const { employeeId, leaveTypeId, amount, reason, year } = req.body;
        const hrId = req.user.id; // ดึง ID ของ HR ที่ทำรายการ

        // 1. Validation ข้อมูลเบื้องต้น
        const targetEmpId = parseInt(employeeId);
        const targetTypeId = parseInt(leaveTypeId);
        const targetAmount = parseFloat(amount);
        const targetYear = parseInt(year);

        if (isNaN(targetEmpId) || isNaN(targetTypeId) || targetAmount <= 0) {
            return res.status(400).json({ error: "ข้อมูลไม่ถูกต้องหรือจำนวนวันลาต้องมากกว่า 0" });
        }

        const result = await prisma.$transaction(async (tx) => {
            // 2. ตรวจสอบว่าพนักงานและประเภทการลาข้ามีอยู่จริง
            const employee = await tx.employee.findUnique({ where: { id: targetEmpId } });
            if (!employee) throw new Error("ไม่พบพนักงานในระบบ");

            // 3. บันทึกประวัติการมอบสิทธิ์ (Audit Log)
            const grant = await tx.specialLeaveGrant.create({
                data: {
                    employeeId: targetEmpId,
                    leaveTypeId: targetTypeId,
                    amount: targetAmount,
                    reason: reason || "HR Granted Special Leave",
                    grantedByHrId: hrId, // ✅ เพิ่ม: บันทึกว่า HR คนไหนเป็นคนมอบให้
                    expiryDate: new Date(`${targetYear}-12-31T23:59:59.999Z`)
                }
            });

            // 4. อัปเดตยอดโควตา (Upsert)
            const quota = await tx.leaveQuota.upsert({
                where: { 
                    employeeId_leaveTypeId_year: { 
                        employeeId: targetEmpId, 
                        leaveTypeId: targetTypeId, 
                        year: targetYear 
                    } 
                },
                update: { 
                    totalDays: { increment: targetAmount } 
                },
                create: { 
                    employeeId: targetEmpId, 
                    leaveTypeId: targetTypeId, 
                    year: targetYear, 
                    totalDays: targetAmount, 
                    usedDays: 0,
                    carryOverDays: 0
                }
            });

            // 5. สร้างการแจ้งเตือนพนักงาน (Notification)
            const notification = await tx.notification.create({
                data: {
                    employeeId: targetEmpId,
                    notificationType: "Info",
                    message: `คุณได้รับสิทธิ์วันลาเพิ่มเป็นกรณีพิเศษจำนวน ${targetAmount} วัน เนื่องจาก: ${reason || 'นโยบายบริษัท'}`,
                    isRead: false
                }
            });

            return { grant, quota, notification };
        });

        // 6. ยิง Socket.io เพื่อแจ้งเตือนทันที
        const io = req.app.get("io");
        if (io) {
            io.to(`user_${targetEmpId}`).emit("new_notification", {
                type: "Info",
                message: result.notification.message,
                createdAt: result.notification.createdAt
            });
        }

        res.json({ 
            success: true, 
            message: "มอบสิทธิ์วันลาพิเศษและแจ้งเตือนพนักงานเรียบร้อยแล้ว",
            data: result.grant 
        });

    } catch (error) {
        console.error("🔥 grantSpecialLeave Error:", error);
        res.status(error.message === "ไม่พบพนักงานในระบบ" ? 404 : 500).json({ 
            error: error.message || "เกิดข้อผิดพลาดในการมอบสิทธิ์วันลาพิเศษ" 
        });
    }
};