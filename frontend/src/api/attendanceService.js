import api from "./axios";

export const checkIn = async () => {
  const { data } = await api.post("/attendance/check-in");
  return data;
};

export const checkOut = async () => {
  const { data } = await api.post("/attendance/check-out");
  return data;
};

export const getMyHistory = async () => {
  const { data } = await api.get("/attendance/history");
  return data;
};

export const getUserHistory = async (userId) => {
  const { data } = await api.get(`/attendance/history/user/${userId}`);
  return data;
};

export const getTodayTeamAttendance = async () => {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await api.get(`/attendance/team/today?date=${today}`);
  return data;
};

export const hrCheckInEmployee = async (employeeId) => {
  const { data } = await api.post(`/attendance/team/${employeeId}/check-in`);
  return data;
};

export const hrCheckOutEmployee = async (employeeId) => {
  const { data } = await api.post(`/attendance/team/${employeeId}/check-out`);
  return data;
};
