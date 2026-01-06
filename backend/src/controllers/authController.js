const bcrypt = require('bcryptjs');
const { z } = require('zod');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { auditLog } = require('../utils/logger'); 

// 1. กำหนด Schema สำหรับตรวจสอบข้อมูลขาเข้าด้วย Zod
const loginSchema = z.object({
  email: z.string().email({ message: "Email format is invalid." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

// 2. ฟังก์ชัน Login
exports.login = async (req, res) => {
  try {
    // 1. Validate Input (Zod)
    // ถ้าข้อมูลไม่ตรงตาม Schema บรรทัดนี้จะ throw Error ไปที่ catch ทันที
    const { email, password } = loginSchema.parse(req.body);

    // 2. หา User จาก Database
    const user = await prisma.employee.findUnique({
      where: { email },
    });

    // ตรวจสอบว่ามี User ไหม และ Password ตรงกันไหม
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // ตรวจสอบสถานะ User (Active ไหม)
    if (!user.isActive) {
      return res.status(403).json({ error: 'This account has been suspended.' });
    }


    // 3. สร้าง Token
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    const logDetails = `User logged in successfully (${user.firstName})`;

    // 4. บันทึกประวัติการ Login (Audit Log ลง Database)
    // ใส่ try-catch ย่อย เพื่อไม่ให้ Login ล้มเหลวถ้าแค่บันทึก Log ไม่ได้
    try {
        await auditLog(prisma, {
          action: "LOGIN",
          modelName: "Employee",
          recordId: user.id,
          userId: user.id,
          details: logDetails,
          req: req
        });
    } catch (logError) {
        console.error("Audit Log Error:", logError);
    }

    // 5. ส่วน Real-time (Socket.io)
    const io = req.app.get("io");
    if (io) {
        io.emit("new-audit-log", {
            id: Date.now(),
            action: "LOGIN", 
            modelName: "Auth",
            recordId: user.id,
            performedBy: {
                firstName: user.firstName,
                lastName: user.lastName
            },
            details: logDetails,
            createdAt: new Date()
        });
    }

    // 6. ส่งข้อมูลกลับ
    res.json({
      message: "Login Successful",
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        profileImageUrl: user.profileImageUrl,
      }
    });

  } catch (error) {
    // ✅ จุดที่แก้ไข: จัดการ Error ให้ปลอดภัย ไม่ให้ Server Crash
    
    // กรณีเป็น Error จาก Zod (Validation Failed)
    if (error instanceof z.ZodError) {
      // ใช้ ?. เพื่อความปลอดภัย (เผื่อ array ว่าง)
      const message = error.errors?.[0]?.message || "Input validation failed";
      return res.status(400).json({ error: message });
    }

    // กรณีเป็น Error อื่นๆ (Database, Code logic)
    console.error("Login System Error:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// 3. ฟังก์ชัน Get Me
exports.getMe = async (req, res) => {
  try {
    // ต้องแน่ใจว่ามี Middleware authenticateUser ทำงานก่อนหน้านี้ เพื่อใส่ req.user เข้ามา
    if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.employee.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        profileImageUrl: true,
        joiningDate: true,
        isActive: true
      }
    });

    if (!user) {
       return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error("GetMe Error:", error);
    res.status(500).json({ error: "Server Error" });
  }
};

// 4. ฟังก์ชันดึงพนักงานทั้งหมด
exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        profileImageUrl: true,
        joiningDate: true,
        isActive: true
      },
      orderBy: { id: 'asc' }
    });
    res.json(employees);
  } catch (error) {
    console.error("Get All Employees Error:", error);
    res.status(500).json({ error: 'Failed to retrieve employee data.' });
  }
};