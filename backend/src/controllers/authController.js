const bcrypt = require('bcrypt')
const { z } = require('zod')
const prisma = require('../config/prisma')
const generateToken = require('../utils/generateToken')

// 1. กำหนด Schema สำหรับตรวจสอบข้อมูลขาเข้าด้วย Zod
const loginSchema = z.object({
  email: z.string().email({ message: "รูปแบบอีเมลไม่ถูกต้อง" }),
  password: z.string().min(6, { message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" }),
})

// 2. ฟังก์ชัน Login
exports.login = async (req, res) => {
  try {
    // Validate Input
    const { email, password } = loginSchema.parse(req.body)

    // หา User จาก Email
    const user = await prisma.employee.findUnique({
      where: { email },
    })

    // ถ้าไม่มี User หรือ Password ไม่ตรงกัน
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' })
    }

    // ถ้า User ลาออกไปแล้ว (is_active = false) ห้ามล็อกอิน
    if (!user.isActive) {
      return res.status(403).json({ error: 'บัญชีนี้ถูกระงับการใช้งาน' })
    }

    // Login สำเร็จ -> ส่งข้อมูลกลับพร้อม Token
    res.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      profileImageUrl: user.profileImageUrl,
      token: generateToken(user.id),
    })

  } catch (error) {
    // ถ้า Zod validate ไม่ผ่าน
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message })
    }
    
    console.error(error)
    res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' })
  }
}

// 3. ฟังก์ชัน Get Me (สำหรับเช็คว่า Token นี้คือใคร)
exports.getMe = async (req, res) => {
  // req.user มาจาก middleware 'protect' ที่เราเขียนไว้ก่อนหน้านี้
  if (req.user) {
    res.json(req.user)
  } else {
    res.status(404).json({ error: 'ไม่พบข้อมูลผู้ใช้' })
  }
}