import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { checkIn, checkOut, getMyHistory } from "../api/attendanceService";
// ✅ นำเข้า getMyLeaves เพิ่มเติม
import { getMyQuotas, getMyLeaves } from "../api/leaveService";
import {
  LogIn,
  LogOut,
  Calendar,
  Loader2,
  PieChart,
  History,
  FileText,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [time, setTime] = useState(new Date());
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [leaveQuotas, setLeaveQuotas] = useState([]);
  // ✅ เพิ่ม State สำหรับประวัติการลา
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  const fetchData = async () => {
    try {
      setDataLoading(true);
      // ✅ ดึงข้อมูลพร้อมกันทั้ง 3 อย่าง: ประวัติเข้างาน, โควตา, และประวัติการลา
      const [historyRes, quotaRes, leaveRes] = await Promise.all([
        getMyHistory(),
        getMyQuotas(),
        getMyLeaves(),
      ]);

      // จัดการข้อมูลประวัติเข้างาน
      setAttendanceHistory(
        Array.isArray(historyRes.data)
          ? historyRes.data
          : Array.isArray(historyRes)
          ? historyRes
          : []
      );

      // จัดการข้อมูลโควตา
      setLeaveQuotas(quotaRes || []);

      // ✅ จัดการข้อมูลประวัติการลา
      setLeaveHistory(leaveRes || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !user) return;
    fetchData();

    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [user, authLoading]);

  // ฟังก์ชันช่วยจัดการสีของสถานะการลา
  const getStatusStyle = (status) => {
    switch (status) {
      case "Approved":
        return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case "Rejected":
        return "bg-rose-50 text-rose-600 border-rose-100";
      default:
        return "bg-amber-50 text-amber-600 border-amber-100"; // Pending
    }
  };

  const handleAction = async (action) => {
    const isCheckIn = action === "in";
    if (!confirm(`ยืนยันการ ${isCheckIn ? "เข้างาน" : "ออกงาน"}?`)) return;

    try {
      const res = isCheckIn ? await checkIn() : await checkOut();
      alert(res.message || "บันทึกสำเร็จ");
      fetchData();
    } catch (err) {
      alert(`❌ เกิดข้อผิดพลาด: ${err.message}`);
    }
  };

  if (authLoading)
    return (
      <div className="flex h-screen w-full justify-center items-center">
        <Loader2 className="animate-spin h-10 w-10 text-blue-600" />
      </div>
    );
  if (!user) {
    setTimeout(() => navigate("/login"), 0);
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="text-center mt-6">
        <h1 className="text-3xl font-black text-slate-800 mb-2">Dashboard</h1>
        <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">
          สวัสดี, คุณ {user.firstName} {user.lastName}
        </p>
        <p className="text-sm text-blue-600 font-black mt-2 uppercase">
          {time.toLocaleDateString("th-TH", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}{" "}
          | {time.toLocaleTimeString("th-TH")}
        </p>
      </div>

      {/* Leave Quota Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {leaveQuotas.map((q, idx) => (
          <div
            key={idx}
            className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {q.type}
              </span>
              <PieChart size={18} className="text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-800 tracking-tighter">
                {q.remaining}{" "}
                <span className="text-xs font-bold text-gray-400 uppercase">
                  Days
                </span>
              </div>
              <div className="text-[9px] font-bold text-gray-400 uppercase mt-1">
                Used {q.used} / Total {q.total}
              </div>
            </div>
            <div className="mt-3 w-full bg-gray-50 h-1.5 rounded-full overflow-hidden border border-gray-100">
              <div
                className="bg-blue-600 h-full transition-all duration-700"
                style={{ width: `${(q.used / q.total) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <button
          onClick={() => handleAction("in")}
          className="flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white py-4 px-6 rounded-2xl font-black shadow-lg shadow-emerald-100 transition-all active:scale-95"
        >
          <LogIn size={24} /> CHECK IN
        </button>
        <button
          onClick={() => handleAction("out")}
          className="flex items-center justify-center gap-3 bg-rose-500 hover:bg-rose-600 text-white py-4 px-6 rounded-2xl font-black shadow-lg shadow-rose-100 transition-all active:scale-95"
        >
          <LogOut size={24} /> CHECK OUT
        </button>
        <button
          onClick={() => navigate("/leave-request")}
          className="flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white py-4 px-6 rounded-2xl font-black shadow-lg shadow-slate-200 transition-all active:scale-95"
        >
          <Calendar size={24} /> REQUEST LEAVE
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Attendance History Table */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center gap-2">
            <History size={18} className="text-blue-600" />
            <h2 className="font-black text-slate-800 text-sm uppercase tracking-widest">
              Attendance Log
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">In / Out</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-bold">
                {attendanceHistory.slice(0, 5).map((row, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-slate-600">
                      {row.dateDisplay}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-emerald-600">
                        {row.checkInTimeDisplay || "--:--"}
                      </span>
                      <span className="mx-2 text-gray-300">/</span>
                      <span className="text-rose-500">
                        {row.checkOutTimeDisplay || "--:--"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-2 py-1 rounded-lg border ${
                          row.statusDisplay === "สาย"
                            ? "bg-rose-50 text-rose-600 border-rose-100"
                            : "bg-emerald-50 text-emerald-600 border-emerald-100"
                        }`}
                      >
                        {row.statusDisplay || "ปกติ"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ✅ ✅ Leave History Table (Updated with Note column) ✅ ✅ */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center gap-2">
            <FileText size={18} className="text-amber-500" />
            <h2 className="font-black text-slate-800 text-sm uppercase tracking-widest">
              Leave History
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Period</th>
                  <th className="px-6 py-4">Note</th>{" "}
                  {/* ✅ เพิ่มคอลัมน์ Note */}
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-bold">
                {leaveHistory.length === 0 ? (
                  <tr>
                    <td
                      colSpan="4"
                      className="px-6 py-10 text-center text-gray-400 italic"
                    >
                      ไม่มีประวัติการลา
                    </td>
                  </tr>
                ) : (
                  leaveHistory.slice(0, 5).map((leave, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-slate-800">
                        {leave.leaveType?.typeName || "Other"}
                        <div className="text-[9px] text-gray-400 uppercase font-bold">
                          {leave.totalDaysRequested} Days
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                        {new Date(leave.startDate).toLocaleDateString("th-TH", {
                          day: "numeric",
                          month: "short",
                        })}
                        {" - "}
                        {new Date(leave.endDate).toLocaleDateString("th-TH", {
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                      {/* ✅ แสดง Note / เหตุผลการลา */}
                      <td className="px-6 py-4">
                        <div
                          className="text-slate-500 font-medium italic max-w-[150px] truncate"
                          title={leave.reason}
                        >
                          {leave.reason || (
                            <span className="text-gray-300">No note</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-3 py-1.5 rounded-xl border-2 text-[10px] uppercase font-black tracking-widest transition-all ${getStatusStyle(
                            leave.status
                          )}`}
                        >
                          {leave.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
