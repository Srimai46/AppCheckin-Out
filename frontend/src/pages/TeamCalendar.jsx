// frontend/src/pages/TeamCalendar.jsx
import React, { useState, useMemo } from "react";
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
  addDays,
  subDays,
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
  Image as ImageIcon,
  MessageCircle,
  Info,
  Star,
} from "lucide-react";

import { updateLeaveStatus, grantSpecialLeave } from "../api/leaveService";
import { alertConfirm, alertSuccess, alertError } from "../utils/sweetAlert";
import { openAttachment } from "../utils/attachmentPreview";

// ===== teamCalendar modules =====
import { WEEK_HEADERS, LEAVE_TYPE_FILTERS, SHIFT_START, PAGE_SIZE } from "./teamCalendar/constants";
import {
  matchLeaveType,
  normalizeTime,
  getAttendanceState,
  isLate,
  badgeByAttendance,
  labelByAttendance,
  leaveTheme,
  typeBadgeTheme,
  buildRowName,
  buildDurationText,
  weekendBgByDow,
} from "./teamCalendar/utils";

import useLeaves from "./teamCalendar/hooks/useLeaves";
import useTeamAttendanceToday from "./teamCalendar/hooks/useTeamAttendanceToday";
import useModalAttendance from "./teamCalendar/hooks/useModalAttendance";

import SummaryCard from "./teamCalendar/components/SummaryCard";
import Pill from "./teamCalendar/components/Pill";
import TabButton from "./teamCalendar/components/TabButton";
import RoleDropdown from "./teamCalendar/components/RoleDropdown";

export default function TeamCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());

  // ===== Leaves (hook) =====
  const { leaves, loading, refetchLeaves } = useLeaves();

  // ===== Leave Type Filters =====
  const [selectedTypes, setSelectedTypes] = useState([]); // [] = show all

  // ===== ✅ BIG MODAL (Daily Details) =====
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalTab, setModalTab] = useState("PENDING"); // PENDING | APPROVED | REJECTED

  // ===== ✅ Modal Filters =====
  const [modalRoleFilter, setModalRoleFilter] = useState("ALL"); // ALL | HR | WORKER
  const [modalSearch, setModalSearch] = useState("");
  const [modalRoleOpen, setModalRoleOpen] = useState(false);

  // ===== ✅ Today Attendance (hook) =====
  const att = useTeamAttendanceToday();
  const {
    attLoading,
    actionLoading,
    roleFilter,
    setRoleFilter,
    searchTerm,
    setSearchTerm,
    teamPage,
    setTeamPage,
    totalTeamPages,
    filteredTeamAttendance,
    pagedTeamAttendance,
    activeTeamAttendance,
    attendanceSummary,
    handleHRCheckIn,
    handleHRCheckOut,
  } = att;

  const [roleOpen, setRoleOpen] = useState(false);

  // ===== ✅ Modal Attendance (hook) =====
  const { modalAttendance, modalAttLoading, fetchModalAttendance } = useModalAttendance();

  // ===================== Calendar days =====================
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 }),
  });

  // ===================== Today’s Overview count =====================
  const todayCount = useMemo(() => {
    const today = new Date();
    return leaves.filter((l) => {
      if (!isSameDay(l.date, today)) return false;
      if (selectedTypes.length === 0) return true;
      return selectedTypes.some((f) => matchLeaveType(l.type, f));
    }).length;
  }, [leaves, selectedTypes]);

  const goPrev = () => setCurrentDate((d) => subMonths(d, 1));
  const goNext = () => setCurrentDate((d) => addMonths(d, 1));
  const goToday = () => setCurrentDate(new Date());

  // ===================== Modal: leaves for selected day =====================
  const leavesOfSelectedDay = useMemo(() => {
    const dayKey = format(selectedDate, "yyyy-MM-dd");
    return leaves.filter((leaf) => {
      if (leaf.dateKey !== dayKey) return false;
      if (selectedTypes.length === 0) return true;
      return selectedTypes.some((f) => matchLeaveType(leaf.type, f));
    });
  }, [leaves, selectedDate, selectedTypes]);

  const pendingLeavesOfDay = useMemo(
    () => leavesOfSelectedDay.filter((l) => String(l.status || "").toLowerCase() === "pending"),
    [leavesOfSelectedDay]
  );
  const approvedLeavesOfDay = useMemo(
    () => leavesOfSelectedDay.filter((l) => String(l.status || "").toLowerCase() === "approved"),
    [leavesOfSelectedDay]
  );
  const rejectedLeavesOfDay = useMemo(
    () => leavesOfSelectedDay.filter((l) => String(l.status || "").toLowerCase() === "rejected"),
    [leavesOfSelectedDay]
  );

  const modalRows = useMemo(() => {
    if (modalTab === "APPROVED") return approvedLeavesOfDay;
    if (modalTab === "REJECTED") return rejectedLeavesOfDay;
    return pendingLeavesOfDay;
  }, [modalTab, pendingLeavesOfDay, approvedLeavesOfDay, rejectedLeavesOfDay]);

  const filteredModalRows = useMemo(() => {
    const term = String(modalSearch || "").trim().toLowerCase();

    return (modalRows || []).filter((leaf) => {
      const roleRaw = String(
        leaf?.employee?.role || leaf?.employee?.position || leaf?.role || leaf?.position || ""
      ).toUpperCase();

      if (modalRoleFilter !== "ALL") {
        const want = modalRoleFilter === "WORKER" ? "WORKER" : "HR";
        if (roleRaw !== want) return false;
      }

      if (!term) return true;

      const name = String(
        leaf?.name ||
          leaf?.employee?.fullName ||
          `${leaf?.employee?.firstName || ""} ${leaf?.employee?.lastName || ""}`.trim() ||
          ""
      ).toLowerCase();

      const email = String(leaf?.employee?.email || leaf?.email || "").toLowerCase();
      const id = String(leaf?.employeeId ?? leaf?.employee?.id ?? leaf?.id ?? "").toLowerCase();

      return name.includes(term) || email.includes(term) || id.includes(term);
    });
  }, [modalRows, modalRoleFilter, modalSearch]);

  // ===================== Modal open / shift day =====================
  const resetModalFilters = () => {
    setModalTab("PENDING");
    setModalRoleFilter("ALL");
    setModalSearch("");
    setModalRoleOpen(false);
  };

  const handleDayClick = async (day) => {
    setSelectedDate(day);
    resetModalFilters();
    setShowModal(true);
    await fetchModalAttendance(day);
  };

  const handleShowTodayLeaves = () => handleDayClick(new Date());

  const shiftModalDay = async (diff) => {
    const next = diff > 0 ? addDays(selectedDate, diff) : subDays(selectedDate, Math.abs(diff));
    setSelectedDate(next);
    resetModalFilters();
    await fetchModalAttendance(next);
  };

  const goModalToday = async () => {
    const t = new Date();
    setSelectedDate(t);
    resetModalFilters();
    await fetchModalAttendance(t);
  };

  // ===================== Modal Summary =====================
  const modalActiveEmployees = useMemo(() => {
    return (modalAttendance || []).filter((r) => r?.isActive === true || r?.isActive === 1);
  }, [modalAttendance]);

  const modalOnLeaveEmployeeIds = useMemo(() => {
    const set = new Set();
    approvedLeavesOfDay.forEach((l) => {
      const id = l.employeeId ?? l.employee?.id ?? null;
      if (id != null) set.add(String(id));
    });
    return set;
  }, [approvedLeavesOfDay]);

  const modalSummary = useMemo(() => {
    const isForToday = isSameDay(selectedDate, new Date());

    let checkedIn = 0;
    let late = 0;
    let absent = 0;

    const rows = modalActiveEmployees || [];
    rows.forEach((r) => {
      const inRaw = r.checkInTimeDisplay || r.checkInTime || r.checkIn || null;
      const outRaw = r.checkOutTimeDisplay || r.checkOutTime || r.checkOut || null;

      const inTime = normalizeTime(inRaw);
      const state = getAttendanceState({ checkInTime: inRaw, checkOutTime: outRaw });

      if (state === "IN" || state === "OUT") checkedIn += 1;
      if (state === "NOT_IN") absent += 1;

      if (isLate(state, inTime, isForToday)) late += 1;
    });

    const onLeave = modalOnLeaveEmployeeIds.size;

    // adjust absent if someone is NOT_IN but on approved leave
    if (rows.length > 0 && onLeave > 0) {
      let leaveAndAbsent = 0;
      rows.forEach((r) => {
        const id = String(r.employeeId ?? r.id ?? "");
        if (!id) return;

        const inRaw = r.checkInTimeDisplay || r.checkInTime || r.checkIn || null;
        const outRaw = r.checkOutTimeDisplay || r.checkOutTime || r.checkOut || null;
        const state = getAttendanceState({ checkInTime: inRaw, checkOutTime: outRaw });

        if (state === "NOT_IN" && modalOnLeaveEmployeeIds.has(id)) leaveAndAbsent += 1;
      });
      absent = Math.max(0, absent - leaveAndAbsent);
    }

    return { checkedIn, late, absent, onLeave };
  }, [modalActiveEmployees, modalOnLeaveEmployeeIds, selectedDate]);

  // ===================== Modal Leave Actions =====================
  const handleLeaveActionInModal = async (mode, leaf) => {
    if (!leaf?.id) return;

    const actionText =
      mode === "Special"
        ? "Special Approval (Non-deductible)"
        : mode === "Approved"
        ? "Normal Approve"
        : "Reject";

    const ok = await alertConfirm(
      `Confirm ${actionText}`,
      `Process request of <b>${buildRowName(leaf)}</b> as <b>${actionText}</b>?`
    );
    if (!ok) return;

    try {
      if (mode === "Special") {
        await grantSpecialLeave({
          employeeId: leaf.employeeId ?? leaf.employee?.id,
          amount: leaf.totalDaysRequested ?? 1,
          reason: `Special Case Approval for: ${leaf.reason || leaf.note || "No reason"}`,
          year: new Date(leaf.startDate).getFullYear(),
          leaveRequestId: leaf.id,
        });
      } else {
        await updateLeaveStatus(leaf.id, mode);
      }

      await alertSuccess("Success", `Processed 1 request.`);
      await refetchLeaves();
    } catch (err) {
      alertError("Action Failed", err?.response?.data?.error || err?.response?.data?.message || err.message);
    }
  };

  // ===================== Calendar day badges =====================
  const calendarDayBadges = (day) => {
    const dayKey = format(day, "yyyy-MM-dd");
    const dayLeaves = leaves.filter((leaf) => {
      if (leaf.dateKey !== dayKey) return false;
      if (selectedTypes.length === 0) return true;
      return selectedTypes.some((f) => matchLeaveType(leaf.type, f));
    });

    const typeCounts = dayLeaves.reduce((acc, leaf) => {
      const t = String(leaf.type || "UNKNOWN").toUpperCase();
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});

    const typeBadges = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return { typeCounts, typeBadges };
  };

  // ===================== UI =====================
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
                {LEAVE_TYPE_FILTERS.map((item) => {
                  const active = selectedTypes.includes(item.key);

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setSelectedTypes((prev) =>
                          prev.includes(item.key)
                            ? prev.filter((t) => t !== item.key)
                            : [...prev, item.key]
                        )
                      }
                      className={`flex items-center gap-2 px-3 py-2 rounded-2xl border text-xs font-black transition-all
                        ${
                          active
                            ? "bg-white border-blue-400 ring-2 ring-blue-200 scale-[1.03]"
                            : "bg-gray-50 border-gray-100 opacity-60 hover:opacity-100"
                        }
                      `}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                      <span className="text-slate-700">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <div className="flex items-center gap-1">
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
          <div className="bg-white rounded-[2rem] border border-blue-200 ring-2 overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-100 bg-white">
              {WEEK_HEADERS.map((d) => (
                <div key={d} className="py-2 text-center text-[11px] font-black text-slate-700">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 bg-white">
              {calendarDays.map((day) => {
                const { typeCounts, typeBadges } = calendarDayBadges(day);

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
                        {typeBadges.map(([type, count]) => {
                          const theme = leaveTheme(type);
                          return (
                            <div
                              key={type}
                              className={[
                                "text-[10px] px-2 py-1 rounded-lg border flex items-center gap-2 truncate font-black uppercase tracking-widest",
                                theme.border,
                                theme.bg,
                                theme.text,
                              ].join(" ")}
                              title={`${type} • ${count}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                              <span className="truncate">
                                {type} • {count}
                              </span>
                            </div>
                          );
                        })}
                        {Object.keys(typeCounts).length > 3 && (
                          <div className="text-[10px] text-indigo-600 font-black pl-1 uppercase tracking-widest">
                            +{Object.keys(typeCounts).length - 3} types
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ===================== ✅ TEAM CHECK-IN/OUT PANEL (Today) ===================== */}
          <div className="overflow-hidden mt-28">
            <div className="p-6 border-b border-gray-50 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-600 border border-gray-100 flex items-center justify-center">
                  <Users className="text-slate-50" size={20} />
                </div>
                <div>
                  <div className="text-4xl font-black uppercase tracking-widest text-slate-800">
                    Team Check-in / Check-out (Today)
                  </div>
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    Total {attendanceSummary.total} • Checked-in {attendanceSummary.checkedIn} • Late{" "}
                    {attendanceSummary.late} • Checked-out {attendanceSummary.checkedOut}
                  </div>
                </div>
              </div>
            </div>

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

            <div className="px-6 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <RoleDropdown
                  value={roleFilter}
                  onChange={setRoleFilter}
                  open={roleOpen}
                  setOpen={setRoleOpen}
                  widthClass="w-full sm:w-[220px]"
                  size="md"
                  labels={{ ALL: "ALL ROLES", WORKER: "WORKER", HR: "HR" }}
                />

                <div className="w-full sm:flex-1">
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search name, email, ID..."
                    className="w-full h-11 px-5 rounded-2xl bg-white border border-gray-200 shadow-sm text-slate-800 font-black text-[12px] placeholder:text-gray-400 placeholder:font-black outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>
            </div>

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
                  ) : filteredTeamAttendance.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-10 text-center text-gray-400 italic">
                        No matching employees
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
                      const outRaw = row.checkOutTimeDisplay || row.checkOutTime || row.checkOut || null;

                      const inTime = normalizeTime(inRaw);
                      const outTime = normalizeTime(outRaw);

                      const state = getAttendanceState({ checkInTime: inRaw, checkOutTime: outRaw });
                      const busy = actionLoading[employeeId];

                      const lateFlag = isLate(state, inTime, true);
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
                                onClick={() => handleHRCheckIn(employeeId, name)}
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
                                onClick={() => handleHRCheckOut(employeeId, name)}
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

              {!attLoading && filteredTeamAttendance.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Showing{" "}
                    {Math.min((teamPage - 1) * PAGE_SIZE + 1, filteredTeamAttendance.length)}-
                    {Math.min(teamPage * PAGE_SIZE, filteredTeamAttendance.length)} of{" "}
                    {filteredTeamAttendance.length}
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
      </div>

      {/* ===================== ✅ BIG MODAL (Daily Details) ===================== */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setShowModal(false)}
          />

          <div className="relative w-full max-w-[1200px] max-h-[92vh] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
            {/* Top Bar */}
            <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-slate-100">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-4xl sm:text-5xl font-black text-slate-900 leading-none">
                    Daily Details
                  </div>
                  <div className="mt-2 text-[12px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    {format(selectedDate, "dd MMMM yyyy")}
                  </div>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 hover:bg-rose-50 hover:text-rose-600 transition flex items-center justify-center"
                  title="Close"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Summary + Day Nav */}
              <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill color="bg-emerald-100 text-emerald-700" label="Checked In" value={modalSummary.checkedIn} />
                  <Pill color="bg-rose-100 text-rose-700" label="Late" value={modalSummary.late} />
                  <Pill color="bg-slate-100 text-slate-700" label="Absent" value={modalSummary.absent} />
                  <Pill color="bg-sky-100 text-sky-700" label="On Leave" value={modalSummary.onLeave} />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => shiftModalDay(-1)}
                    className="w-11 h-11 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 transition font-black"
                  >
                    {"<"}
                  </button>

                  <button
                    onClick={goModalToday}
                    className="h-11 px-5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 transition font-black"
                  >
                    Today
                  </button>

                  <button
                    onClick={() => shiftModalDay(1)}
                    className="w-11 h-11 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 transition font-black"
                  >
                    {">"}
                  </button>
                </div>
              </div>

              {/* Tabs + Filters */}
              <div className="mt-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <TabButton
                    active={modalTab === "PENDING"}
                    onClick={() => {
                      setModalTab("PENDING");
                      setModalRoleOpen(false);
                    }}
                    label="Pending Approvals"
                    icon={<Clock size={14} />}
                  />
                  <TabButton
                    active={modalTab === "APPROVED"}
                    onClick={() => {
                      setModalTab("APPROVED");
                      setModalRoleOpen(false);
                    }}
                    label="Approved"
                    icon={<CheckCircle2 size={14} />}
                  />
                  <TabButton
                    active={modalTab === "REJECTED"}
                    onClick={() => {
                      setModalTab("REJECTED");
                      setModalRoleOpen(false);
                    }}
                    label="Rejected"
                    icon={<XCircle size={14} />}
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
                    <RoleDropdown
                      value={modalRoleFilter}
                      onChange={setModalRoleFilter}
                      open={modalRoleOpen}
                      setOpen={setModalRoleOpen}
                      widthClass="w-full sm:w-[180px]"
                      size="sm"
                      labels={{ ALL: "All Roles", WORKER: "Worker", HR: "HR" }}
                    />

                    <input
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                      placeholder="Search name, email, ID..."
                      className="w-full sm:w-[320px] h-11 px-4 rounded-2xl bg-white border border-slate-200
                                text-slate-800 font-black text-[11px]
                                placeholder:text-slate-300 placeholder:font-black
                                outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Table Area */}
            <div className="p-4 sm:p-6 overflow-auto max-h-[calc(92vh-240px)]">
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/80 border-b border-slate-100">
                      <tr>
                        <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">
                          Employee
                        </th>
                        <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">
                          Type
                        </th>
                        <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">
                          Note/Reason
                        </th>
                        <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">
                          Duration
                        </th>
                        <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">
                          Evidence
                        </th>
                        <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">
                          {modalTab === "APPROVED"
                            ? "Approved By"
                            : modalTab === "REJECTED"
                            ? "Rejected By"
                            : "Action"}
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-50">
                      {loading || modalAttLoading ? (
                        <tr>
                          <td colSpan="6" className="p-16 text-center font-black italic text-blue-500 animate-pulse">
                            SYNCHRONIZING DATA...
                          </td>
                        </tr>
                      ) : filteredModalRows.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-16 text-center text-slate-300 font-black uppercase text-sm">
                            No Data
                          </td>
                        </tr>
                      ) : (
                        filteredModalRows.map((leaf) => {
                          const name = buildRowName(leaf);
                          const type = String(leaf.type || "-");
                          const dur = buildDurationText(leaf);

                          const showHrName =
                            modalTab === "APPROVED"
                              ? leaf.approvedBy?.fullName ||
                                leaf.approvedBy?.name ||
                                (typeof leaf.approvedBy === "string" ? leaf.approvedBy : null)
                              : modalTab === "REJECTED"
                              ? leaf.rejectedBy?.fullName ||
                                leaf.rejectedBy?.name ||
                                (typeof leaf.rejectedBy === "string" ? leaf.rejectedBy : null)
                              : null;

                          return (
                            <tr key={leaf.id} className="hover:bg-slate-50/50 transition-all duration-200">
                              {/* Employee */}
                              <td className="p-5 min-w-[200px]">
                                <div className="font-black text-slate-700 leading-none tracking-tight">
                                  {name}
                                </div>
                                <div className="text-[9px] font-black text-slate-300 uppercase mt-1">
                                  Ref: #{leaf.id}
                                </div>
                              </td>

                              {/* Type */}
                              <td className="p-5">
                                <span
                                  className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${typeBadgeTheme(
                                    type
                                  )}`}
                                >
                                  {type}
                                </span>
                              </td>

                              {/* Note/Reason */}
                              <td className="p-5 min-w-[260px]">
                                <div className="flex flex-col gap-1">
                                  {leaf.reason && (
                                    <div
                                      className="flex items-start gap-1 text-slate-500 text-[11px] leading-tight"
                                      title={`Reason: ${leaf.reason}`}
                                    >
                                      <MessageCircle size={12} className="mt-0.5 shrink-0 text-slate-400" />
                                      <span className="truncate max-w-[240px]">{leaf.reason}</span>
                                    </div>
                                  )}
                                  {leaf.note && (
                                    <div
                                      className="flex items-start gap-1 text-amber-600 text-[11px] leading-tight"
                                      title={`Note: ${leaf.note}`}
                                    >
                                      <Info size={12} className="mt-0.5 shrink-0 text-amber-500" />
                                      <span className="truncate max-w-[240px]">{leaf.note}</span>
                                    </div>
                                  )}
                                  {!leaf.reason && !leaf.note && (
                                    <span className="text-slate-300 text-[10px] italic">-</span>
                                  )}
                                </div>
                              </td>

                              {/* Duration */}
                              <td className="p-5 min-w-[220px]">
                                <div className="text-[11px] font-bold text-slate-500 italic whitespace-nowrap">
                                  {dur.range}
                                </div>
                                <div className="font-black text-slate-800 text-sm mt-0.5">
                                  {dur.days || "-"}
                                </div>
                              </td>

                              {/* Evidence */}
                              <td className="p-5 text-center">
                                {leaf.attachmentUrl ? (
                                  <button
                                    onClick={() => openAttachment(leaf.attachmentUrl)}
                                    className="p-2 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-100 transition-all group"
                                    title="View Attachment"
                                  >
                                    <ImageIcon size={18} className="group-hover:scale-110 transition-transform" />
                                  </button>
                                ) : (
                                  <span className="text-[9px] font-black text-slate-200 uppercase tracking-widest italic">
                                    No File
                                  </span>
                                )}
                              </td>

                              {/* Action */}
                              <td className="p-5 text-center min-w-[220px]">
                                {modalTab === "PENDING" ? (
                                  <div className="flex justify-center gap-2">
                                    <button
                                      onClick={() => handleLeaveActionInModal("Approved", leaf)}
                                      className="flex items-center gap-2 px-3 py-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all border border-emerald-100"
                                      title="Approve"
                                    >
                                      <span className="text-sm font-medium">Approved</span>
                                    </button>

                                    <button
                                      onClick={() => handleLeaveActionInModal("Special", leaf)}
                                      className="flex items-center gap-2 px-3 py-2 text-purple-600 hover:bg-purple-50 rounded-xl transition-all border border-purple-100"
                                      title="Special Approval"
                                    >
                                      <Star size={16} />
                                      <span className="text-sm font-medium">Special</span>
                                    </button>

                                    <button
                                      onClick={() => handleLeaveActionInModal("Rejected", leaf)}
                                      className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-slate-100"
                                      title="Reject"
                                    >
                                      <span className="text-sm font-medium">Rejected</span>
                                    </button>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center justify-center px-4 py-2 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] font-black text-slate-700">
                                    {showHrName || "-"}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-4 text-[10px] text-slate-300 font-black uppercase tracking-widest">
                * Approved/Rejected tab will show HR name if backend provides approvedBy/rejectedBy.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
