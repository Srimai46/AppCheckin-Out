import api from './axios';

// 1. ดึงรายการรออนุมัติ (สำหรับหน้า LeaveApproval ของ HR)
export const getPendingLeaves = async () => {
  const { data } = await api.get('/leaves/pending');
  return data;
};

// 2. อัปเดตสถานะ (Approve / Reject) 
// ปรับปรุง: รองรับการส่ง ID เป็น Array หรือ Single ID เพื่อให้ใช้กับระบบติ๊กเลือกได้
export const updateLeaveStatus = async (idOrIds, status) => {
  const { data } = await api.patch('/leaves/status', { 
    id: idOrIds, // สามารถรับเป็น [1, 2, 3] หรือ 1 ก็ได้
    status 
  });
  return data;
};

// 3. อนุมัติกรณีพิเศษ (เพิ่มวันลาใหม่ + อนุมัติใบลา)
// ใช้สำหรับปุ่ม "Bulk Special" ในหน้า LeaveApproval
export const grantSpecialLeave = async (payload) => {
  /**
   * payload: { 
   * employeeId, leaveTypeId, amount, reason, year, 
   * leaveRequestId // ✅ ส่ง ID ใบลาเพื่อให้ Backend อนุมัติทันที
   * }
   */
  const { data } = await api.post('/leaves/grant-special', payload);
  return data;
};

// 4. สร้างคำขอใบลาใหม่ (Multipart Form Data)
export const createLeaveRequest = async (formData) => {
  const { data } = await api.post('/leaves', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

// 5. ดึงโควตาวันลาคงเหลือ (รองรับการกรองตามปี)
export const getMyQuotas = async (year) => {
  const res = await api.get(`/leaves/my-quota?year=${year}`);
  return res.data;
};

// 6. ดึงประวัติการลาของตนเอง
export const getMyLeaves = async () => {
  const { data } = await api.get('/leaves/my-history');
  return data;
};

// 7. ระบบจัดการสิ้นปี (Year-End Processing)
export const processCarryOver = async (payload) => {
  const { data } = await api.post('/leaves/process-carry-over', payload);
  return data;
};

// 8. ดึงประวัติและสถานะการปิดงวดปี (System Configuration)
export const getSystemConfigs = async () => {
  const { data } = await api.get('/leaves/system-configs');
  return data;
};

// 9. ปลดล็อคปี (Reopen Year)
export const reopenYear = async (year) => {
  const { data } = await api.post('/leaves/reopen-year', { year });
  return data;
};

// 10. ดึงรายการลาทั้งหมด (Admin Overview)
export const getAllLeaves = async () => {
  const { data } = await api.get('/leaves');
  return data;
};