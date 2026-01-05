import axios from "axios";

// 1. กำหนด Base URL (ใช้ logic เดียวกับ auditService)
const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");

// Helper สำหรับดึง Token และสร้าง Header
const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

// ---------------------------
// Holiday CRUD
// ---------------------------

// 1. ดึงข้อมูลวันหยุด (Get)
export const fetchHolidays = async (year) => {
  // params: { year: 2025 } (ถ้าไม่ส่งจะเอาปีปัจจุบัน)
  const response = await axios.get(`${API_BASE}/api/holidays`, {
    params: { year },
    headers: getHeaders(),
  });
  return response.data; // Return Array ของวันหยุด
};

// 2. สร้างวันหยุดใหม่ (Create)
export const createHoliday = async (holidayData) => {
  // holidayData: { date: "2025-01-01", name: "New Year", isSubsidy: true }
  // หรือส่งเป็น Array ก็ได้: [{...}, {...}]
  const response = await axios.post(`${API_BASE}/api/holidays`, holidayData, {
    headers: getHeaders(),
  });
  return response.data;
};

// 3. แก้ไขวันหยุด (Update)
export const updateHoliday = async (id, holidayData) => {
  // id: ไอดีของวันหยุดที่จะแก้
  // holidayData: { name: "New Name", isSubsidy: false }
  const response = await axios.put(`${API_BASE}/api/holidays/${id}`, holidayData, {
    headers: getHeaders(),
  });
  return response.data;
};

// 4. ลบวันหยุด (Delete)
export const deleteHoliday = async (id) => {
  const response = await axios.delete(`${API_BASE}/api/holidays/${id}`, {
    headers: getHeaders(),
  });
  return response.data;
};

// ---------------------------
// ✅ Working Days Policy (NEW)
// ---------------------------

// 5) ดึง Working Days
export const fetchWorkingDaysPolicy = async () => {
  const response = await axios.get(`${API_BASE}/api/holidays/working-days`, {
    headers: getHeaders(),
  });
  // expected: { key: "WORKING_DAYS", workingDays: ["MON","TUE"...], updatedAt, updatedBy }
  return response.data;
};

// 6) บันทึก Working Days (HR)
export const saveWorkingDaysPolicy = async (workingDays) => {
  // workingDays: ["MON","TUE","WED"...]
  const response = await axios.put(
    `${API_BASE}/api/holidays/working-days`,
    { workingDays },
    { headers: getHeaders() }
  );
  return response.data;
};

// 7) ดึง Max Consecutive
export const fetchMaxConsecutivePolicy = async () => {
  const response = await axios.get(`${API_BASE}/api/holidays/max-consecutive`, {
    headers: getHeaders(),
  });
  // expected: { key: "MAX_CONSECUTIVE_HOLIDAYS", maxConsecutiveHolidayDays, updatedAt, updatedBy }
  return response.data;
};

// 8) บันทึก Max Consecutive (HR)
export const saveMaxConsecutivePolicy = async (days) => {
  const response = await axios.put(
    `${API_BASE}/api/holidays/max-consecutive`,
    { days },
    { headers: getHeaders() }
  );
  return response.data;
};
