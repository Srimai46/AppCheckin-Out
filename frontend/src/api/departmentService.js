// frontend/src/api/departmentService.js

import axios from "./axiosConfig"; // 👈 เปลี่ยน path นี้ให้ตรงกับไฟล์ตั้งค่า Axios ของคุณ

// Base Endpoint (ตรงกับที่ mount ใน app.js: app.use("/api/departments", ...))
const BASE_URL = "/departments";

// 1. ดึงข้อมูลแผนกทั้งหมด
export const getAllDepartments = async () => {
  try {
    const response = await axios.get(BASE_URL);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// 2. เพิ่มแผนกใหม่ (ADMIN, HR)
// data: { name, description }
export const createDepartment = async (data) => {
  try {
    const response = await axios.post(BASE_URL, data);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// 3. แก้ไขแผนก (ADMIN, HR)
// id: departmentId, data: { name, description }
export const updateDepartment = async (id, data) => {
  try {
    const response = await axios.put(`${BASE_URL}/${id}`, data);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// 4. ลบแผนก (ADMIN, HR)
export const deleteDepartment = async (id) => {
  try {
    const response = await axios.delete(`${BASE_URL}/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};