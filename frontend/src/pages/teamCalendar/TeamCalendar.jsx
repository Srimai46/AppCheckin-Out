// src/pages/TeamCalendar.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import ExportCsvButton from "./csv/csvforTeamCalendar.jsx";
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
} from "date-fns";
import { enUS, th as thLocale } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { LEAVE_TYPE_FILTERS, WEEK_HEADERS, SHIFT_START, PAGE_SIZE } from "./constants";
import { matchLeaveType } from "./utils";

import useLeaves from "./hooks/useLeaves";
import useTeamAttendanceToday from "./hooks/useTeamAttendanceToday";
import useModalAttendance from "./hooks/useModalAttendance";

import { getPageNumbers, clamp } from "./helpers/pagination";
import {
  countLeavesToday,
  leavesByDayAndType,
  buildModalSummary,
  buildOnLeaveIdSet,
} from "./helpers/leaveSelectors";

import LeaveTypeFilters from "./components/LeaveTypeFilters";
import CalendarGrid from "./components/CalendarGrid";
import TeamAttendancePanel from "./components/TeamAttendancePanel";
import DailyDetailsModal from "./components/DailyDetailsModal";

/** ✅ status -> tab แบบทนทาน (กัน Pending/Withdraw_Pending/casing) */
const statusToTab = (status) => {
  const s = String(status || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

  if (s === "APPROVED") return "APPROVED";
  if (s === "REJECTED") return "REJECTED";

  // ทุกอย่างที่เป็น pending/withdraw/cancel pending ให้ไปอยู่ PENDING
  if (s.includes("PENDING")) return "PENDING";

  // fallback: ถ้าไม่รู้จัก ให้ไป pending ก่อน (กันข้อมูลหลุด)
  return "PENDING";
};

export default function TeamCalendar() {
  const { t, i18n } = useTranslation();

  const [currentDate, setCurrentDate] = useState(new Date());
  const dfLocale = useMemo(() => (i18n.language === "th" ? thLocale : enUS), [i18n.language]);

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

  // ✅ Leaves ของวันนั้น (ตาม type filter)
  const leavesOfSelectedDay = useMemo(
    () => leavesByDayAndType(leaves, selectedDate, selectedTypes, matchLeaveType),
    [leaves, selectedDate, selectedTypes]
  );

  // ✅ เอา “tab filter” ไว้ที่นี่อย่างเดียว แล้วส่งให้ modal กรอง Role/Dept/Search ต่อ
  const modalRows = useMemo(() => {
    const target = String(modalTab || "PENDING").toUpperCase();
    return (leavesOfSelectedDay || []).filter((leaf) => statusToTab(leaf?.status) === target);
  }, [leavesOfSelectedDay, modalTab]);

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
    const today = new Date();
    setSelectedDate(today);
    resetModalFilters();
    await fetchModalAttendance(today);
  }, [fetchModalAttendance, resetModalFilters]);

  // ✅ modal summary (เหมือนเดิม) — ใช้ approved set สำหรับ onLeave
  const approvedForSummary = useMemo(
    () => (leavesOfSelectedDay || []).filter((x) => statusToTab(x?.status) === "APPROVED"),
    [leavesOfSelectedDay]
  );

  const modalOnLeaveIds = useMemo(() => buildOnLeaveIdSet(approvedForSummary), [approvedForSummary]);

  const modalSummary = useMemo(
    () => buildModalSummary(selectedDate, modalAttendance, modalOnLeaveIds),
    [selectedDate, modalAttendance, modalOnLeaveIds]
  );

  // Team pagination
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
              {format(currentDate, "MMMM", { locale: dfLocale })}
            </div>
            <div className="text-4xl sm:text-6xl font-black text-slate-900 leading-none">
              {format(currentDate, "yyyy", { locale: dfLocale })}
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
                {t("teamCalendar.actions.todayOverview", { count: todayCount })}
              </button>

              <LeaveTypeFilters
                items={LEAVE_TYPE_FILTERS}
                selected={selectedTypes}
                setSelected={setSelectedTypes}
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <ExportCsvButton
                leaves={leaves}
                selectedTypes={selectedTypes}
                leaveTypeFilters={LEAVE_TYPE_FILTERS}
                currentDate={currentDate}
                dfLocale={dfLocale}
                matchLeaveType={matchLeaveType}
                t={t}
              />

              <div className="flex items-center gap-1">
                <button
                  onClick={goPrev}
                  className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-slate-800 font-black hover:bg-gray-50 transition active:scale-[0.98]"
                  aria-label={t("common.prev")}
                  title={t("common.prev")}
                >
                  {"<"}
                </button>
                <button
                  onClick={goToday}
                  className="h-10 px-5 rounded-xl bg-white border border-gray-200 text-slate-800 font-black hover:bg-gray-50 transition active:scale-[0.98]"
                  aria-label={t("common.today")}
                  title={t("common.today")}
                >
                  {t("common.today")}
                </button>
                <button
                  onClick={goNext}
                  className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-slate-800 font-black hover:bg-gray-50 transition active:scale-[0.98]"
                  aria-label={t("common.next")}
                  title={t("common.next")}
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
            matchLeaveType={matchLeaveType}
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
            {t("pages.teamCalendar.hints.lateRule", { time: SHIFT_START })}
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
        rows={modalRows}
        refetchLeaves={refetchLeaves}
      />
    </div>
  );
}
