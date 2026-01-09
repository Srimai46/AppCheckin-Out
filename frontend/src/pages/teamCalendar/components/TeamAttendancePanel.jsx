// src/pages/teamCalendar/components/TeamAttendancePanel.jsx
import React from "react";
import { Users, LogIn, LogOut, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { PAGE_SIZE } from "../constants";
import { normalizeTime, getAttendanceState, getInStatus, getOutStatus, badgeByInStatus, badgeByOutStatus, labelByInStatus, labelByOutStatus } from "../utils";
import SummaryCard from "./SummaryCard";
import RoleDropdown from "./RoleDropdown";

export default function TeamAttendancePanel({ att, roleOpen, setRoleOpen, safeTotalPages, pageNumbers }) {
  const {
    attLoading,
    actionLoading,
    roleFilter,
    setRoleFilter,
    searchTerm,
    setSearchTerm,
    teamPage,
    setTeamPage,
    filteredTeamAttendance,
    pagedTeamAttendance,
    activeTeamAttendance,
    attendanceSummary,
    handleHRCheckIn,
    handleHRCheckOut,
  } = att;

  const canPrev = teamPage > 1;
  const canNext = teamPage < safeTotalPages;

  const goPrev = () => canPrev && setTeamPage((p) => p - 1);
  const goNext = () => canNext && setTeamPage((p) => p + 1);
  const goTo = (n) => setTeamPage(Math.min(Math.max(1, n), safeTotalPages));

  return (
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
        <SummaryCard title="Checked In" value={attendanceSummary.checkedIn} icon={<LogIn size={18} className="text-emerald-600" />} />
        <SummaryCard title="Late (มาสาย)" value={attendanceSummary.late} icon={<Clock size={18} className="text-rose-600" />} />
        <SummaryCard title="Checked Out" value={attendanceSummary.checkedOut} icon={<LogOut size={18} className="text-slate-600" />} />
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
              <th className="px-6 py-4 text-center">Status In</th>
              <th className="px-6 py-4 text-center">Status Out</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="text-[11px] font-bold">
            {attLoading ? (
              <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-400">Loading attendance...</td></tr>
            ) : activeTeamAttendance.length === 0 ? (
              <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-400 italic">No active employee attendance data</td></tr>
            ) : filteredTeamAttendance.length === 0 ? (
              <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-400 italic">No matching employees</td></tr>
            ) : (
              pagedTeamAttendance.map((row, idx) => {
                const employeeId = row.employeeId ?? row.id ?? idx;
                const name = row.fullName || row.name || `${row.firstName || ""} ${row.lastName || ""}`.trim() || "Unknown";
                const role = row.role || row.position || "-";

                const inRaw = row.checkInTimeDisplay || row.checkInTime || row.checkIn || null;
                const outRaw = row.checkOutTimeDisplay || row.checkOutTime || row.checkOut || null;
                const inTime = normalizeTime(inRaw);
                const outTime = normalizeTime(outRaw);

                const busy = actionLoading[employeeId];
                const state = getAttendanceState({ checkInTime: inRaw, checkOutTime: outRaw });

                const inStatus = getInStatus(row, true);
                const outStatus = getOutStatus(row, true);

                return (
                  <tr key={employeeId} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-800">{name}</td>
                    <td className="px-6 py-4 text-gray-500">{role}</td>

                    <td className="px-6 py-4"><span className="text-emerald-600">{inTime || "--:--"}</span></td>
                    <td className="px-6 py-4"><span className="text-rose-500">{outTime || "--:--"}</span></td>

                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1.5 rounded-xl border text-[10px] uppercase font-black tracking-widest ${badgeByInStatus(inStatus)}`}>
                        {labelByInStatus(inStatus)}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1.5 rounded-xl border text-[10px] uppercase font-black tracking-widest ${badgeByOutStatus(outStatus)}`}>
                        {labelByOutStatus(outStatus)}
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
              Page {teamPage} / {safeTotalPages} • Showing{" "}
              <span className="text-slate-700">
                {Math.min((teamPage - 1) * PAGE_SIZE + 1, filteredTeamAttendance.length)}-
                {Math.min(teamPage * PAGE_SIZE, filteredTeamAttendance.length)}
              </span>{" "}
              of <span className="text-slate-700">{filteredTeamAttendance.length}</span>
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
                <ChevronLeft size={14} />
                Prev
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
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
