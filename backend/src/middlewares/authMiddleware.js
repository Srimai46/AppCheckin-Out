//backend/src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken')
const prisma = require('../config/prisma')

const protect = async (req, res, next) => {
  let token

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // ดึง Token ออกมาจาก "Bearer <token>"
      token = req.headers.authorization.split(' ')[1]

      // ตรวจสอบ Token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      // ดึงข้อมูล User จาก DB (ไม่เอา password)
      req.user = await prisma.employee.findUnique({
        where: { id: decoded.id },
        select: {
            id: true,
            email: true,
            role: true,
            firstName: true,
            lastName: true
        }
      })

      if (!req.user) {
        return res.status(401).json({ error: 'User not found' })
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

// Middleware สำหรับเช็ค Role (เช่น เฉพาะ HR เท่านั้น)
const authorize = (...roles) => {
    return (req, res, next) => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ 
            error: `User role ${req.user.role} is not authorized to access this route` 
        })
      }
      next()
    }
}

module.exports = { protect, authorize }