import React, { useState } from "react";
import { RefreshCw, Save, Clock, Coffee, Building2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import TimePicker from "../../../components/shared/TimePicker";
import { useHolidayPolicy } from "../../yearEnd/hooks/useHolidayPolicy"; // ตรวจสอบ path ให้ตรงกับโครงสร้างจริง
import DepartmentDropdown from "../components/DepartmentDropdown";

export default function WorkTimeByRoleCard() {
  const { t } = useTranslation();
  const {
    workTimeByRole,
    updateWorkTime,
    workTimeSaving,
    saveWorkTimePolicy,
    departments
  } = useHolidayPolicy();

  const [selectedDeptId, setSelectedDeptId] = useState("ALL");
  const [deptOpen, setDeptOpen] = useState(false);

  // Helper to handle save button click
  const handleSave = () => {
    if (selectedDeptId === "ALL") return;
    saveWorkTimePolicy(selectedDeptId);
  };

  return (
    <div className="mt-6 rounded-3xl border border-gray-100 bg-gray-50/50 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-col sm:flex-row mb-6">
        <div>
          <div className="text-sm font-black text-slate-800 uppercase tracking-widest">
            {t("workTimeByRole.title", "Work Schedule Config")}
          </div>
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
            {t("workTimeByRole.subtitle", "Customize time for each department")}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={workTimeSaving || selectedDeptId === "ALL"}
          className="h-11 px-6 rounded-3xl bg-indigo-600 text-white font-black text-[11px]
            uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95
            shadow-lg shadow-indigo-100 disabled:bg-gray-300 disabled:shadow-none inline-flex items-center gap-2"
        >
          {workTimeSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
          {workTimeSaving ? t("common.saving", "SAVING...") : t("common.save", "SAVE SETTINGS")}
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {/* Dropdown Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[11px] font-black text-slate-800 uppercase tracking-widest">
            <Building2 size={16} className="text-indigo-500" />
            {t("workTimeByRole.selectDepartment", "Select Department")}
          </div>
          <div className="w-full sm:w-72">
            <DepartmentDropdown
              items={departments}
              value={selectedDeptId}
              onChange={setSelectedDeptId}
              open={deptOpen}
              setOpen={setDeptOpen}
              size="sm"
            />
          </div>
        </div>

        {/* Edit Form */}
        {selectedDeptId !== "ALL" ? (
          <div className="rounded-3xl bg-white border border-indigo-100 p-6 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* 1. Working Hours */}
              <div className="space-y-4">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Clock size={14}/> Working Hours
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] text-gray-400 font-bold mb-1 uppercase">Start</label>
                    <TimePicker 
                        value={workTimeByRole?.[selectedDeptId]?.start || "09:00"} 
                        onChange={(v) => updateWorkTime(selectedDeptId, "start", v)} 
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-gray-400 font-bold mb-1 uppercase">End</label>
                    <TimePicker 
                        value={workTimeByRole?.[selectedDeptId]?.end || "18:00"} 
                        onChange={(v) => updateWorkTime(selectedDeptId, "end", v)} 
                    />
                  </div>
                </div>
              </div>

              {/* 2. Break Time */}
              <div className="space-y-4">
                <div className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
                  <Coffee size={14} /> Break Time
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] text-gray-400 font-bold mb-1 uppercase">Start Break</label>
                    <TimePicker 
                        value={workTimeByRole?.[selectedDeptId]?.breakStart || "12:00"} 
                        onChange={(v) => updateWorkTime(selectedDeptId, "breakStart", v)} 
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-gray-400 font-bold mb-1 uppercase">End Break</label>
                    <TimePicker 
                        value={workTimeByRole?.[selectedDeptId]?.breakEnd || "13:00"} 
                        onChange={(v) => updateWorkTime(selectedDeptId, "breakEnd", v)} 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-10 rounded-3xl border-2 border-dashed border-gray-200 bg-white/50 text-gray-400">
            <Building2 size={32} className="mx-auto mb-2 opacity-20" />
            <div className="text-[11px] font-bold uppercase tracking-widest">
              {t("workTimeByRole.selectDeptHint", "Please select a department to edit")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}