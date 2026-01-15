// frontend/src/router/AppRouter.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/shared/Layout";

import Login from "../pages/auth/Login";
import Main from "../pages/Main/Main";
import AttendanceDashboard from "../pages/attendance/AttendanceDashboard";
import TeamCalendar from "../pages/teamCalendar/TeamCalendar";
import LeaveRequest from "../pages/leave/LeaveRequest";
import LeaveApproval from "../pages/leave/LeaveApproval";
import EmployeeList from "../pages/employees/EmployeeList";
import EmployeeDetail from "../pages/employees/EmployeeDetail";
import YearEndProcessing from "../pages/yearEnd/YearEndProcessing";
import AuditLog from "../pages/audit/AuditLog";

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
        <Route index element={<Navigate to="/main" replace />} />
        {/* เมนูสำหรับพนักงานทุกคน */}
        <Route path="main" element={<Main />} />
        <Route path="leave-request" element={<LeaveRequest />} />
        <Route path="calendar" element={<TeamCalendar />} />
        {/* เมนูสำหรับ HR/Admin */}
        <Route path="employees" element={<EmployeeList />} />
        <Route path="employees/:id" element={<EmployeeDetail />} />
        {/* จัดกลุ่มเมนู Admin */}
        <Route path="admin/leaves" element={<LeaveApproval />} />
        <Route path="year-end-processing" element={<YearEndProcessing />} />
        <Route path="audit-log" element={<AuditLog />} />{" "}
        {/* ปรับให้ตรงกับ Layout */}
        <Route path="attendance-dashboard" element={<AttendanceDashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/main" replace />} />
    </Routes>
  );
}
