// ✅ ต้อง import จากไฟล์ axios ที่เราตั้งค่า BaseURL ไว้
import api from './axios'; 

export const checkIn = async () => {
  // ยิงไปที่ /api/attendance/check-in
  const { data } = await api.post('/attendance/check-in');
  return data;
};

export const checkOut = async () => {
  // ยิงไปที่ /api/attendance/check-out
  const { data } = await api.post('/attendance/check-out');
  return data;
};

export const getMyHistory = async () => {
  // ✅ ต้องตรงกับ Route Backend (/history)
  // Backend: router.get('/history') + Server: app.use('/api/attendance')
  // ผลลัพธ์ = /api/attendance/history
  const { data } = await api.get('/attendance/history'); 
  return data;
};

export const getUserHistory = async (userId) => {
  const { data } = await api.get(`/attendance/history/user/${userId}`);
  return data;
}