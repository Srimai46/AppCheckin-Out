// src/api/leaveService.js
import api from './axios';

// 1. ดึงรายการรออนุมัติ (สำหรับหน้า LeaveApproval ของ HR)
export const getPendingLeaves = async () => {
  const { data } = await api.get('/leaves/pending');
  return data;
};

// 2. อัปเดตสถานะ (Approve / Reject)
export const updateLeaveStatus = async (id, status) => {
  // ✅ แก้ไข 1: เปลี่ยนจาก .put เป็น .patch
  // ✅ แก้ไข 2: เปลี่ยน path จาก /update-status เป็น /status ให้ตรงกับ Routes
  const { data } = await api.patch('/leaves/status', { id, status });
  return data;
};

// 3. สร้างคำขอใบลาใหม่ (สำหรับหน้า LeaveRequest)
export const createLeaveRequest = async (leaveData) => {
  const { data } = await api.post('/leaves', leaveData);
  return data;
};

// 4. ดึงโควตาวันลาคงเหลือของพนักงานเอง
export const getMyQuotas = async () => {
  const { data } = await api.get('/leaves/my-quota');
  return data;
};

// 5. ดึงประวัติการลาของตัวเอง (ใช้แสดงใน Dashboard หรือหน้าประวัติ)
export const getMyLeaves = async () => {
  const { data } = await api.get('/leaves/my-history');
  return data;
};

// 6. ดึงรายการลาทั้งหมด (สำหรับหน้าปฏิทินทีม - getAllLeaves)
export const getAllLeaves = async () => {
  const { data } = await api.get('/leaves');
  return data;
};