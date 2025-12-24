import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { ArrowLeft, Briefcase, ShieldCheck, Edit3, Settings2 } from "lucide-react";
import { alertError } from "../utils/sweetAlert";

// Shared Components
import { QuotaCards, HistoryTable } from "../components/shared";

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("attendance");

  // ✅ ปรับปรุงให้รองรับทั้ง Windows path และ URL มาตรฐาน
  const buildFileUrl = (pathOrUrl) => {
    if (!pathOrUrl) return "";
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

    const API_BASE = (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");
    const FILE_BASE = API_BASE.replace(/\/api\/?$/, "");
    
    // จัดการเรื่อง slash ให้ถูกต้อง
    const normalizedPath = pathOrUrl.replace(/\\/g, "/");
    const p = normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;

    return `${FILE_BASE || window.location.origin}${p}`;
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/employees/${id}`);
      setData(res.data);
    } catch (err) {
      console.error("Fetch error:", err);
      alertError("ล้มเหลว", "ไม่สามารถโหลดข้อมูลพนักงานได้");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-black text-slate-400 uppercase tracking-[0.2em] text-xs">Loading Profile...</span>
        </div>
      </div>
    );

  if (!data?.info) return <div className="p-20 text-center font-black text-rose-500">ERROR: Employee Not Found</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-400 hover:text-blue-600 font-black transition-all group text-sm"
      >
        <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" />
        BACK TO DIRECTORY
      </button>

      {/* Header Profile */}
      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6 transition-all hover:shadow-md">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="h-28 w-28 rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-5xl font-black shadow-xl shadow-blue-100 uppercase">
            {data.info.firstName?.charAt(0)}
          </div>
          <div className="space-y-2 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <h1 className="text-4xl font-black text-slate-800 tracking-tight">
                {data.info.fullName || `${data.info.firstName} ${data.info.lastName}`}
              </h1>
              <span className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 ${data.info.isActive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"}`}>
                {data.info.isActive ? "Working" : "Resigned"}
              </span>
            </div>
            <p className="text-slate-400 font-bold text-lg italic">{data.info.email}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-2">
              <span className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl border border-blue-100 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
                <Briefcase size={14} /> {data.info.role}
              </span>
              <span className="bg-slate-50 text-slate-600 px-4 py-2 rounded-xl border border-slate-100 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
                <ShieldCheck size={14} /> Joined: {data.info.joiningDate}
              </span>
            </div>
          </div>
        </div>
        <button className="px-8 py-5 rounded-[2rem] bg-slate-900 text-white font-black flex items-center gap-3 hover:bg-slate-800 active:scale-95 transition-all shadow-xl shadow-slate-200 text-sm uppercase tracking-widest">
          <Edit3 size={18} /> Manage Info
        </button>
      </div>

      {/* Quota Cards Section */}
      <div className="space-y-4">
        <div className="px-4 flex items-center gap-2 font-black text-slate-400 text-[11px] uppercase tracking-[0.2em]">
          <Settings2 size={14}/> Leave Balance
        </div>
        <QuotaCards quotas={data.quotas || []} />
      </div>

      <div className="flex justify-between items-end pb-2">
        <div className="px-4 space-y-1">
          <h2 className="font-black text-slate-800 uppercase tracking-widest text-lg">Performance Log</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Attendance and Leave Records</p>
        </div>
        <button className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95">
          Adjust Quota
        </button>
      </div>

      {/* History Table */}
      <HistoryTable
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        attendanceData={data.attendance?.map((row) => ({
          ...row,
          dateDisplay: row.date || row.dateDisplay, 
          checkInTimeDisplay: row.checkIn || row.checkInTimeDisplay,
          checkOutTimeDisplay: row.checkOut || row.checkOutTimeDisplay,
          statusDisplay: row.status || row.statusDisplay,
        })) || []}
        leaveData={data.leaves?.map((leave) => ({
          ...leave,
          leaveType: leave.leaveType || { typeName: leave.type },
          totalDaysRequested: leave.totalDaysRequested || leave.days,
          attachmentUrl: leave.attachmentUrl // ✅ ปุ่ม VIEW จะขึ้นตามเงื่อนไขใน HistoryTable
        })) || []}
        buildFileUrl={buildFileUrl}
      />
    </div>
  );
}