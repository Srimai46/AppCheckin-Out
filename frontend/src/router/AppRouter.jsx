import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';

// 🔒 ตัวป้องกัน Route (ฉบับสมบูรณ์)
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // 1. ถ้ากำลังเช็ค Token (loading = true) ให้โชว์หน้าโหลดก่อน ห้ามดีด
  if (loading) {
     return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  // 2. ถ้าโหลดเสร็จแล้ว แต่ไม่มี User ค่อยดีดไป Login
  if (!user) return <Navigate to="/login" replace />;

  return children;
};

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        {/* 3. สั่งให้เข้า / เฉยๆ แล้วเด้งไป /dashboard */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        {/* 4. เส้นทาง Dashboard ต้องเป็นตัวเล็กให้ตรงกับที่ Login ส่งมา */}
        <Route path="dashboard" element={<Dashboard />} />
        
        <Route path="leave-request" element={<div>หน้าใบลา (Coming Soon)</div>} />
        <Route path="approvals" element={<div>หน้าอนุมัติ (Coming Soon)</div>} />
      </Route>
    </Routes>
  );
}