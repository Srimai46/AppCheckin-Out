// src/api/leaveService.js
import api from './axios';

// 1. ดึงรายการรออนุมัติ (สำหรับหน้า LeaveApproval ของ HR)
export const getPendingLeaves = async () => {
  const { data } = await api.get('/leaves/pending');
  return data;
};

// 2. อัปเดตสถานะ (Approve / Reject)
export const updateLeaveStatus = async (id, status) => {
  // ส่งค่า id และ status ไปในรูปแบบ JSON Body ตามที่ Controller รอรับ
  const { data } = await api.put('/leaves/update-status', { id, status });
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