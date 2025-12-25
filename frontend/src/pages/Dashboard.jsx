import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { checkIn, checkOut, getMyHistory } from "../api/attendanceService";
import { getMyQuotas, getMyLeaves } from "../api/leaveService";
import { LogIn, LogOut, Calendar, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { alertConfirm, alertSuccess, alertError } from "../utils/sweetAlert";

// Shared Components
import { QuotaCards, HistoryTable } from "../components/shared";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [time, setTime] = useState(new Date());
  const [data, setData] = useState({ att: [], quotas: [], leaves: [] });
  const [activeTab, setActiveTab] = useState("attendance");

  const buildFileUrl = (path) => {
    if (!path) return "";
    const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "");
    return `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
  };

  const fetchData = useCallback(async () => {
    try {
      const [h, q, l] = await Promise.all([getMyHistory(), getMyQuotas(), getMyLeaves()]);
      
      // จัดการข้อมูล Attendance
      const rawAtt = h?.data || h || [];
      const mappedAtt = rawAtt.map(row => ({
        ...row,
        dateDisplay: row.dateDisplay || row.date,
        checkInTimeDisplay: row.checkInTimeDisplay || row.checkIn,
        checkOutTimeDisplay: row.checkOutTimeDisplay || row.checkOut,
        statusDisplay: row.statusDisplay || row.status
      }));

      // จัดการข้อมูล Leave
      const rawLeaves = l || [];
      const mappedLeaves = rawLeaves.map(leave => ({
        ...leave,
        leaveType: leave.leaveType || { typeName: leave.type },
        totalDaysRequested: leave.totalDaysRequested || leave.days
      }));

      setData({
        att: mappedAtt,
        quotas: q || [],
        leaves: mappedLeaves
      });
    } catch (err) {
      alertError("Unable to Retrieve Data", "An error occurred while loading the information. Please try again later.");
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
      const timer = setInterval(() => setTime(new Date()), 1000);
      return () => clearInterval(timer);
    }
  }, [user, fetchData]);

  const handleAction = async (action) => {
    const isCheckIn = action === "in";
    const confirmed = await alertConfirm("Attendance Confirmation", `Are you sure you want to ${isCheckIn ? "check in" : "check out"} at this time?`);

    if (!confirmed) return;
    try {
      const res = isCheckIn ? await checkIn() : await checkOut();
      await alertSuccess("Success", res?.message || "The operation was completed successfully.");
      fetchData();
    } catch (err) {
      alertError(
        "Operation Failed",
        err?.response?.data?.message || "An unexpected error occurred. Please try again."
      );
    }
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center animate-pulse text-blue-600 font-black">LOADING...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <div className="text-center">
        <h1 className="text-3xl font-black text-slate-800">Dashboard</h1>
        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">Welcome, {user?.firstName} {user?.lastName}</p>
        <p className="text-xs text-blue-600 font-black mt-2">{time.toLocaleString("th-TH")}</p>
      </div>

      <QuotaCards quotas={data.quotas} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <button onClick={() => handleAction("in")} className="flex items-center justify-center gap-3 bg-emerald-500 text-white py-4 rounded-3xl font-black shadow-lg hover:bg-emerald-600 transition-all"><LogIn size={20}/> CHECK IN</button>
        <button onClick={() => handleAction("out")} className="flex items-center justify-center gap-3 bg-rose-500 text-white py-4 rounded-3xl font-black shadow-lg hover:bg-rose-600 transition-all"><LogOut size={20}/> CHECK OUT</button>
        <button onClick={() => navigate("/leave-request")} className="flex items-center justify-center gap-3 bg-amber-300 text-slate-900 py-4 rounded-3xl font-black shadow-lg hover:bg-amber-400 transition-all"><Calendar size={20}/> LEAVE</button>
      </div>

      <HistoryTable 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        attendanceData={data.att} 
        leaveData={data.leaves} 
        buildFileUrl={buildFileUrl}
      />
    </div>
  );
}