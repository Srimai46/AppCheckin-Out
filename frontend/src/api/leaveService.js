// src/api/leaveService.js
import api from './axios';

// 1. ดึงรายการรออนุมัติ (สำหรับหน้า LeaveApproval ของ HR)
export const getPendingLeaves = async () => {
  const { data } = await api.get('/leaves/pending');
  return data;
};

// 2. อัปเดตสถานะ (Approve / Reject)
export const updateLeaveStatus = async (id, status, isSpecial = false) => {
  // ✅ เพิ่ม isSpecial เพื่อให้รองรับ Logic "อนุมัติกรณีพิเศษ (ไม่หักวันลา)" ที่เราเขียนไว้ใน Backend
  const { data } = await api.patch('/leaves/status', { id, status, isSpecial });
  return data;
};

// 3. สร้างคำขอใบลาใหม่ (สำหรับหน้า LeaveRequest)
export const createLeaveRequest = async (formData) => {
  // ✅ สำคัญมาก: เมื่อส่งไฟล์ (FormData) 
  // Axios จะจัดการ Boundary ของ Multipart ให้อัตโนมัติ 
  // แต่ต้องมั่นใจว่าสิ่งที่ส่งเข้ามาในฟังก์ชันนี้คือ new FormData() จากหน้า LeaveRequest.jsx
  const { data } = await api.post('/leaves', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

// 4. ดึงโควตาวันลาคงเหลือของพนักงานเอง
export const getMyQuotas = async (year) => {
  const res = await api.get(`/leaves/my-quota?year=${year}`);
  return res.data; // ต้อง return ข้อมูลข้างใน
};

// 5. ดึงประวัติการลาของตัวเอง
export const getMyLeaves = async () => {
  const { data } = await api.get('/leaves/my-history');
  return data;
};

// 6. ดึงรายการลาทั้งหมด (สำหรับ Admin/HR ดูภาพรวม)
export const getAllLeaves = async () => {
  const { data } = await api.get('/leaves');
  return data;
};

// ประมวลผลทบวันลา Annual ไปปีถัดไป (เพิ่มตัวนี้เข้าไปครับ)
export const processCarryOver = async (payload) => {
  // payload หน้าตาจะเป็น { targetYear: 2026, quotas: { ANNUAL: 6, ... } }
  const { data } = await api.post('/leaves/process-carry-over', payload);
  return data;
};

// ดึงประวัติการปิดงวด
export const getSystemConfigs = async () => {
  const { data } = await api.get('/leaves/system-configs');
  return data;
};

// ยกเลิกการปิดงวด
export const reopenYear = async (year) => {
  const { data } = await api.post('/leaves/reopen-year', { year });
  return data;
};

