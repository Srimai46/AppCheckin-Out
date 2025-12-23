const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs'); // สำหรับจัดการไฟล์/โฟลเดอร์

// Import Routes
const authRoutes = require('./routes/authRoutes');
const timeRecordRoutes = require('./routes/timeRecordRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const employeeRoutes = require('./routes/employeeRoute');
const { startCarryOverJob } = require("./jobs/carryOverJob");

const app = express();

// ==========================================
// 1. สร้างโฟลเดอร์เก็บไฟล์อัตโนมัติ (ป้องกัน ENOENT Error)
// ==========================================
const uploadPath = path.join(__dirname, '../uploads/attachments');
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
    console.log('📁 System: Created directory uploads/attachments');
}

// ==========================================
// 2. Middlewares
// ==========================================
app.use(cors({
    origin: "*", // ใน Production แนะนำให้ระบุ IP เฉพาะ
    credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// 3. Static Files (เพื่อให้กด Link ดู PDF/รูปภาพได้)
// ==========================================
// เมื่อเข้า URL: http://IP:8080/uploads/... จะดึงไฟล์จากโฟลเดอร์ uploads นอก backend
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ==========================================
// 4. Routes Setup
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/attendance', timeRecordRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/employees', employeeRoutes);

startCarryOverJob();

// Health Check
app.get('/', (req, res) => {
    res.send('🚀 JapanSys Check-in System API is running...');
});

// ==========================================
// 5. Global Error Handler (ดักจับ Multer และ Error อื่นๆ)
// ==========================================
app.use((err, req, res, next) => {
    // แสดง Error เต็มๆ ใน Terminal ของ Backend
    console.error('❌ Server Error:', err.stack);

    // กรณีไฟล์ใหญ่เกินที่ Multer กำหนด (5MB)
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'ไฟล์มีขนาดใหญ่เกินไป (จำกัด 5MB)' });
    }

    // กรณีโฟลเดอร์หายหรือไฟล์เข้าถึงไม่ได้
    if (err.code === 'ENOENT') {
        return res.status(500).json({ error: 'ไม่สามารถบันทึกไฟล์ได้ (โฟลเดอร์ปลายทางไม่มีอยู่จริง)' });
    }

    res.status(500).json({ 
        error: 'เกิดข้อผิดพลาดภายในระบบ!', 
        message: err.message 
    });
});

module.exports = app;