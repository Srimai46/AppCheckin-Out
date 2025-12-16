import { createContext, useState, useEffect, useContext } from 'react';
import { loginUser, getMe } from '../api/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ เช็ค Token เมื่อเปิดเว็บ
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userData = await getMe();
          // สร้าง userObj จาก response ที่ backend ส่งมา
          const userObj = {
            id: userData.id,
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            role: userData.role,
            profileImageUrl: userData.profileImageUrl,
          };
          setUser(userObj);
        } catch (error) {
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  // ✅ ฟังก์ชัน Login
  const login = async (email, password) => {
    const data = await loginUser({ email, password });
    localStorage.setItem('token', data.token);

    // สร้าง userObj เองจาก response flat
    const userObj = {
      id: data.id,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      role: data.role,
      profileImageUrl: data.profileImageUrl,
    };

    setUser(userObj);
    return data;
  };

  // ✅ ฟังก์ชัน Logout
  const logout = () => {
    localStorage.removeItem('token');
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
