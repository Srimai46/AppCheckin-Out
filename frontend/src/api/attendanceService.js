// frontend/src/api/attendanceService.js

import api from "./axios";

// Check In [controller: timeRecordController]
export const checkIn = async () => {
  const { data } = await api.post("/attendance/check-in");
  return data;
};

// Check Out [controller: timeRecordController]
export const checkOut = async () => {
  const { data } = await api.post("/attendance/check-out");
  return data;
};

// Get my attendance history [controller: timeRecordController]
export const getMyHistory = async () => {
  const { data } = await api.get("/attendance/history");
  return data;
};

// Get specific user's attendance history (for HR) [controller: timeRecordController]
export const getUserHistory = async (userId) => {
  const { data } = await api.get(`/attendance/history/user/${userId}`);
  return data;
};

// Get today's team attendance (for HR)  [controller: timeRecordController]
export const getTodayTeamAttendance = async () => {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await api.get(`/attendance/team/today?date=${today}`);
  return data;
};

// HR Check-In Employee [controller: timeRecordController]
export const hrCheckInEmployee = async (employeeId) => {
  const { data } = await api.post(`/attendance/team/${employeeId}/check-in`);
  return data;
};

// HR Check-Out Employee [controller: timeRecordController]
export const hrCheckOutEmployee = async (employeeId) => {
  const { data } = await api.post(`/attendance/team/${employeeId}/check-out`);
  return data;
};

// Get attendance statistics [controller: attendanceStatsController]
export const getAttendanceStats = async ({ year, month, employeeId }) => {
  // กรองค่าที่เป็น null/undefined ออกก่อนส่ง
  const params = {};
  if (year) params.year = year;
  if (month && month !== 'All') params.month = month;
  if (employeeId) params.employeeId = employeeId;
  const { data } = await api.get("/attendance/stats", { params });
  return data;
};
