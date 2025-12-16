import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';

// ตัวป้องกัน Route
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        {/* หน้าอื่นๆ รอทำเพิ่ม */}
        <Route path="leave-request" element={<div>หน้าใบลา (Coming Soon)</div>} />
        <Route path="approvals" element={<div>หน้าอนุมัติ (Coming Soon)</div>} />
      </Route>
    </Routes>
  );
}