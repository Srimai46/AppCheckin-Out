//frontend/src/api/leaveService.js
import api from "./axios"; // ❗ ต้องเป็น default import


// 1. ดึงรายการรออนุมัติ (สำหรับหน้า LeaveApproval ของ HR) [controller: leaveApprovalController]
export const getPendingLeaves = async () => {
  const { data } = await api.get('/leaves/pending');
  return data;
};

// 2. อัปเดตสถานะ (Approve / Reject) ของใบลา [controller: leaveApprovalController]
export const updateLeaveStatus = async (idOrIds, status, rejectionReason = null) => {
  const payload = {
    id: idOrIds,
    status,
  };

  if (status === "Rejected") {
    payload.rejectionReason = rejectionReason;
  }

  const { data } = await api.patch("/leaves/status", payload);
  return data;
};

// 3. อนุมัติกรณีพิเศษ (เพิ่มวันลาใหม่ + อนุมัติใบลา) [controller: leaveApprovalController]
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

// 4. สร้างคำขอใบลาใหม่ (Multipart Form Data) [controller: leaveController]
export const createLeaveRequest = async (formData) => {
  const { data } = await api.post('/leaves', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

// 5. ดึงโควตาวันลาคงเหลือ (รองรับการกรองตามปี) [controller: leaveController]
export const getMyQuotas = async (year) => {
  const res = await api.get(`/leaves/my-quota?year=${year}`);
  return res.data;
};

// 6. ดึงประวัติการลาของตนเอง [controller: leaveController]
export const getMyLeaves = async () => {
  const { data } = await api.get('/leaves/my-history');
  return data;
};

// 7. ระบบจัดการสิ้นปี (Year-End Processing) [controller: leaveController]
export const processCarryOver = async (payload) => {
  const { data } = await api.post('/leaves/process-carry-over', payload);
  return data;
};

// 8. ดึงประวัติและสถานะการปิดงวดปี (System Configuration) [controller: leaveController]
export const getSystemConfigs = async () => {
  const { data } = await api.get('/leaves/system-configs');
  return data;
};

// 9. ปลดล็อคปี (Reopen Year) [controller: leaveController]
export const reopenYear = (data) =>
  api.post("/leaves/reopen-year", data);


// 10. ดึงรายการลาทั้งหมด (Admin Overview) [controller: leaveController]
export const getAllLeaves = async () => {
  const { data } = await api.get('/leaves');
  return data;
};

// 11. จัดการประเภทวันลา (Leave Type Management)

// 11.1 ดึงประเภทวันลาทั้งหมด (ใช้ในหน้า Setting และ Dropdown ตอนลา) [controller: leaveTypeController]
export const getLeaveTypes = async () => {
  const { data } = await api.get('/leaves/types');
  return data;
};

// 11.2 สร้างประเภทวันลาใหม่ (HR) [controller: leaveTypeController]
export const createLeaveType = async (payload) => {
  const { data } = await api.post('/leaves/types', payload);
  return data;
};

// 11.3 แก้ไขประเภทวันลา (HR - แก้ไข Max Consecutive / Carry Over) [controller: leaveTypeController]
export const updateLeaveType = async (id, payload) => {
  const { data } = await api.put(`/leaves/types/${id}`, payload);
  return data;
};

// 11.4 ลบประเภทวันลา (HR) [controller: leaveTypeController]
export const deleteLeaveType = async (id) => {
  const { data } = await api.delete(`/leaves/types/${id}`);
  return data;
};

// 12. การจัดการใบลาเพิ่มเติม

// 12.1 ยกเลิกใบลา (Cancel / Withdraw) [controller: leaveController]
export const cancelLeaveRequest = async (id, reason) => {
  const { data } = await api.post(`/leaves/cancel/${id}`, { cancelReason: reason });
  return data;
};

// 13. ตั้งค่าระบบ (System Configuration)

// 13.1 อัปเดตการตั้งค่าระบบ (เช่น แก้ไข Global Max Consecutive Days) [controller: leaveController]
export const updateSystemConfig = (year, maxConsecutiveDays) => {
  return api.put("/leaves/system-configs", {
    year,
    maxConsecutiveDays,
  });
};


