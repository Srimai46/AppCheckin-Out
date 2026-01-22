// src/pages/teamCalendar/components/TeamAttendancePanel.jsx
import React, { useMemo, useState } from "react";
import {
  Users,
  LogIn,
  LogOut,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { PAGE_SIZE } from "../constants";
import { normalizeTime, getAttendanceState, badgeByInStatus } from "../utils";
import SummaryCard from "./SummaryCard";
import RoleDropdown from "./RoleDropdown";
import DepartmentDropdown from "./DepartmentDropdown";

export default function TeamAttendancePanel({
  att,
  roleOpen,
  setRoleOpen,
  safeTotalPages,
  pageNumbers,
}) {
  const { t } = useTranslation();

  const {
    attLoading,
    actionLoading,

    // filters
    roleFilter,
    setRoleFilter,
    roles, // ✅ from hook

    deptFilter,
    setDeptFilter,
    departments, // ✅ from hook

    searchTerm,
    setSearchTerm,

    // paging/data
    teamPage,
    setTeamPage,
    filteredTeamAttendance,
    pagedTeamAttendance,
    activeTeamAttendance,
    attendanceSummary,

    // actions
    handleHRCheckIn,
    handleHRCheckOut,
  } = att;

  // ✅ dropdown opens (local)
  const [deptOpen, setDeptOpen] = useState(false);

  // ✅ กันเคส parent ไม่ส่ง roleOpen/setRoleOpen มา
  const [roleOpenLocal, setRoleOpenLocal] = useState(false);
  const roleOpenState = typeof roleOpen === "boolean" ? roleOpen : roleOpenLocal;
  const setRoleOpenState = typeof setRoleOpen === "function" ? setRoleOpen : setRoleOpenLocal;

  const canPrev = teamPage > 1;
  const canNext = teamPage < safeTotalPages;

  const goPrev = () => canPrev && setTeamPage((p) => p - 1);
  const goNext = () => canNext && setTeamPage((p) => p + 1);
  const goTo = (n) => setTeamPage(Math.min(Math.max(1, n), safeTotalPages));

  const getInBadgeKey = (statusStr) => {
    if (!statusStr) return "WAITING";
    if (statusStr === "On Time") return "ON_TIME";
    if (statusStr === "On Time (Morning)") return "ON_TIME";
    if (statusStr === "Late") return "LATE";
    if (String(statusStr).includes("Leave")) return "LEAVE";
    if (statusStr === "Waiting") return "WAITING";
    return "NORMAL";
  };

  const translateInStatus = (statusStr) => {
    const s = String(statusStr || "Waiting");
    const key =
      s === "On Time" || s === "On Time (Morning)"
        ? "onTime"
        : s === "Late"
        ? "late"
        : s.includes("Leave")
        ? "leave"
        : s === "Waiting"
        ? "waiting"
        : "normal";
    return t(`teamCalendar.attendance.statusIn.${key}`);
  };

  const translateOutStatus = (statusStr) => {
    const s = String(statusStr || "-");
    if (s === "-" || s === "N/A")
      return t("teamCalendar.attendance.statusOut.none");
    const key =
      s === "Early Leave"
        ? "earlyLeave"
        : s === "Normal"
        ? "normal"
        : s === "No Check-out"
        ? "noCheckout"
        : s.includes("Leave")
        ? "leave"
        : "normal";
    return t(`teamCalendar.attendance.statusOut.${key}`);
  };

  const outBadgeStyleByText = (outStatusText) => {
    if (String(outStatusText) === "Early Leave")
      return "bg-amber-50 text-amber-600 border-amber-100";
    if (String(outStatusText) === "No Check-out")
      return "bg-slate-50 text-slate-500 border-slate-100";
    if (String(outStatusText).includes("Leave"))
      return "bg-sky-50 text-sky-700 border-sky-100";
    if (String(outStatusText) === "-" || String(outStatusText) === "N/A")
      return "bg-gray-50 text-gray-500 border-gray-100";
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  };

  const summaryLine = useMemo(() => {
    const total = attendanceSummary?.total ?? 0;
    const checkedIn = attendanceSummary?.checkedIn ?? 0;
    const late = attendanceSummary?.late ?? 0;
    const checkedOut = attendanceSummary?.checkedOut ?? 0;

    return t("teamCalendar.attendance.subtitle", {
      total,
      checkedIn,
      late,
      checkedOut,
    });
  }, [attendanceSummary, t]);

  return (
    <div className="overflow-hidden mt-28">
      {/* Header & Summary */}
      <div className="p-6 border-b border-gray-50 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-600 border border-gray-100 flex items-center justify-center">
            <Users className="text-slate-50" size={20} />
          </div>
          <div>
            <div className="text-4xl font-black uppercase tracking-widest text-slate-800">
              {t("teamCalendar.attendance.title")}
            </div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              {summaryLine}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          title={t("teamCalendar.attendance.cards.checkedIn")}
          value={attendanceSummary?.checkedIn ?? 0}
          icon={<LogIn size={18} className="text-emerald-600" />}
        />
        <SummaryCard
          title={t("teamCalendar.attendance.cards.late")}
          value={attendanceSummary?.late ?? 0}
          icon={<Clock size={18} className="text-rose-600" />}
        />
        <SummaryCard
          title={t("teamCalendar.attendance.cards.checkedOut")}
          value={attendanceSummary?.checkedOut ?? 0}
          icon={<LogOut size={18} className="text-slate-600" />}
        />
      </div>

      {/* Filters */}
      <div className="px-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <DepartmentDropdown
            value={deptFilter || "ALL"}
            onChange={(v) => setDeptFilter?.(v)}
            items={departments || []}
            open={deptOpen}
            setOpen={setDeptOpen}
            widthClass="w-full sm:w-[240px]"
            size="md"
          />

          {/* ✅ IMPORTANT: ส่ง items={roles} เพื่อให้ role ขึ้นจาก DB */}
          <RoleDropdown
            value={roleFilter || "ALL"}
            onChange={(v) => setRoleFilter?.(v)}
            items={roles || []}
            open={roleOpenState}
            setOpen={setRoleOpenState}
            widthClass="w-full sm:w-[220px]"
            size="md"
          />

          <div className="w-full sm:flex-1">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("teamCalendar.attendance.searchPlaceholder")}
              className="w-full h-11 px-5 rounded-2xl bg-white border border-gray-200 shadow-sm text-slate-800 font-black text-[12px] placeholder:text-gray-400 placeholder:font-black outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border-t border-gray-50">
        <table className="w-full text-left">
          <thead className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50">
            <tr>
              <th className="px-6 py-4">{t("teamCalendar.attendance.table.employee")}</th>
              <th className="px-6 py-4">{t("teamCalendar.attendance.table.role")}</th>
              <th className="px-6 py-4">{t("teamCalendar.attendance.table.in")}</th>
              <th className="px-6 py-4">{t("teamCalendar.attendance.table.out")}</th>
              <th className="px-6 py-4 text-center">{t("teamCalendar.attendance.table.statusIn")}</th>
              <th className="px-6 py-4 text-center">{t("teamCalendar.attendance.table.statusOut")}</th>
              <th className="px-6 py-4 text-right">{t("teamCalendar.attendance.table.actions")}</th>
            </tr>
          </thead>

          <tbody className="text-[11px] font-bold">
            {attLoading ? (
              <tr>
                <td colSpan="7" className="px-6 py-10 text-center text-gray-400">
                  {t("teamCalendar.attendance.loading")}
                </td>
              </tr>
            ) : (activeTeamAttendance || []).length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-10 text-center text-gray-400 italic">
                  {t("teamCalendar.attendance.empty.activeNone")}
                </td>
              </tr>
            ) : (filteredTeamAttendance || []).length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-10 text-center text-gray-400 italic">
                  {t("teamCalendar.attendance.empty.noMatch")}
                </td>
              </tr>
            ) : (
              (pagedTeamAttendance || []).map((row, idx) => {
                const employeeId = row.employeeId ?? row.id ?? idx;

                const name =
                  row.fullName ||
                  row.name ||
                  `${row.firstName || ""} ${row.lastName || ""}`.trim() ||
                  t("teamCalendar.attendance.unknown");

                const deptName =
                  row.departmentName ||
                  row.department?.name ||
                  row.department ||
                  row.deptName ||
                  "-";

                const role = row.roleName || row.role?.name || row.role || row.position || "-";

                const inRaw = row.checkInTimeDisplay || row.checkInTime || row.checkIn || null;
                const outRaw = row.checkOutTimeDisplay || row.checkOutTime || row.checkOut || null;

                const inTime = normalizeTime(inRaw);
                const outTime = normalizeTime(outRaw);

                const busy = actionLoading?.[employeeId];
                const state = getAttendanceState({ checkInTime: inRaw, checkOutTime: outRaw });

                const inStatusText = row.inStatus || "Waiting";
                const outStatusText = row.outStatus || "-";

                const inBadgeKey = getInBadgeKey(inStatusText);
                const outBadgeStyle = outBadgeStyleByText(outStatusText);

                return (
                  <tr
                    key={employeeId}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-slate-800">
                      <div className="flex items-center gap-2">
                        <span>{name}</span>
                        {deptName && deptName !== "-" && (
                          <span className="px-2 py-1 rounded-xl border text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-600 border-slate-100">
                            {deptName}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-gray-500">{role}</td>

                    <td className="px-6 py-4">
                      <span className="text-emerald-600">{inTime || "--:--"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-rose-500">{outTime || "--:--"}</span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-3 py-1.5 rounded-xl border text-[10px] uppercase font-black tracking-widest ${badgeByInStatus(
                          inBadgeKey
                        )}`}
                      >
                        {translateInStatus(inStatusText)}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-3 py-1.5 rounded-xl border text-[10px] uppercase font-black tracking-widest ${outBadgeStyle}`}
                      >
                        {translateOutStatus(outStatusText)}
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
                          {busy === "in"
                            ? t("teamCalendar.attendance.buttons.saving")
                            : t("teamCalendar.attendance.buttons.checkIn")}
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
                          {busy === "out"
                            ? t("teamCalendar.attendance.buttons.saving")
                            : t("teamCalendar.attendance.buttons.checkOut")}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {!attLoading && (filteredTeamAttendance || []).length > 0 && (
          <div className="px-6 py-4 border-t border-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {t("teamCalendar.attendance.pagination.label", {
                page: teamPage,
                totalPages: safeTotalPages,
                start: Math.min((teamPage - 1) * PAGE_SIZE + 1, filteredTeamAttendance.length),
                end: Math.min(teamPage * PAGE_SIZE, filteredTeamAttendance.length),
                total: filteredTeamAttendance.length,
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goPrev}
                disabled={!canPrev}
                className={`h-9 px-4 rounded-3xl border font-black text-[10px] uppercase tracking-widest inline-flex items-center gap-2 transition-all active:scale-95
                  ${
                    canPrev
                      ? "border-gray-200 bg-white text-slate-700 hover:bg-gray-50"
                      : "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                  }`}
              >
                <ChevronLeft size={14} /> {t("common.prev")}
              </button>

              <div className="flex items-center gap-1">
                {pageNumbers.map((p, idx) =>
                  p === "..." ? (
                    <span key={`dots-${idx}`} className="px-2 text-gray-300 font-black text-[12px]">
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => goTo(p)}
                      className={`h-9 min-w-[38px] px-3 rounded-3xl border font-black text-[10px] uppercase tracking-widest transition-all active:scale-95
                        ${
                          p === teamPage
                            ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                            : "border-gray-200 bg-white text-slate-700 hover:bg-gray-50"
                        }`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>

              <button
                type="button"
                onClick={goNext}
                disabled={!canNext}
                className={`h-9 px-4 rounded-3xl border font-black text-[10px] uppercase tracking-widest inline-flex items-center gap-2 transition-all active:scale-95
                  ${
                    canNext
                      ? "border-gray-200 bg-white text-slate-700 hover:bg-gray-50"
                      : "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                  }`}
              >
                {t("common.next")} <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
