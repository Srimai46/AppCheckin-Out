import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import TeamCalendar from "../pages/TeamCalendar";
import LeaveRequest from "../pages/LeaveRequest";
import EmployeeList from "../pages/EmployeeList";
import EmployeeDetail from "../pages/EmployeeDetail";
import LeaveApproval from "../pages/LeaveApproval";
import YearEndProcessing from "../pages/YearEndProcessing";
import AuditLog from "../pages/AuditLog"

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
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        {/* เมนูสำหรับพนักงานทุกคน */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="leave-request" element={<LeaveRequest />} />
        <Route path="calendar" element={<TeamCalendar />} />
        {/* เมนูสำหรับ HR/Admin */}
        <Route path="employees" element={<EmployeeList />} />
        <Route path="employees/:id" element={<EmployeeDetail />} />
        {/* จัดกลุ่มเมนู Admin */}
        <Route path="admin/leaves" element={<LeaveApproval />} />
        <Route path="year-end-processing" element={<YearEndProcessing />} />
        <Route path="audit-log" element={<AuditLog />}
        />{" "}
        {/* ปรับให้ตรงกับ Layout */}
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
