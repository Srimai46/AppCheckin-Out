//frontend/src/api/axios.js
import axios from 'axios';

const api = axios.create({

  baseURL: '/api', 
  timeout: 10000,
});

// Request Interceptor: แนบ Token อัตโนมัติ
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response Interceptor: ดักจับ Error 401 (Token หมดอายุ)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // ดีดกลับหน้า Login ถ้าไม่ได้อยู่ที่หน้า Login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;