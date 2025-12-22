const bcrypt = require('bcryptjs');
const { z } = require('zod');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

// ✅ แก้ไข: เพิ่มฟังก์ชัน Helper สำหรับสร้าง Token เพื่อความ Clean
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '1d', // หรือปรับตามนโยบายความปลอดภัย
  });
};

// 1. กำหนด Schema สำหรับตรวจสอบข้อมูลขาเข้าด้วย Zod
const loginSchema = z.object({
  email: z.string().trim().email({ message: "รูปแบบอีเมลไม่ถูกต้อง" }), // ✅ เพิ่ม .trim()
  password: z.string().min(1, { message: "กรุณากรอกรหัสผ่าน" }), // ✅ Login ไม่ควรเช็คความยาวละเอียดเกินไปเพื่อกันการเดา (Enumeration)
});

// 2. ฟังก์ชัน Login
exports.login = async (req, res) => {
  try {
    // ✅ 1. Validate Input
    const validatedData = loginSchema.parse(req.body);

    // ✅ 2. หา User และดึงเฉพาะข้อมูลที่จำเป็น
    const user = await prisma.employee.findUnique({
      where: { email: validatedData.email },
    });

    // ✅ แก้ไข (Security): ใช้ข้อความ Error เดียวกันทั้ง Email ผิด และ Password ผิด
    // เพื่อป้องกัน "Account Enumeration" (การแอบสุ่มหาอีเมลที่มีอยู่จริงในระบบ)
    const loginError = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';

    if (!user) {
      return res.status(401).json({ error: loginError });
    }

    // ✅ 3. เช็ค Password
    const isMatch = await bcrypt.compare(validatedData.password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: loginError });
    }

    // ✅ 4. เช็ค Status บัญชี
    if (!user.isActive) {
      return res.status(403).json({ error: 'บัญชีนี้ถูกระงับการใช้งาน โปรดติดต่อฝ่ายบุคคล' });
    }

    // ✅ 5. สร้าง Token
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const token = generateToken(payload);

    // ✅ 6. ส่งข้อมูลกลับ (ตัด passwordHash ออกอย่างเด็ดขาด)
    res.json({
      message: "เข้าสู่ระบบสำเร็จ",
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
    // ✅ 7. Error Handling แบ่งตามประเภท
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0]?.message });
    }
    
    console.error("🔥 Login Error:", error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
};

// 3. ฟังก์ชัน Get Me (ตรวจสอบข้อมูลตัวเอง)
exports.getMe = async (req, res) => {
  try {
    // ✅ แก้ไข: ดึงข้อมูลสดจาก DB เสมอแทนการเชื่อข้อมูลใน Token เพียงอย่างเดียว
    // เผื่อ User ถูกเปลี่ยน Role หรือถูก Deactivate ระหว่างที่ Token ยังไม่หมดอายุ
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

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'บัญชีไม่พร้อมใช้งาน' });
    }

    res.json(user);
  } catch (error) {
    console.error("GetMe Error:", error);
    res.status(500).json({ error: "Server Error" });
  }
};

// 4. ฟังก์ชันดึงพนักงานทั้งหมด (จำกัดสิทธิ์ใน Route)
exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      where: { isActive: true }, // ✅ แสดงเฉพาะคนที่ยังทำงานอยู่เป็น Default
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        profileImageUrl: true,
        joiningDate: true,
      },
      orderBy: { firstName: 'asc' }
    });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: 'ดึงข้อมูลพนักงานไม่สำเร็จ' });
  }
};