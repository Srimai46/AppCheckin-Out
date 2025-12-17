import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import TeamCalendar from "../pages/TeamCalendar"; 
import LeaveRequest from '../pages/LeaveRequest';
import EmployeeList from "../pages/EmployeeList";
import EmployeeDetail from "../pages/EmployeeDetail";
import LeaveApproval from "../pages/LeaveApproval"; 

// 🔒 ตัวป้องกัน Route (ProtectedRoute)
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-blue-600 font-black uppercase tracking-widest">
        Loading System...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return children;
};

export default function AppRouter() {
  return (
    <Routes>
      {/* Route สำหรับ Login ไม่ต้องผ่าน ProtectedRoute */}
      <Route path="/login" element={<Login />} />

      {/* 🔒 ทุก Route ภายใต้ Layout จะถูกป้องกันด้วย ProtectedRoute */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* เมื่อเข้าที่หน้าแรกสุด (/) ให้ส่งไปที่ dashboard ทันที */}
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* เมนูสำหรับพนักงานทุกคน */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="leave-request" element={<LeaveRequest />} />
        
        {/* เมนูสำหรับ HR/Admin (ควรมีการเช็ค Role ภายในหน้าเหล่านี้เพิ่มเติม) */}
        <Route path="calendar" element={<TeamCalendar />} />
        <Route path="employees" element={<EmployeeList />} />
        <Route path="employees/:id" element={<EmployeeDetail />} />
        
        {/* ✅ เส้นทางอนุมัติใบลา (ตรงกับเมนูใน Layout.jsx) */}
        <Route path="admin/leaves" element={<LeaveApproval />} /> 

      </Route>

      {/* กรณีพิมพ์ URL มั่ว ให้เด้งกลับไปหน้า Dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}