import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { checkIn, checkOut, getMyHistory } from "../api/attendanceService";
import { getMyQuotas, getMyLeaves } from "../api/leaveService";
import {
  LogIn,
  LogOut,
  Calendar,
  Loader2,
  History,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { alertConfirm, alertSuccess, alertError } from "../utils/sweetAlert";
import { openAttachment } from "../utils/attachmentPreview";

function PaginationBar({ page, totalPages, onPrev, onNext }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50">
      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
        Page {page} / {totalPages}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={page <= 1}
          className={`h-9 px-4 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all active:scale-95
            ${
              page <= 1
                ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                : "bg-white text-slate-800 border-gray-200 hover:bg-gray-50"
            }`}
        >
          Prev
        </button>

        <button
          onClick={onNext}
          disabled={page >= totalPages}
          className={`h-9 px-4 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all active:scale-95
            ${
              page >= totalPages
                ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                : "bg-white text-slate-800 border-gray-200 hover:bg-gray-50"
            }`}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [time, setTime] = useState(new Date());
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [leaveQuotas, setLeaveQuotas] = useState([]);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  // ✅ tab
  const [activeTab, setActiveTab] = useState("attendance");

  // ✅ pagination
  const PAGE_SIZE = 10;
  const [attPage, setAttPage] = useState(1);
  const [leavePage, setLeavePage] = useState(1);

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  // ✅ API_BASE อาจเป็น http://IP:PORT/api หรือ http://IP:PORT/api/
  const API_BASE = (import.meta.env.VITE_API_URL || "")
    .trim()
    .replace(/\/$/, "");

  // ✅ FILE_BASE = ตัด /api หรือ /api/ ออก เพื่อใช้กับ /uploads
  const FILE_BASE = API_BASE.replace(/\/api\/?$/, "");

  // ✅ ต่อ URL ของไฟล์แนบให้รองรับ: full url, /uploads..., uploads..., windows path
  const buildFileUrl = (pathOrUrl) => {
    if (!pathOrUrl) return "";

    // 1) ถ้าเป็น URL เต็มอยู่แล้ว
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

    // 2) ถ้าเป็น Windows path เก่า -> ตัดให้เหลือ /uploads/...
    if (/^[a-zA-Z]:\\/.test(pathOrUrl)) {
      const normalized = pathOrUrl.replace(/\\/g, "/");
      const idx = normalized.toLowerCase().indexOf("/uploads/");
      if (idx !== -1) {
        const p = normalized.slice(idx); // /uploads/...
        return `${FILE_BASE || window.location.origin}${p}`;
      }
      return "";
    }

    // 3) ทำให้เป็น /uploads/... เสมอ
    const p = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;

    // 4) ถ้ามี FILE_BASE ใช้ FILE_BASE (prod/lan), ถ้าไม่มีใช้ origin (dev)
    return `${FILE_BASE || window.location.origin}${p}`;
  };

  const fetchData = async () => {
    try {
      setDataLoading(true);

      const [historyRes, quotaRes, leaveRes] = await Promise.all([
        getMyHistory(),
        getMyQuotas(),
        getMyLeaves(),
      ]);

      const att = Array.isArray(historyRes?.data)
        ? historyRes.data
        : Array.isArray(historyRes)
        ? historyRes
        : [];

      setAttendanceHistory(att);
      setLeaveQuotas(Array.isArray(quotaRes) ? quotaRes : []);
      setLeaveHistory(Array.isArray(leaveRes) ? leaveRes : []);

      // ✅ reset page on refresh
      setAttPage(1);
      setLeavePage(1);
    } catch (err) {
      console.error("Error fetching data:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "ไม่สามารถดึงข้อมูล Dashboard ได้";
      alertError("โหลดข้อมูลไม่สำเร็จ", msg);
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

  // ✅ clamp page if data length changes
  useEffect(() => {
    const total = Math.max(1, Math.ceil(attendanceHistory.length / PAGE_SIZE));
    setAttPage((p) => clamp(p, 1, total));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendanceHistory.length]);

  useEffect(() => {
    const total = Math.max(1, Math.ceil(leaveHistory.length / PAGE_SIZE));
    setLeavePage((p) => clamp(p, 1, total));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaveHistory.length]);

  const getStatusStyle = (status) => {
    switch (status) {
      case "Approved":
        return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case "Rejected":
        return "bg-rose-50 text-rose-600 border-rose-100";
      default:
        return "bg-amber-50 text-amber-600 border-amber-100";
    }
  };

  const handleAction = async (action) => {
    const isCheckIn = action === "in";

    const confirmed = await alertConfirm(
      "ยืนยันการทำรายการ",
      `ต้องการ${
        isCheckIn ? "เข้างาน (Check In)" : "ออกงาน (Check Out)"
      } ใช่ไหม?`,
      isCheckIn ? "ยืนยันเข้างาน" : "ยืนยันออกงาน"
    );

    if (!confirmed) return;

    try {
      const res = isCheckIn ? await checkIn() : await checkOut();
      await alertSuccess("บันทึกสำเร็จ", res?.message || "ระบบบันทึกให้แล้ว");
      fetchData();
    } catch (err) {
      const msg =
        err?.response?.data?.message || // สำหรับดึง message
        err?.response?.data?.error || // สำหรับดึง error (ที่คุณใช้อยู่ตอนนี้)
        "เกิดข้อผิดพลาดในการเชื่อมต่อ";

      alertError("แจ้งเตือน", msg); // "Request failed..." จะหายไปแล้ว
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

  // ✅ pagination computed
  const attTotalPages = Math.max(
    1,
    Math.ceil(attendanceHistory.length / PAGE_SIZE)
  );
  const leaveTotalPages = Math.max(
    1,
    Math.ceil(leaveHistory.length / PAGE_SIZE)
  );

  const attPageItems = attendanceHistory.slice(
    (attPage - 1) * PAGE_SIZE,
    attPage * PAGE_SIZE
  );
  const leavePageItems = leaveHistory.slice(
    (leavePage - 1) * PAGE_SIZE,
    leavePage * PAGE_SIZE
  );

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

        {dataLoading && (
          <div className="mt-3 text-xs font-bold text-gray-400">
            กำลังโหลดข้อมูล...
          </div>
        )}
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
          className="flex items-center justify-center gap-3 bg-amber-300 hover:bg-amber-400 text-slate-900 py-4 px-6 rounded-2xl font-black shadow-lg shadow-amber-200/60 transition-all active:scale-95"
        >
          <Calendar size={24} /> REQUEST LEAVE
        </button>
      </div>

      {/* ================= TAB SECTION ================= */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        {/* Tab Header */}
        <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            {activeTab === "attendance" ? (
              <History size={18} className="text-blue-600" />
            ) : (
              <FileText size={18} className="text-amber-500" />
            )}

            <h2 className="font-black text-slate-800 text-sm uppercase tracking-widest">
              {activeTab === "attendance" ? "Attendance Log" : "Leave History"}
            </h2>
          </div>

          {/* Tabs */}
          <div className="flex bg-gray-50 border border-gray-100 rounded-2xl p-1">
            <button
              onClick={() => {
                setActiveTab("attendance");
                setAttPage(1);
              }}
              className={`px-5 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2
                ${
                  activeTab === "attendance"
                    ? "bg-white shadow-sm border border-gray-100 text-slate-800"
                    : "text-gray-400 hover:text-slate-700"
                }`}
            >
              <History size={16} className="text-blue-600" />
              Attendance
            </button>

            <button
              onClick={() => {
                setActiveTab("leave");
                setLeavePage(1);
              }}
              className={`px-5 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2
                ${
                  activeTab === "leave"
                    ? "bg-white shadow-sm border border-gray-100 text-slate-800"
                    : "text-gray-400 hover:text-slate-700"
                }`}
            >
              <FileText size={16} className="text-amber-500" />
              Leave
            </button>
          </div>
        </div>

        {/* ================= CONTENT ================= */}
        {activeTab === "attendance" && (
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
                {attPageItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan="3"
                      className="px-6 py-10 text-center text-gray-400 italic"
                    >
                      ไม่มีข้อมูล Attendance
                    </td>
                  </tr>
                ) : (
                  attPageItems.map((row, index) => (
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
                  ))
                )}
              </tbody>
            </table>

            <PaginationBar
              page={attPage}
              totalPages={attTotalPages}
              onPrev={() => setAttPage((p) => Math.max(1, p - 1))}
              onNext={() => setAttPage((p) => Math.min(attTotalPages, p + 1))}
            />
          </div>
        )}

        {activeTab === "leave" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Period</th>
                  <th className="px-6 py-4">Note</th>
                  <th className="px-6 py-4 text-center">File</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>

              <tbody className="text-[11px] font-bold">
                {leavePageItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-10 text-center text-gray-400 italic"
                    >
                      ไม่มีประวัติการลา
                    </td>
                  </tr>
                ) : (
                  leavePageItems.map((leave, index) => (
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
                        })}{" "}
                        -{" "}
                        {new Date(leave.endDate).toLocaleDateString("th-TH", {
                          day: "numeric",
                          month: "short",
                        })}
                      </td>

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

                      {/* ปุ่มดูไฟล์แนบ */}
                      <td className="px-6 py-4 text-center">
                        {leave.attachmentUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              openAttachment(buildFileUrl(leave.attachmentUrl))
                            }
                            className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200
                                       px-3 py-2 rounded-xl inline-flex items-center gap-2
                                       text-[11px] font-black transition active:scale-95"
                            title="ดูไฟล์แนบ"
                          >
                            <ImageIcon size={16} />
                            VIEW
                          </button>
                        ) : (
                          <span className="text-gray-300 text-[10px] font-black">
                            -
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-3 py-1.5 rounded-xl border-2 text-[10px] uppercase font-black tracking-widest ${getStatusStyle(
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

            <PaginationBar
              page={leavePage}
              totalPages={leaveTotalPages}
              onPrev={() => setLeavePage((p) => Math.max(1, p - 1))}
              onNext={() =>
                setLeavePage((p) => Math.min(leaveTotalPages, p + 1))
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
