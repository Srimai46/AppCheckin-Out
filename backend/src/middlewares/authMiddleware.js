// backend/src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken')
const prisma = require('../config/prisma')

const protect = async (req, res, next) => {
  let token

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // ดึง Token
      token = req.headers.authorization.split(' ')[1]

      // ตรวจสอบ Token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      // ✅ UPDATE: ดึงข้อมูล User พร้อมชื่อ Role (Schema ใหม่)
      const user = await prisma.employee.findUnique({
        where: { id: decoded.id },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true, // ควรเช็ค isActive ด้วย
            // ดึงเฉพาะชื่อ Role ออกมา
            role: { 
                select: { name: true } 
            }
        }
      })

      if (!user) {
        return res.status(401).json({ error: 'User not found' })
      }

      // เช็คเพิ่มเติม: ถ้า User ถูก Deactivate ไปแล้ว ห้ามเข้า
      if (!user.isActive) {
        return res.status(403).json({ error: 'User account is deactivated' })
      }

      // ✅ UPDATE: แปลงโครงสร้างให้ req.user.role กลับมาเป็น String เหมือนเดิม
      // เพื่อให้ function authorize ทำงานต่อได้เลยโดยไม่ต้องแก้ logic
      req.user = {
          ...user,
          role: user.role?.name || "UNKNOWN" // แปลง { name: "HR" } -> "HR"
      }

      next()
    } catch (error) {
      console.error(error)
      res.status(401).json({ error: 'Not authorized, token failed' })
    }
  }

  if (!token) {
    res.status(401).json({ error: 'Not authorized, no token' })
  }
}

// Middleware สำหรับเช็ค Role
const authorize = (...roles) => {
    return (req, res, next) => {
      // req.user.role ตอนนี้เป็น String แล้ว (จากการแปลงข้างบน)
      // จึงใช้ .includes() ได้ตามปกติ
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ 
            error: `User role '${req.user?.role}' is not authorized to access this route` 
        })
      }
      next()
    }
}

module.exports = { protect, authorize }