//frontend/src/pages/yearEnd/components/SpecialHolidaysCard.jsx
import React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useHolidayPolicy } from "../hooks/useHolidayPolicy";
import { calcTotalDays, safeYMD, ymdToDDMMYYYY } from "../utils";

export default function SpecialHolidaysCard() {
  const {
    formOpen,
    setFormOpen,
    editId,
    holidayName,
    setHolidayName,
    holidayStart,
    setHolidayStart,
    holidayEnd,
    setHolidayEnd,
    openAddForm,
    resetHolidayForm,
    sortedSpecialHolidays,
    onEditHoliday,
    onDeleteHoliday,
    upsertSpecialHoliday,
  } = useHolidayPolicy();

  return (
    <>
      {formOpen && (
        <div className="mt-6 rounded-3xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-slate-800 uppercase tracking-widest">Special Holidays</div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                Add / Edit holiday and apply immediately
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                resetHolidayForm();
              }}
              className="h-10 px-4 rounded-3xl border border-gray-200 bg-white text-slate-700
                font-black text-[11px] uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95"
            >
              Close
            </button>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Holiday Name
                </label>
                <input
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  placeholder="e.g., Songkran Festival"
                  className="w-full h-11 px-5 rounded-2xl bg-white border border-gray-200
                    text-slate-800 font-black text-[12px] outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={holidayStart}
                  onChange={(e) => setHolidayStart(e.target.value)}
                  className="w-full h-11 px-5 rounded-2xl bg-white border border-gray-200
                    text-slate-800 font-black text-[12px] outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={holidayEnd}
                  onChange={(e) => setHolidayEnd(e.target.value)}
                  className="w-full h-11 px-5 rounded-2xl bg-white border border-gray-200
                    text-slate-800 font-black text-[12px] outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 flex-col sm:flex-row">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                Duration:{" "}
                <span className="text-slate-700">{calcTotalDays(holidayStart, holidayEnd) || 0} day(s)</span>
              </div>

              <div className="flex items-center gap-2">
                {editId && (
                  <button
                    type="button"
                    onClick={() => {
                      resetHolidayForm();
                      setFormOpen(false);
                    }}
                    className="h-11 px-6 rounded-3xl bg-white border border-gray-200 text-slate-700
                      font-black text-[11px] uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95"
                  >
                    Cancel Edit
                  </button>
                )}

                <button
                  type="button"
                  onClick={upsertSpecialHoliday}
                  className="h-11 px-6 rounded-3xl bg-indigo-600 text-white font-black text-[11px]
                    uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100
                    inline-flex items-center gap-2"
                >
                  <Plus size={16} />
                  {editId ? "Update" : "Add"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-3xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-slate-800 uppercase tracking-widest">Special Holidays Log</div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              DD-MM-YYYY (total days), name, edit, delete
            </div>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="h-10 px-4 rounded-3xl bg-white border border-gray-200 text-slate-800
              font-black text-[11px] uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95
              inline-flex items-center gap-2"
          >
            <Plus size={16} />
            Add Holiday
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Holiday Name</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {sortedSpecialHolidays.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-gray-400 italic text-sm">
                    No special holidays yet.
                  </td>
                </tr>
              ) : (
                sortedSpecialHolidays.map((h) => {
                  const totalDays = calcTotalDays(h.startDate, h.endDate);
                  const dateText =
                    safeYMD(h.startDate) === safeYMD(h.endDate)
                      ? `${ymdToDDMMYYYY(h.startDate)} (${totalDays} day)`
                      : `${ymdToDDMMYYYY(h.startDate)} to ${ymdToDDMMYYYY(h.endDate)} (${totalDays} days)`;

                  return (
                    <tr key={h.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-black text-slate-700">{dateText}</td>
                      <td className="px-6 py-4 text-slate-700 font-bold">{h.name}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onEditHoliday(h)}
                            className="h-9 px-4 rounded-3xl border border-gray-200 bg-white text-slate-700
                              font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95
                              inline-flex items-center gap-2"
                          >
                            <Pencil size={14} />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteHoliday(h)}
                            className="h-9 px-4 rounded-3xl border border-rose-100 bg-rose-50 text-rose-700
                              font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-all active:scale-95
                              inline-flex items-center gap-2"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
