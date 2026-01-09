// src/pages/TeamCalendar.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  addDays,
  subDays,
  isSameDay,
} from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { LEAVE_TYPE_FILTERS, WEEK_HEADERS, SHIFT_START, PAGE_SIZE } from "./teamCalendar/constants";
import { matchLeaveType } from "./teamCalendar/utils";

import useLeaves from "./teamCalendar/hooks/useLeaves";
import useTeamAttendanceToday from "./teamCalendar/hooks/useTeamAttendanceToday";
import useModalAttendance from "./teamCalendar/hooks/useModalAttendance";

import { getPageNumbers, clamp } from "./teamCalendar/helpers/pagination";
import {
  countLeavesToday,
  leavesByDayAndType,
  splitLeavesByStatus,
  filterLeaveRows,
  buildModalSummary,
  buildOnLeaveIdSet,
} from "./teamCalendar/helpers/leaveSelectors";

import LeaveTypeFilters from "./teamCalendar/components/LeaveTypeFilters";
import CalendarGrid from "./teamCalendar/components/CalendarGrid";
import TeamAttendancePanel from "./teamCalendar/components/TeamAttendancePanel";
import DailyDetailsModal from "./teamCalendar/components/DailyDetailsModal";

export default function TeamCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Leaves
  const { leaves, loading, refetchLeaves } = useLeaves();
  const [selectedTypes, setSelectedTypes] = useState([]); // [] = all

  // Daily modal
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalTab, setModalTab] = useState("PENDING"); // PENDING | APPROVED | REJECTED
  const [modalRoleFilter, setModalRoleFilter] = useState("ALL");
  const [modalSearch, setModalSearch] = useState("");
  const [modalRoleOpen, setModalRoleOpen] = useState(false);

  // Today attendance (hook)
  const att = useTeamAttendanceToday();
  const [roleOpen, setRoleOpen] = useState(false);

  // Modal attendance (hook)
  const { modalAttendance, modalAttLoading, fetchModalAttendance } = useModalAttendance();

  // Calendar days
  const calendarDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 }),
        end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 }),
      }),
    [currentDate]
  );

  const todayCount = useMemo(
    () => countLeavesToday(leaves, selectedTypes, matchLeaveType),
    [leaves, selectedTypes]
  );

  // Month controls
  const goPrev = () => setCurrentDate((d) => subMonths(d, 1));
  const goNext = () => setCurrentDate((d) => addMonths(d, 1));
  const goToday = () => setCurrentDate(new Date());

  // Selected day leaves
  const leavesOfSelectedDay = useMemo(
    () => leavesByDayAndType(leaves, selectedDate, selectedTypes, matchLeaveType),
    [leaves, selectedDate, selectedTypes]
  );

  const { pending, approved, rejected } = useMemo(
    () => splitLeavesByStatus(leavesOfSelectedDay),
    [leavesOfSelectedDay]
  );

  const modalRows = useMemo(() => {
    if (modalTab === "APPROVED") return approved;
    if (modalTab === "REJECTED") return rejected;
    return pending;
  }, [modalTab, pending, approved, rejected]);

  const filteredModalRows = useMemo(
    () => filterLeaveRows(modalRows, modalRoleFilter, modalSearch),
    [modalRows, modalRoleFilter, modalSearch]
  );

  const resetModalFilters = useCallback(() => {
    setModalTab("PENDING");
    setModalRoleFilter("ALL");
    setModalSearch("");
    setModalRoleOpen(false);
  }, []);

  const openDay = useCallback(
    async (day) => {
      setSelectedDate(day);
      resetModalFilters();
      setShowModal(true);
      await fetchModalAttendance(day);
    },
    [fetchModalAttendance, resetModalFilters]
  );

  const shiftModalDay = useCallback(
    async (diff) => {
      const next = diff > 0 ? addDays(selectedDate, diff) : subDays(selectedDate, Math.abs(diff));
      setSelectedDate(next);
      resetModalFilters();
      await fetchModalAttendance(next);
    },
    [selectedDate, fetchModalAttendance, resetModalFilters]
  );

  const goModalToday = useCallback(async () => {
    const t = new Date();
    setSelectedDate(t);
    resetModalFilters();
    await fetchModalAttendance(t);
  }, [fetchModalAttendance, resetModalFilters]);

  // Modal summary
  const modalOnLeaveIds = useMemo(() => buildOnLeaveIdSet(approved), [approved]);

  const modalSummary = useMemo(
    () => buildModalSummary(selectedDate, modalAttendance, modalOnLeaveIds),
    [selectedDate, modalAttendance, modalOnLeaveIds]
  );

  // Team pagination (keep your existing UI but centralize page math)
  const safeTotalTeamPages = useMemo(() => {
    const fromHook = Number(att.totalTeamPages);
    if (Number.isFinite(fromHook) && fromHook >= 1) return fromHook;
    const len = att.filteredTeamAttendance?.length || 0;
    return Math.max(1, Math.ceil(len / PAGE_SIZE));
  }, [att.totalTeamPages, att.filteredTeamAttendance]);

  useEffect(() => {
    att.setTeamPage(1);
  }, [att.roleFilter, att.searchTerm, att.setTeamPage]);

  useEffect(() => {
    att.setTeamPage((p) => clamp(p, 1, safeTotalTeamPages));
  }, [safeTotalTeamPages, att.setTeamPage]);

  const teamPageNumbers = useMemo(
    () => getPageNumbers(att.teamPage, safeTotalTeamPages, 5),
    [att.teamPage, safeTotalTeamPages]
  );

  return (
    <div className="p-4 sm:p-6">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
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

        {/* Controls */}
        <div className="px-6 sm:px-8 pb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => openDay(new Date())}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-lg shadow-indigo-200 transition-all active:scale-95"
              >
                <CalendarIcon size={18} />
                Today’s Overview ({todayCount})
              </button>

              <LeaveTypeFilters
                items={LEAVE_TYPE_FILTERS}
                selected={selectedTypes}
                setSelected={setSelectedTypes}
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={goPrev}
                  className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-slate-800 font-black hover:bg-gray-50 transition active:scale-[0.98]"
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
                >
                  {">"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="p-4 sm:p-6">
          <CalendarGrid
            weekHeaders={WEEK_HEADERS}
            days={calendarDays}
            currentDate={currentDate}
            loading={loading}
            leaves={leaves}
            selectedTypes={selectedTypes}
            onDayClick={openDay}
            isSameMonth={isSameMonth}
            isToday={isToday}
          />

          {/* Team attendance today */}
          <TeamAttendancePanel
            att={att}
            roleOpen={roleOpen}
            setRoleOpen={setRoleOpen}
            safeTotalPages={safeTotalTeamPages}
            pageNumbers={teamPageNumbers}
          />

          <div className="p-6 pt-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            * Late rule: after {SHIFT_START}, NOT checked-in is counted as late.
          </div>
        </div>
      </div>

      {/* Daily modal */}
      <DailyDetailsModal
        open={showModal}
        onClose={() => setShowModal(false)}
        selectedDate={selectedDate}
        modalSummary={modalSummary}
        shiftDay={shiftModalDay}
        goToday={goModalToday}
        tab={modalTab}
        setTab={setModalTab}
        roleFilter={modalRoleFilter}
        setRoleFilter={setModalRoleFilter}
        roleOpen={modalRoleOpen}
        setRoleOpen={setModalRoleOpen}
        search={modalSearch}
        setSearch={setModalSearch}
        loading={loading || modalAttLoading}
        rows={filteredModalRows}
        refetchLeaves={refetchLeaves}
      />
    </div>
  );
}
