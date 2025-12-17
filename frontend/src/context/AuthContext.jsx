import { createContext, useState, useEffect, useContext } from 'react';
import { loginUser, getMe } from '../api/authService';
import api from '../api/axios'; 

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. เช็ค Token เมื่อเปิดเว็บ (Refresh หน้า)
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // ใส่ Token ให้ Axios
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // ดึงข้อมูล User ล่าสุด (API getMe ส่ง user object มาตรงๆ)
          const userData = await getMe();
          setUser(userData); 

        } catch (error) {
          console.error("Session Invalid");
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  // 2. ฟังก์ชัน Login (จุดที่แก้!)
  const login = async (email, password) => {
    try {
      // response จาก loginUser คือ { message, token, user: {...} }
      const data = await loginUser({ email, password });
      
      // เก็บ Token
      localStorage.setItem('token', data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;

      // ✅ แก้ไขตรงนี้: ดึงข้อมูลจาก data.user แทนที่จะใช้ data ตรงๆ
      setUser(data.user); 

      return data;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);