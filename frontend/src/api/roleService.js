// frontend/src/api/roleService.js
import api from "./axios";

// ✅ ดึง roles สำหรับ dropdown
export const getRoles = async (params = {}) => {
  // params เช่น { simple: 1 }
  const res = await api.get("/roles", { params });
  return res;
};
