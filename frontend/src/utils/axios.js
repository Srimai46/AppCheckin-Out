import axios from 'axios';

// สร้าง instance ของ axios และกำหนด Base URL เป็น IP เครื่อง Server
const api = axios.create({
  baseURL: 'http://192.168.1.35:8080/api', // ✅ ถูกต้องแล้วครับ
  timeout: 10000, // (Optional) ตั้งเวลา timeout ไว้ 10 วินาที กันค้าง
});

// ----------------------------------------------------------------
// 1. Request Interceptor: แนบ Token ไปทุกครั้ง (สำคัญมาก!)
// ----------------------------------------------------------------
api.interceptors.request.use(
  (config) => {
    // ดึง Token จาก LocalStorage
    const token = localStorage.getItem('token');
    
    // ถ้ามี Token ให้แนบไปใน Header: Authorization
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ----------------------------------------------------------------
// 2. Response Interceptor: ดักจับ Error (เช่น Token หมดอายุ)
// ----------------------------------------------------------------
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // ถ้า Backend ตอบกลับมาว่า 401 (Unauthorized) แสดงว่า Token หมดอายุ หรือปลอม
    if (error.response && error.response.status === 401) {
      // ลบ Token ทิ้ง
      localStorage.removeItem('token');
      // ดีดกลับไปหน้า Login (ถ้าไม่ได้อยู่ที่หน้า Login อยู่แล้ว)
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ----------------------------------------------------------------
// 3. Export ออกไปใช้งาน (สำคัญ! ลืมไม่ได้)
// ----------------------------------------------------------------
export default api;