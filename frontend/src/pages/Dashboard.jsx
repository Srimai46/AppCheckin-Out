import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { checkIn, checkOut, getMyHistory } from "../api/attendanceService";
import { getMyQuotas, getMyLeaves } from "../api/leaveService";
import { LogIn, LogOut, Calendar, ChevronDown } from "lucide-react";
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
  
  // ✅ กำหนด State ปีเป็น ค.ศ. ตามมาตรฐาน DB
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const buildFileUrl = (path) => {
    if (!path) return "";
    const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "");
    return `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
  };

  const fetchData = useCallback(async (year) => {
    try {
      const [h, q, l] = await Promise.all([
        getMyHistory(), 
        getMyQuotas(year), 
        getMyLeaves()
      ]);
      
      // ✅ ตรวจสอบและจัดการข้อมูล Array ป้องกัน Error map is not a function
      const quotaArray = Array.isArray(q) ? q : (q?.data || []);
      const historyArray = Array.isArray(h) ? h : (h?.data || []);
      const leavesArray = Array.isArray(l) ? l : (l?.data || []);

      const mappedAtt = historyArray.map(row => ({
        ...row,
        dateDisplay: row.dateDisplay || row.date,
        checkInTimeDisplay: row.checkInTimeDisplay || row.checkIn,
        checkOutTimeDisplay: row.checkOutTimeDisplay || row.checkOut,
        statusDisplay: row.statusDisplay || row.status
      }));

      const mappedLeaves = leavesArray.map(leave => ({
        ...leave,
        leaveType: leave.leaveType || { typeName: leave.type },
        totalDaysRequested: leave.totalDaysRequested || leave.days
      }));

      setData({
        att: mappedAtt,
        quotas: quotaArray,
        leaves: mappedLeaves
      });
    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
      alertError("Unable to Retrieve Data", "An error occurred while loading the information.");
      setData({ att: [], quotas: [], leaves: [] });
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchData(selectedYear);
    }
  }, [user, selectedYear, fetchData]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAction = async (action) => {
    const isCheckIn = action === "in";
    const confirmed = await alertConfirm("Attendance Confirmation", `Are you sure you want to ${isCheckIn ? "check in" : "check out"}?`);
    if (!confirmed) return;
    try {
      const res = isCheckIn ? await checkIn() : await checkOut();
      await alertSuccess("Success", res?.message || "Operation successful.");
      fetchData(selectedYear);
    } catch (err) {
      alertError("Operation Failed", err?.response?.data?.message || "Error occurred.");
    }
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center text-blue-600 font-black italic tracking-widest">LOADING...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <div className="text-center">
        <h1 className="text-3xl font-black text-slate-800">Dashboard</h1>
        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">Welcome, {user?.firstName} {user?.lastName}</p>
        <p className="text-xs text-blue-600 font-black mt-2">{time.toLocaleString("th-TH")}</p>
      </div>

      {/* ✅ ส่วนเลือกปีแบบ Dropdown (ดีไซน์ใหม่) */}
      <div className="flex justify-center mb-6">
  <div className="relative inline-block text-left w-56">
    {/* ส่วนหัวข้อ (Label) */}
    <div className="mb-1.5 ml-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
      Select Year
    </div>
    
    <div className="relative group">
      <select
        value={selectedYear}
        onChange={(e) => setSelectedYear(Number(e.target.value))}
        className="appearance-none w-full bg-white border border-gray-100 py-3.5 px-6 pr-12 rounded-[1.8rem] shadow-sm text-sm font-black text-slate-700 cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all hover:shadow-md hover:border-gray-200"
      >
        {[2025, 2026].map((y) => (
          <option key={y} value={y}>
            Year {y} (AD)
          </option>
        ))}
      </select>
      
      {/* Custom Arrow Icon - ส่วนนี้เป็นลูกศรสำหรับ Dropdown ซึ่งควรเก็บไว้เพื่อให้ผู้ใช้ทราบว่าเป็นเมนูเลือกครับ */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-gray-400 group-hover:text-blue-500 transition-colors">
        <ChevronDown size={18} />
      </div>
    </div>
  </div>
</div>

      <QuotaCards quotas={data.quotas} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <button onClick={() => handleAction("in")} className="flex items-center justify-center gap-3 bg-emerald-500 text-white py-4 rounded-3xl font-black shadow-lg hover:bg-emerald-600 transition-all hover:-translate-y-1"><LogIn size={20}/> CHECK IN</button>
        <button onClick={() => handleAction("out")} className="flex items-center justify-center gap-3 bg-rose-500 text-white py-4 rounded-3xl font-black shadow-lg hover:bg-rose-600 transition-all hover:-translate-y-1"><LogOut size={20}/> CHECK OUT</button>
        <button onClick={() => navigate("/leave-request")} className="flex items-center justify-center gap-3 bg-amber-300 text-slate-900 py-4 rounded-3xl font-black shadow-lg hover:bg-amber-400 transition-all hover:-translate-y-1"><Calendar size={20}/> LEAVE</button>
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