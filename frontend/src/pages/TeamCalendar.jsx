import React, { useState, useEffect, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar as CalendarIcon,
  Users,
  LogIn,
  LogOut,
} from "lucide-react";
import { getAllLeaves } from "../api/leaveService";
import {
  getTodayTeamAttendance,
  hrCheckInEmployee,
  hrCheckOutEmployee,
} from "../api/attendanceService";

const SHIFT_START = "09:00";

export default function TeamCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());

  // ===== Leaves (เดิม) =====
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [modalLeaves, setModalLeaves] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // ===== ✅ Team Attendance =====
  const [teamAttendance, setTeamAttendance] = useState([]);
  const [attLoading, setAttLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({}); // { [employeeId]: "in" | "out" | null }

  // ===== ✅ Pagination (Team Attendance) =====
  const PAGE_SIZE = 10;
  const [teamPage, setTeamPage] = useState(1);

  // ===================== Fetch Leaves =====================
  useEffect(() => {
    const fetchLeaves = async () => {
      try {
        const data = await getAllLeaves();
        const list = Array.isArray(data) ? data : [];

        const formatted = list.map((item) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          status: item.status,
          date: new Date(item.startDate),
          startDate: item.startDate,
          endDate: item.endDate,
          reason: item.reason,
        }));

        setLeaves(formatted);
      } catch (e) {
        console.error("Error fetching leaves:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaves();
  }, []);

  // ===================== ✅ Attendance helpers =====================
  const normalizeTime = (t) => {
    if (!t) return null;
    try {
      const d = new Date(t);
      if (!isNaN(d.getTime())) return format(d, "HH:mm");
    } catch (_) {}
    if (typeof t === "string" && t.includes(":")) return t.slice(0, 5);
    return null;
  };

  const getAttendanceState = ({ checkInTime, checkOutTime }) => {
    const hasIn = !!checkInTime;
    const hasOut = !!checkOutTime;
    if (!hasIn) return "NOT_IN";
    if (hasIn && !hasOut) return "IN";
    return "OUT";
  };

  const toMinutes = (hhmm) => {
    if (!hhmm) return null;
    const [h, m] = String(hhmm).slice(0, 5).split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  };

  const nowMinutes = () => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  };

  // ✅ late rule:
  // - NOT_IN = late (ถ้าเวลาปัจจุบัน > SHIFT_START)
  // - IN/OUT = late (ถ้า check-in time > SHIFT_START)
  const isLate = (state, inTime) => {
    const startM = toMinutes(SHIFT_START);
    if (startM == null) return false;

    if (state === "NOT_IN") return nowMinutes() > startM;

    const inM = toMinutes(inTime);
    if (inM == null) return false;
    return inM > startM;
  };

  const badgeByAttendance = (state) => {
    if (state === "NOT_IN") return "bg-gray-50 text-gray-500 border-gray-100";
    if (state === "IN") return "bg-emerald-50 text-emerald-600 border-emerald-100";
    return "bg-slate-50 text-slate-600 border-slate-100";
  };

  const labelByAttendance = (state) => {
    if (state === "NOT_IN") return "NOT CHECKED IN";
    if (state === "IN") return "CHECKED IN";
    return "CHECKED OUT";
  };

  // ===================== ✅ Fetch Team Attendance =====================
  const fetchTeamAttendance = async () => {
    try {
      setAttLoading(true);

      const res = await getTodayTeamAttendance();
      const list =
        (Array.isArray(res) && res) ||
        (Array.isArray(res?.data) && res.data) ||
        (Array.isArray(res?.data?.data) && res.data.data) ||
        (Array.isArray(res?.employees) && res.employees) ||
        (Array.isArray(res?.data?.employees) && res.data.employees) ||
        [];

      setTeamAttendance(list);
      setTeamPage(1); // ✅ reset pagination when refresh
    } catch (e) {
      console.error("Error fetching team attendance:", e);
      setTeamAttendance([]);
    } finally {
      setAttLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamAttendance();
  }, []);

  // =========================================================
  // ✅ [NEW] กรองเฉพาะพนักงานที่ยังทำงานอยู่ (isActive = true/1)
  // วางตรงนี้: "หลัง fetchTeamAttendance/useEffect" ก่อนส่วน Pagination
  // =========================================================
  const activeTeamAttendance = useMemo(() => {
    return (teamAttendance || []).filter((r) => r?.isActive === true || r?.isActive === 1);
  }, [teamAttendance]);

  // ===================== ✅ Pagination computed (ใช้ activeTeamAttendance) =====================
  const totalTeamPages = useMemo(() => {
    return Math.max(1, Math.ceil(activeTeamAttendance.length / PAGE_SIZE));
  }, [activeTeamAttendance.length]);

  const pagedTeamAttendance = useMemo(() => {
    const start = (teamPage - 1) * PAGE_SIZE;
    return activeTeamAttendance.slice(start, start + PAGE_SIZE);
  }, [activeTeamAttendance, teamPage]);

  useEffect(() => {
    setTeamPage((p) => Math.min(Math.max(1, p), totalTeamPages));
  }, [totalTeamPages]);

  // ===================== UI Helpers (Leaves) =====================
  const handleDayClick = (day) => {
    const dayLeaves = leaves.filter((l) => isSameDay(l.date, day));
    setSelectedDate(day);
    setModalLeaves(dayLeaves);
    setShowModal(true);
  };

  const handleShowTodayLeaves = () => handleDayClick(new Date());

  // ✅ สีตามประเภทการลา (กรอบ/พื้น/ตัวอักษร/จุด)
  const leaveTheme = (type) => {
    const t = String(type || "").toLowerCase();

    if (t.includes("sick") || t.includes("ป่วย")) {
      return {
        dot: "bg-rose-400",
        border: "border-rose-200",
        bg: "bg-rose-50/60",
        text: "text-rose-700",
      };
    }

    if (t.includes("personal") || t.includes("กิจ") || t.includes("ธุระ")) {
      return {
        dot: "bg-sky-400",
        border: "border-sky-200",
        bg: "bg-sky-50/60",
        text: "text-sky-700",
      };
    }

    if (t.includes("annual") || t.includes("vacation") || t.includes("พักร้อน")) {
      return {
        dot: "bg-emerald-400",
        border: "border-emerald-200",
        bg: "bg-emerald-50/60",
        text: "text-emerald-700",
      };
    }

    // default (อื่นๆ)
    return {
      dot: "bg-amber-400",
      border: "border-amber-200",
      bg: "bg-amber-50/60",
      text: "text-amber-700",
    };
  };

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }),
  });

  const weekHeaders = useMemo(
    () => ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    []
  );

  const weekendBgByDow = (dow) => {
    if (dow === 6) return "bg-violet-50/70";
    if (dow === 0) return "bg-rose-50/70";
    return "";
  };

  const todayCount = useMemo(
    () => leaves.filter((l) => isSameDay(l.date, new Date())).length,
    [leaves]
  );

  const goPrev = () => setCurrentDate((d) => subMonths(d, 1));
  const goNext = () => setCurrentDate((d) => addMonths(d, 1));
  const goToday = () => setCurrentDate(new Date());

  // ===================== ✅ Attendance Summary (ใช้ activeTeamAttendance) =====================
  const attendanceSummary = useMemo(() => {
    const total = activeTeamAttendance.length;

    let checkedIn = 0;
    let late = 0;
    let checkedOut = 0;

    activeTeamAttendance.forEach((r) => {
      const inRaw = r.checkInTimeDisplay || r.checkInTime || r.checkIn || null;
      const outRaw = r.checkOutTimeDisplay || r.checkOutTime || r.checkOut || null;

      const inTime = normalizeTime(inRaw);
      const state = getAttendanceState({ checkInTime: inRaw, checkOutTime: outRaw });

      if (state === "IN") checkedIn += 1;
      if (state === "OUT") checkedOut += 1;

      if (isLate(state, inTime)) late += 1;
    });

    return { total, checkedIn, late, checkedOut };
  }, [activeTeamAttendance]);

  // ===================== ✅ HR Actions =====================
  const handleHRCheckIn = async (employeeId) => {
    try {
      setActionLoading((p) => ({ ...p, [employeeId]: "in" }));
      await hrCheckInEmployee(employeeId);
      await fetchTeamAttendance();
    } catch (e) {
      console.error("HR check-in failed:", e);
    } finally {
      setActionLoading((p) => ({ ...p, [employeeId]: null }));
    }
  };

  const handleHRCheckOut = async (employeeId) => {
    try {
      setActionLoading((p) => ({ ...p, [employeeId]: "out" }));
      await hrCheckOutEmployee(employeeId);
      await fetchTeamAttendance();
    } catch (e) {
      console.error("HR check-out failed:", e);
    } finally {
      setActionLoading((p) => ({ ...p, [employeeId]: null }));
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {/* ===== Top Header Row: Month + Year ===== */}
        <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="text-4xl sm:text-6xl font-black text-slate-900 leading-none">
              {format(currentDate, "MMMM")}
            </div>
            <div className="text-4xl sm:text-6xl font-black text-slate-900 leading-none">
              {format(currentDate, "yyyy")}
            </div>
          </div>
        </div>

        {/* ===== Controls Row ===== */}
        <div className="px-6 sm:px-8 pb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleShowTodayLeaves}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-lg shadow-indigo-200 transition-all active:scale-95"
              >
                <CalendarIcon size={18} />
                Today’s Overview ({todayCount})
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <LegendDot color="bg-rose-400" label="Sick" />
                <LegendDot color="bg-sky-400" label="Personal" />
                <LegendDot color="bg-emerald-400" label="Annual" />
                <LegendDot color="bg-yellow-400" label="Emergency" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-2">
                <button
                  onClick={goPrev}
                  className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-slate-800 font-black hover:bg-gray-50 transition active:scale-[0.98]"
                  title="Previous"
                >
                  {"<"}
                </button>
                <button
                  onClick={goToday}
                  className="h-10 px-5 rounded-xl bg-white border border-gray-200 text-slate-800 font-black hover:bg-gray-50 transition active:scale-[0.98]"
                >
                  Today
                </button>
                <button
                  onClick={goNext}
                  className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-slate-800 font-black hover:bg-gray-50 transition active:scale-[0.98]"
                  title="Next"
                >
                  {">"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Calendar Grid ===== */}
        <div className="p-4 sm:p-6">
          <div className="border border-gray-100 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-100 bg-white">
              {weekHeaders.map((d) => (
                <div key={d} className="py-2 text-center text-[11px] font-black text-slate-700">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 bg-white">
              {calendarDays.map((day) => {
                const dayLeaves = leaves.filter((leaf) => isSameDay(leaf.date, day));
                const inMonth = isSameMonth(day, currentDate);
                const dow = day.getDay();
                const weekendBg = weekendBgByDow(dow);

                return (
                  <div
                    key={day.toString()}
                    onClick={() => handleDayClick(day)}
                    className={[
                      "min-h-[115px] p-2 border-r border-b border-gray-100 cursor-pointer transition-all group",
                      inMonth ? "bg-white" : "bg-gray-50/50 opacity-60",
                      weekendBg,
                      "hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between">
                      <span
                        className={[
                          "text-[12px] font-black w-9 h-9 rounded-2xl flex items-center justify-center",
                          isToday(day)
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                            : "text-slate-500 group-hover:text-slate-900",
                        ].join(" ")}
                      >
                        {format(day, "d")}
                      </span>
                    </div>

                    {loading ? (
                      <div className="mt-2 text-[10px] text-gray-300 font-bold">loading...</div>
                    ) : (
                      <div className="mt-2 space-y-1">
                        {dayLeaves.slice(0, 3).map((leaf) => {
                          const theme = leaveTheme(leaf.type);

                          return (
                            <div
                              key={leaf.id}
                              className={[
                                "text-[10px] px-2 py-1 rounded-lg border flex items-center gap-2 truncate font-bold",
                                theme.border,
                                theme.bg,
                                theme.text,
                              ].join(" ")}
                              title={`${leaf.name} • ${leaf.type} • ${leaf.status}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                              <span className="truncate">{leaf.name}</span>
                            </div>
                          );
                        })}
                        {dayLeaves.length > 3 && (
                          <div className="text-[10px] text-indigo-600 font-black pl-1">
                            +{dayLeaves.length - 3} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ===================== ✅ TEAM CHECK-IN/OUT PANEL ===================== */}
        <div className="px-4 sm:px-6 pb-6">
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-gray-100 flex items-center justify-center">
                  <Users className="text-slate-600" size={20} />
                </div>
                <div>
                  <div className="text-sm font-black uppercase tracking-widest text-slate-800">
                    Team Check-in / Check-out (Today)
                  </div>
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    Total {attendanceSummary.total} • Checked-in {attendanceSummary.checkedIn} • Late{" "}
                    {attendanceSummary.late} • Checked-out {attendanceSummary.checkedOut}
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SummaryCard
                title="Checked In"
                value={attendanceSummary.checkedIn}
                icon={<LogIn size={18} className="text-emerald-600" />}
              />
              <SummaryCard
                title="Late (มาสาย)"
                value={attendanceSummary.late}
                icon={<Clock size={18} className="text-rose-600" />}
              />
              <SummaryCard
                title="Checked Out"
                value={attendanceSummary.checkedOut}
                icon={<LogOut size={18} className="text-slate-600" />}
              />
            </div>

            {/* Table */}
            <div className="overflow-x-auto border-t border-gray-50">
              <table className="w-full text-left">
                <thead className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">In</th>
                    <th className="px-6 py-4">Out</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="text-[11px] font-bold">
                  {attLoading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-10 text-center text-gray-400">
                        Loading attendance...
                      </td>
                    </tr>
                  ) : activeTeamAttendance.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-10 text-center text-gray-400 italic">
                        No active employee attendance data
                      </td>
                    </tr>
                  ) : (
                    pagedTeamAttendance.map((row, idx) => {
                      const employeeId = row.employeeId ?? row.id ?? idx;

                      const name =
                        row.fullName ||
                        row.name ||
                        `${row.firstName || ""} ${row.lastName || ""}`.trim() ||
                        "Unknown";

                      const role = row.role || row.position || "-";

                      const inRaw = row.checkInTimeDisplay || row.checkInTime || row.checkIn || null;
                      const outRaw =
                        row.checkOutTimeDisplay || row.checkOutTime || row.checkOut || null;

                      const inTime = normalizeTime(inRaw);
                      const outTime = normalizeTime(outRaw);

                      const state = getAttendanceState({ checkInTime: inRaw, checkOutTime: outRaw });
                      const busy = actionLoading[employeeId];

                      const lateFlag = isLate(state, inTime);
                      const statusText = lateFlag ? "LATE" : labelByAttendance(state);
                      const statusClass = lateFlag
                        ? "bg-rose-50 text-rose-600 border-rose-100"
                        : badgeByAttendance(state);

                      return (
                        <tr
                          key={employeeId}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-6 py-4 text-slate-800">{name}</td>

                          <td className="px-6 py-4 text-gray-500">{role}</td>

                          <td className="px-6 py-4">
                            <span className="text-emerald-600">{inTime || "--:--"}</span>
                          </td>

                          <td className="px-6 py-4">
                            <span className="text-rose-500">{outTime || "--:--"}</span>
                          </td>

                          <td className="px-6 py-4 text-center">
                            <span
                              className={`px-3 py-1.5 rounded-xl border text-[10px] uppercase font-black tracking-widest ${statusClass}`}
                            >
                              {statusText}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleHRCheckIn(employeeId)}
                                disabled={state !== "NOT_IN" || !!busy}
                                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all active:scale-95
                                  ${
                                    state !== "NOT_IN" || busy
                                      ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                                  }`}
                              >
                                <LogIn size={14} />
                                {busy === "in" ? "Saving..." : "Check In"}
                              </button>

                              <button
                                onClick={() => handleHRCheckOut(employeeId)}
                                disabled={state !== "IN" || !!busy}
                                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all active:scale-95
                                  ${
                                    state !== "IN" || busy
                                      ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                                      : "bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100"
                                  }`}
                              >
                                <LogOut size={14} />
                                {busy === "out" ? "Saving..." : "Check Out"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* ✅ Pagination Bar (ใช้ activeTeamAttendance) */}
              {!attLoading && activeTeamAttendance.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Showing{" "}
                    {Math.min((teamPage - 1) * PAGE_SIZE + 1, activeTeamAttendance.length)}-
                    {Math.min(teamPage * PAGE_SIZE, activeTeamAttendance.length)} of{" "}
                    {activeTeamAttendance.length}
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setTeamPage(1)}
                      disabled={teamPage === 1}
                      className={`h-9 px-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition
                        ${
                          teamPage === 1
                            ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                            : "bg-white text-slate-700 border-gray-200 hover:bg-gray-50"
                        }`}
                      title="First"
                    >
                      {"<<"}
                    </button>

                    <button
                      onClick={() => setTeamPage((p) => Math.max(1, p - 1))}
                      disabled={teamPage === 1}
                      className={`h-9 px-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition
                        ${
                          teamPage === 1
                            ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                            : "bg-white text-slate-700 border-gray-200 hover:bg-gray-50"
                        }`}
                      title="Previous"
                    >
                      {"<"}
                    </button>

                    <div className="h-9 px-4 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-[10px] font-black text-slate-700 uppercase tracking-widest">
                      Page {teamPage} / {totalTeamPages}
                    </div>

                    <button
                      onClick={() => setTeamPage((p) => Math.min(totalTeamPages, p + 1))}
                      disabled={teamPage === totalTeamPages}
                      className={`h-9 px-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition
                        ${
                          teamPage === totalTeamPages
                            ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                            : "bg-white text-slate-700 border-gray-200 hover:bg-gray-50"
                        }`}
                      title="Next"
                    >
                      {">"}
                    </button>

                    <button
                      onClick={() => setTeamPage(totalTeamPages)}
                      disabled={teamPage === totalTeamPages}
                      className={`h-9 px-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition
                        ${
                          teamPage === totalTeamPages
                            ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                            : "bg-white text-slate-700 border-gray-200 hover:bg-gray-50"
                        }`}
                      title="Last"
                    >
                      {">>"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 pt-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              * Late rule: after {SHIFT_START}, NOT checked-in is counted as late.
            </div>
          </div>
        </div>
        {/* ===================== END PANEL ===================== */}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setShowModal(false)}
          />
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in duration-300">
            <div className="p-8 pb-4 flex justify-between items-center">
              <div>
                <h3 className="font-black text-gray-900 text-2xl tracking-tight">Daily Details</h3>
                <p className="text-blue-600 text-sm font-black uppercase tracking-widest mt-1">
                  {format(selectedDate, "dd MMMM yyyy")}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 bg-gray-100 hover:bg-rose-50 hover:text-rose-500 rounded-full transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 pt-4 space-y-3 max-h-[50vh] overflow-y-auto">
              {modalLeaves.length > 0 ? (
                modalLeaves.map((leaf) => (
                  <div
                    key={leaf.id}
                    className="flex justify-between items-center p-4 rounded-2xl border border-gray-50 bg-gray-50/30 shadow-sm hover:shadow-md transition-all"
                  >
                    <div>
                      <div className="font-black text-gray-800 text-base">{leaf.name}</div>
                      <div className="text-[10px] text-gray-400 uppercase font-black tracking-tighter mt-0.5">
                        {leaf.type} Leave
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {leaf.status === "Approved" && (
                        <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                          <CheckCircle2 size={10} /> APPROVED
                        </span>
                      )}
                      {leaf.status === "Rejected" && (
                        <span className="flex items-center gap-1 text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">
                          <XCircle size={10} /> REJECTED
                        </span>
                      )}
                      {leaf.status === "Pending" && (
                        <span className="flex items-center gap-1 text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                          <Clock size={10} /> PENDING
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                  <div className="bg-white w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <CalendarIcon className="text-gray-300" size={32} />
                  </div>
                  <p className="font-bold text-gray-400">No leave requests for this date</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-gray-50 border border-gray-100">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-xs font-black text-slate-700">{label}</span>
    </div>
  );
}

function SummaryCard({ title, value, icon }) {
  return (
    <div className="bg-white p-5 rounded-[1.75rem] shadow-sm border border-gray-100 flex items-center justify-between">
      <div>
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          {title}
        </div>
        <div className="text-2xl font-black text-slate-800 tracking-tighter mt-1">{value}</div>
      </div>
      <div className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
        {icon}
      </div>
    </div>
  );
}
