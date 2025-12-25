const bcrypt = require('bcryptjs');
const { z } = require('zod');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

// 1. กำหนด Schema สำหรับตรวจสอบข้อมูลขาเข้าด้วย Zod
const loginSchema = z.object({
  email: z.string().email({ message: "Email is not correct." }),
  password: z.string().min(6, { message: "Password required 6 characters." }),
});

// 2. ฟังก์ชัน Login
exports.login = async (req, res) => {
  try {
    // Validate Input
    const { email, password } = loginSchema.parse(req.body);

    // หา User จาก Email
    const user = await prisma.employee.findUnique({
      where: { email },
    });

    // ถ้าไม่มี User หรือ Password ไม่ตรงกัน
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Email or password are not correct.' });
    }

    // ถ้า User ลาออกไปแล้ว (is_active = false) ห้ามล็อกอิน
    if (!user.isActive) {
      return res.status(403).json({ error: 'This account has been suspended.' });
    }

    // สร้าง Token
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    // Login สำเร็จ -> ส่งข้อมูลกลับพร้อม Token
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
    // ✅ จุดที่แก้ไข: เช็คประเภท Error ก่อน เพื่อกัน Server Crash
    
    // 1. ถ้าเป็น Error จากการ Validate ข้อมูล (Zod)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0]?.message || "The information is not correct" });
    }
    
    // 2. ถ้าเป็น Error อื่นๆ ให้แสดง message ธรรมดา
    console.error("Login Error:", error);
    res.status(500).json({ error: error.message || 'There is something wrong with the server' });
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
        role: true,
        profileImageUrl: true,
        joiningDate: true,
        isActive: true
      }
    });

    if (!user) {
       return res.status(404).json({ error: 'There is no user' });
    }

    res.json(user);
  } catch (error) {
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
    console.error(error);
    res.status(500).json({ error: 'Employee data retrieval failed.' });
  }
};