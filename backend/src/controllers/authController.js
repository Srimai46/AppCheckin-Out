const bcrypt = require('bcryptjs');
const { z } = require('zod');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma'); // ตรวจสอบ path ให้ถูก
const { auditLog } = require('../utils/logger'); 

// 1. Schema Validation (เหมือนเดิม)
const loginSchema = z.object({
  email: z.string().email({ message: "Email format is invalid." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

// 2. ฟังก์ชัน Login
exports.login = async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // ✅ UPDATE 1: ต้อง include role เพื่อเอาชื่อ Role (name)
    const user = await prisma.employee.findUnique({
      where: { email },
      include: {
        role: true, // ดึงตาราง Role มาด้วย
        department: true // ดึงตาราง Department มาด้วย (เผื่อใช้)
      }
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'This account has been suspended.' });
    }

    const roleName = user.role?.name || "Unknown"; 
    const deptName = user.department?.name || "Unassigned";

    const payload = {
      id: user.id,
      email: user.email,
      role: roleName, // Middleware จะได้อ่านค่า 'HR', 'WORKER' ได้เหมือนเดิม
      department: deptName 
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    const logDetails = `User logged in successfully (${user.firstName})`;

    // 4. Audit Log (เหมือนเดิม)
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

    // 5. Socket.io (เหมือนเดิม)
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

    res.json({
      message: "Login Successful",
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: roleName, // ส่ง String "HR" กลับไป
        department: deptName, // ส่ง String "IT" กลับไป
        profileImageUrl: user.profileImageUrl,
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors?.[0]?.message || "Input validation failed";
      return res.status(400).json({ error: message });
    }
    console.error("Login System Error:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// 3. ฟังก์ชัน Get Me
exports.getMe = async (req, res) => {
  try {
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
        role: { select: { name: true } }, 
        department: { select: { name: true } },
        profileImageUrl: true,
        joiningDate: true,
        isActive: true
      }
    });

    if (!user) {
       return res.status(404).json({ error: 'User not found' });
    }

    const formattedUser = {
        ...user,
        role: user.role?.name || "Unknown",
        department: user.department?.name || "Unassigned"
    };

    res.json(formattedUser);
  } catch (error) {
    console.error("GetMe Error:", error);
    res.status(500).json({ error: "Server Error" });
  }
};

// 4. ฟังก์ชันดึงพนักงานทั้งหมด (ถ้าจำเป็นต้องมีในไฟล์นี้)
exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: { select: { name: true } },
        department: { select: { name: true } },
        profileImageUrl: true,
        joiningDate: true,
        isActive: true
      },
      orderBy: { id: 'asc' }
    });

    const formattedEmployees = employees.map(emp => ({
        ...emp,
        role: emp.role?.name,
        department: emp.department?.name
    }));

    res.json(formattedEmployees);
  } catch (error) {
    console.error("Get All Employees Error:", error);
    res.status(500).json({ error: 'Failed to retrieve employee data.' });
  }
};