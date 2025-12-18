const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearData() {
  try {
    console.log('🧹 Clearing all tables...');

    // ต้องลบจากตารางลูกไปหาตารางแม่ เพื่อเลี่ยง Foreign Key Error
    await prisma.notification.deleteMany();
    await prisma.leaveRequest.deleteMany();
    await prisma.timeRecord.deleteMany();
    await prisma.leaveQuota.deleteMany();
    await prisma.leaveType.deleteMany();
    await prisma.employee.deleteMany();

    console.log('✅ All tables cleared successfully.');
  } catch (error) {
    console.error('❌ Error clearing tables:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearData();
