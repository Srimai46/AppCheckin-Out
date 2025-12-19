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
} from "lucide-react";
import { getAllLeaves } from "../api/leaveService";

export default function TeamCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [modalLeaves, setModalLeaves] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

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

  const handleDayClick = (day) => {
    const dayLeaves = leaves.filter((l) => isSameDay(l.date, day));
    setSelectedDate(day);
    setModalLeaves(dayLeaves);
    setShowModal(true);
  };

  const handleShowTodayLeaves = () => handleDayClick(new Date());

  const getStatusDot = (status) => {
    switch (status) {
      case "Approved":
        return "bg-emerald-500";
      case "Rejected":
        return "bg-rose-500";
      default:
        return "bg-amber-500";
    }
  };

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }),
  });

  const weekHeaders = useMemo(
    () => [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
    []
  );

  const weekendBgByDow = (dow) => {
    // dow: 0=Sun, 6=Sat
    if (dow === 6) return "bg-violet-50/70"; // Saturday
    if (dow === 0) return "bg-rose-50/70"; // Sunday
    return "";
  };

  const todayCount = useMemo(
    () => leaves.filter((l) => isSameDay(l.date, new Date())).length,
    [leaves]
  );

  const goPrev = () => setCurrentDate((d) => subMonths(d, 1));
  const goNext = () => setCurrentDate((d) => addMonths(d, 1));
  const goToday = () => setCurrentDate(new Date());

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
            {/* LEFT: Overview + Legend */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleShowTodayLeaves}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-lg shadow-indigo-200 transition-all active:scale-95"
              >
                <CalendarIcon size={18} />
                Today’s Overview ({todayCount})
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <LegendDot color="bg-blue-600" label="Today" />
                <LegendDot color="bg-rose-400" label="Sick" />
                <LegendDot color="bg-sky-400" label="Personal" />
                <LegendDot color="bg-emerald-400" label="Vacation" />
              </div>
            </div>

            {/* RIGHT: Nav */}
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
            {/* ✅ Weekday header (เอาสีออกหมด) */}
            <div className="grid grid-cols-7 border-b border-gray-100 bg-white">
              {weekHeaders.map((d) => (
                <div
                  key={d}
                  className="py-2 text-center text-[11px] font-black text-slate-700"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 bg-white">
              {calendarDays.map((day) => {
                const dayLeaves = leaves.filter((leaf) =>
                  isSameDay(leaf.date, day)
                );
                const inMonth = isSameMonth(day, currentDate);
                const dow = day.getDay(); // 0 Sun ... 6 Sat
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
                      <div className="mt-2 text-[10px] text-gray-300 font-bold">
                        loading...
                      </div>
                    ) : (
                      <div className="mt-2 space-y-1">
                        {dayLeaves.slice(0, 3).map((leaf) => (
                          <div
                            key={leaf.id}
                            className="text-[10px] px-2 py-1 rounded-lg border flex items-center gap-1 truncate font-bold"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${getStatusDot(
                                leaf.status
                              )}`}
                            />
                            <span className="truncate">{leaf.name}</span>
                          </div>
                        ))}
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
                <h3 className="font-black text-gray-900 text-2xl tracking-tight">
                  Daily Details
                </h3>
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
                      <div className="font-black text-gray-800 text-base">
                        {leaf.name}
                      </div>
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
                  <p className="font-bold text-gray-400">
                    No leave requests for this date
                  </p>
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
