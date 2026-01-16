// frontend/src/pages/employees/employeeList/components/EmployeesTable.jsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, ChevronDown, Download } from "lucide-react";

function FiltersRow({
  roleFilter,
  setRoleFilter,
  statusFilter, // (เก็บไว้ให้ครบโครง, ตอนนี้ UI เดิมยังไม่ได้ใช้ dropdown status แยก)
  setStatusFilter, // (เก็บไว้)
  search,
  setSearch,
}) {
  const { t } = useTranslation();
  const [roleOpenFilter, setRoleOpenFilter] = useState(false);

  return (
    <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
      {/* Role Filter */}
      <div className="relative w-40">
        <button
          type="button"
          onClick={() => setRoleOpenFilter((v) => !v)}
          className={`w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5
            text-xs font-black uppercase tracking-widest text-slate-700
            flex items-center justify-between transition-all hover:bg-gray-50
            ${roleOpenFilter ? "ring-2 ring-blue-100" : ""}`}
        >
          <span>
            {roleFilter === "all"
              ? t("employeeList.allRoles")
              : roleFilter === "HR"
              ? t("employeeList.roleHR")
              : t("employeeList.roleWorker")}
          </span>

          <ChevronDown
            size={14}
            className={`transition-transform ${roleOpenFilter ? "rotate-180" : ""}`}
          />
        </button>

        {roleOpenFilter && (
          <>
            <div className="absolute z-20 mt-2 w-full rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden">
              {[
                { value: "all", label: t("employeeList.allRoles") },
                { value: "Worker", label: t("employeeList.roleWorker") },
                { value: "HR", label: t("employeeList.roleHR") },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setRoleFilter(opt.value);
                    setRoleOpenFilter(false);
                  }}
                  className={`w-full px-6 py-3 text-left text-sm font-black transition-all hover:bg-blue-50 ${
                    roleFilter === opt.value
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("employeeList.searchPlaceholder")}
        className="w-full sm:w-64 bg-white border border-gray-200 rounded-xl
          px-4 py-2.5 text-xs font-bold text-slate-700
          placeholder:text-gray-400
          focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

export default function EmployeesTable({ loading, items, onRowClick, onExportOne }) {
  const { t } = useTranslation();

  return (
    <table className="w-full text-left">
      <thead className="bg-gray-50/50 border-b border-gray-100 font-black text-[10px] text-gray-400 uppercase tracking-widest">
        <tr>
          <th className="p-6">{t("employeeList.colId")}</th>
          <th className="p-6">{t("employeeList.colName")}</th>
          <th className="p-6">{t("employeeList.colEmail")}</th>
          <th className="p-6 text-center">{t("employeeList.colRole")}</th>
          <th className="p-6 text-center">{t("employeeList.colStatus")}</th>
          <th className="p-6 text-center">{t("employeeList.colExport")}</th>
        </tr>
      </thead>

      <tbody className="divide-y divide-gray-50">
        {loading ? (
          <tr>
            <td colSpan="6" className="p-20 text-center">
              <Loader2 className="animate-spin mx-auto text-blue-600" />
            </td>
          </tr>
        ) : items.length > 0 ? (
          items.map((emp) => {
            const active = emp.isActive === true || emp.isActive === 1;

            return (
              <tr
                key={emp.id}
                onClick={() => onRowClick(emp.id)}
                className="hover:bg-blue-50/30 cursor-pointer transition-all group"
              >
                <td className="p-6 text-gray-400 font-bold text-sm">#{emp.id}</td>

                <td className="p-6 font-black text-slate-800">
                  {emp.firstName} {emp.lastName}
                </td>

                <td className="p-6 text-gray-500 text-sm font-medium italic">
                  {emp.email}
                </td>

                <td className="p-6 text-center">
                  <span
                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                      emp.role === "HR"
                        ? "bg-indigo-50 text-indigo-600"
                        : "bg-slate-50 text-slate-600"
                    }`}
                  >
                    {emp.role}
                  </span>
                </td>

                <td className="p-6 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        active
                          ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                          : "bg-rose-500"
                      }`}
                    />
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest ${
                        active ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {active
                        ? t("employeeList.statusWorking")
                        : t("employeeList.statusResigned")}
                    </span>
                  </div>
                </td>

                <td className="p-6 text-center">
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onExportOne(emp);
                    }}
                    className="h-10 w-10 rounded-xl inline-flex items-center justify-center
                      border border-gray-200 bg-white text-slate-700 hover:bg-gray-50
                      active:scale-95 transition"
                    title={t("employeeList.exportEmployee")}
                  >
                    <Download size={18} />
                  </button>
                </td>
              </tr>
            );
          })
        ) : (
          <tr>
            <td
              colSpan="6"
              className="p-20 text-center text-gray-300 font-black text-xs uppercase"
            >
              {t("employeeList.noEmployees")}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

EmployeesTable.FiltersRow = FiltersRow;
