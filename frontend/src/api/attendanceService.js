// frontend/src/api/attendanceService.js
import api from "./axios";

// Check In
export const checkIn = async () => {
  const { data } = await api.post("/attendance/check-in");
  return data;
};

// Check Out
export const checkOut = async () => {
  const { data } = await api.post("/attendance/check-out");
  return data;
};

// Get my attendance history
export const getMyHistory = async () => {
  const { data } = await api.get("/attendance/history");
  return data;
};

// Get specific user's attendance history (for HR)
export const getUserHistory = async (userId) => {
  const { data } = await api.get(`/attendance/history/user/${userId}`);
  return data;
};

// Get today's team attendance
export const getTodayTeamAttendance = async () => {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await api.get(`/attendance/team/today?date=${today}`);
  return data;
};

// HR Check-In Employee
export const hrCheckInEmployee = async (employeeId) => {
  const { data } = await api.post(`/attendance/team/${employeeId}/check-in`);
  return data;
};

// HR Check-Out Employee
export const hrCheckOutEmployee = async (employeeId) => {
  const { data } = await api.post(`/attendance/team/${employeeId}/check-out`);
  return data;
};

// ✅ แก้ไข: เปลี่ยน path เป็น /dashboard/stats ให้ตรงกับ Backend ใหม่
export const getAttendanceStats = async ({ year, month, employeeId }) => {
  const params = {};
  if (year) params.year = year;
  if (month && month !== 'All') params.month = month;
  if (employeeId) params.employeeId = employeeId;
  
  const { data } = await api.get("/dashboard/stats", { params });
  return data;
};