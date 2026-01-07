import axios from "axios";

// 1. กำหนด Base URL
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

// Get holidays for a specific year [controller: holidayController]
export const fetchHolidays = async (year) => {
  const response = await axios.get(`${API_BASE}/api/holidays`, {
    params: { year },
    headers: getHeaders(),
  });
  return response.data; // Array [{ id, date: "YYYY-MM-DD", name, ... }]
};

// Create a new holiday [controller: holidayController]
export const createHoliday = async (holidayData) => {
  const response = await axios.post(`${API_BASE}/api/holidays`, holidayData, {
    headers: getHeaders(),
  });
  return response.data;
};

// Update an existing holiday [controller: holidayController]
export const updateHoliday = async (id, holidayData) => {
  const response = await axios.put(`${API_BASE}/api/holidays/${id}`, holidayData, {
    headers: getHeaders(),
  });
  return response.data;
};

// Delete a holiday [controller: holidayController]
export const deleteHoliday = async (id) => {
  const response = await axios.delete(`${API_BASE}/api/holidays/${id}`, {
    headers: getHeaders(),
  });
  return response.data;
};

// ---------------------------
// Working Days Policy
// ---------------------------

// Get Working Days Policy [controller: holidayPolicyController]
export const fetchWorkingDaysPolicy = async () => {
  const response = await axios.get(`${API_BASE}/api/holidays/working-days`, {
    headers: getHeaders(),
  });
  return response.data;
};

// Save Working Days Policy [controller: holidayPolicyController]
export const saveWorkingDaysPolicy = async (workingDays) => {
  const response = await axios.put(
    `${API_BASE}/api/holidays/working-days`,
    { workingDays },
    { headers: getHeaders() }
  );
  return response.data;
};

// ---------------------------
// Max Consecutive Policy
// ---------------------------

// Get Max Consecutive Leave Days Policy [controller: holidayPolicyController]
export const fetchMaxConsecutivePolicy = async () => {
  const response = await axios.get(`${API_BASE}/api/holidays/max-consecutive`, {
    headers: getHeaders(),
  });
  return response.data;
};

// Save Max Consecutive Leave Days Policy [controller: holidayPolicyController]
export const saveMaxConsecutivePolicy = async (days) => {
  const response = await axios.put(
    `${API_BASE}/api/holidays/max-consecutive`,
    { days },
    { headers: getHeaders() }
  );
  return response.data;
};

// ===================================================================
// Helper สำหรับเช็คว่าเลือกวันลาทับวันหยุดหรือไม่
// ===================================================================

const toISO = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const parseISO = (iso) => {
  const [y, m, d] = String(iso).split("-").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

// Check if leave period overlaps with any holidays
export const checkLeaveOverlapWithHoliday = async (startDate, endDate) => {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (!start || !end) return [];

  const years = new Set([start.getFullYear(), end.getFullYear()]);
  const holidayMap = new Map(); // "YYYY-MM-DD" -> name

  for (const y of years) {
    const list = await fetchHolidays(y);
    if (Array.isArray(list)) {
      list.forEach((h) => {
        if (h?.date) holidayMap.set(h.date, h?.name || "Holiday");
      });
    }
  }

  const overlaps = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);

  const endD = new Date(end);
  endD.setHours(0, 0, 0, 0);

  while (cur <= endD) {
    const iso = toISO(cur);
    if (holidayMap.has(iso)) {
      overlaps.push({ date: iso, name: holidayMap.get(iso) });
    }
    cur.setDate(cur.getDate() + 1);
  }

  return overlaps; // [{ date: "2026-01-01", name: "New Year" }]
};
