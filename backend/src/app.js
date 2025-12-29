const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const app = express();

// ==========================================
// 1. สร้างโฟลเดอร์เก็บไฟล์
// ==========================================
const leavesPath = path.join(__dirname, '../uploads/leaves');
if (!fs.existsSync(leavesPath)) {
    fs.mkdirSync(leavesPath, { recursive: true });
    console.log('📁 System: Created directory uploads/leaves');
}

// ==========================================
// 2. Middlewares
// ==========================================
app.use(cors({
    origin: "*", 
    credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// 3. Static Files 
// ==========================================
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ==========================================
// 4. Routes Setup
// ==========================================
const authRoutes = require('./routes/authRoutes');
const timeRecordRoutes = require('./routes/timeRecordRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const employeeRoutes = require('./routes/employeeRoute');
const auditRoutes = require('./routes/auditRoutes'); 

app.use('/api/auth', authRoutes);
app.use('/api/attendance', timeRecordRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/audit', auditRoutes); 

// Cron Jobs
const { startCarryOverJob } = require("./jobs/carryOverJob");
startCarryOverJob();

// Health Check
app.get('/', (req, res) => {
    res.send('🚀 JapanSys Check-in System API is running...');
});

// ==========================================
// 5. Global Error Handler
// ==========================================
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err.stack);

    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'The file is too large (limited to 5MB).' });
    }

    // แก้ไขจุดที่อาจจะ Error ถ้าไม่ได้ลง multer ในโปรเจกต์
    try {
        const multer = require('multer');
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: `Upload Error: ${err.message}` });
        }
    } catch (e) {
        // Multer not installed, ignore check
    }

    res.status(500).json({ 
        error: 'An error occurred within the system.!', 
        message: err.message 
    });
});

module.exports = app;