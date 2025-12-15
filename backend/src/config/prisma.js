const { PrismaClient } = require('@prisma/client')

// ป้องกันการสร้าง instance ใหม่ซ้ำๆ เวลา HMR (Hot Module Replacement) ในโหมด Dev
const globalForPrisma = global

const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

module.exports = prisma