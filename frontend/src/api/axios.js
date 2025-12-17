import axios from 'axios';

const api = axios.create({
  // ⚠️ อย่าลืมแก้ IP เป็นของเครื่องคุณ (ตามที่คุยกันเรื่อง LAN)
  baseURL: 'http://192.168.1.42:8080/api', 
  timeout: 10000,
});

// แนบ Token อัตโนมัติ
api.interceptors.request.use((config) => {
  // ✅ ต้องอ่านจาก localStorage ทุกครั้งที่มีการยิง Request
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// ดักจับ Token หมดอายุ
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;