// frontend/src/pages/csv/csvforEmployeesAll.jsx
import { useEffect, useMemo, useState } from "react";
import { Download, Filter, X, CheckSquare, Square } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function CsvForEmployeesAll({ open, onClose, employees = [], initialFilters }) {
  const { t } = useTranslation();

  // -------------------------
  // Filters
  // -------------------------
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [tab, setTab] = useState("active");
  const [keyword, setKeyword] = useState("");
  const [department, setDepartment] = useState("all");

  // columns toggles
  const [cols, setCols] = useState({
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    department: true,
    role: true,
    isActive: true,
    joiningDate: true,
  });

  // -------------------------
  // sync from main page filters
  // -------------------------
  useEffect(() => {
    if (!open) return;
    setRole(initialFilters?.roleFilter ?? "all");
    setStatus(initialFilters?.statusFilter ?? "all");
    setTab(initialFilters?.activeTab ?? "active");
    setKeyword(initialFilters?.search ?? "");
    setDepartment(initialFilters?.departmentFilter ?? "all");
  }, [open, initialFilters]);

  const normalize = (v) => (v ?? "").toString().trim().toLowerCase();

  // -------------------------
  // filtering
  // -------------------------
  const filtered = useMemo(() => {
    const kw = normalize(keyword);

    return (employees || []).filter((emp) => {
      const isActive = emp?.isActive === true || emp?.isActive === 1;
      const dept = emp?.department || "Unassigned";

      // tab
      if (tab === "active" && !isActive) return false;
      if (tab === "inactive" && isActive) return false;

      // status
      if (status === "active" && !isActive) return false;
      if (status === "inactive" && isActive) return false;

      // role
      if (role !== "all" && emp?.role !== role) return false;

      // department
      if (department !== "all" && dept !== department) return false;

      // keyword
      if (!kw) return true;
      const hay = `${emp?.firstName || ""} ${emp?.lastName || ""} ${emp?.email || ""} ${
        emp?.role || ""
      } ${dept} ${emp?.id || ""}`.toLowerCase();

      return hay.includes(kw);
    });
  }, [employees, tab, role, status, keyword, department]);

  // -------------------------
  // CSV helpers
  // -------------------------
  const escapeCsv = (value) => {
    const s = (value ?? "").toString();
    return `"${s.replace(/"/g, '""')}"`;
  };

  const getColHeaderAndValue = (emp) => {
    const isActive = emp?.isActive === true || emp?.isActive === 1;
    const dept = emp?.department || "Unassigned";

    return [
      cols.id && { h: "employeeId", v: emp?.id ?? "" },
      cols.firstName && { h: "firstName", v: emp?.firstName ?? "" },
      cols.lastName && { h: "lastName", v: emp?.lastName ?? "" },
      cols.email && { h: "email", v: emp?.email ?? "" },
      cols.department && {
        h: "department",
        v: dept === "Unassigned"
          ? t("employeeList.departmentUnassigned")
          : dept,
      },
      cols.role && { h: "role", v: emp?.role ?? "" },
      cols.isActive && {
        h: "status",
        v: isActive
          ? t("employeesAllExport.status.active")
          : t("employeesAllExport.status.inactive"),
      },
      cols.joiningDate && { h: "joiningDate", v: emp?.joiningDate ?? "" },
    ].filter(Boolean);
  };

  const buildCsv = (rows) => {
    if (!rows || rows.length === 0) return "";
    const headers = getColHeaderAndValue(rows[0]).map((x) => x.h);
    const lines = rows.map((emp) =>
      getColHeaderAndValue(emp).map((x) => escapeCsv(x.v)).join(",")
    );
    return [headers.join(","), ...lines].join("\n");
  };

  const downloadCsv = () => {
    const csv = buildCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;

    const fileName = `employees_export_${tab}_${department}_${role}_${status}_${stamp}.csv`;

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    onClose?.();
  };

  const toggleCol = (key) => setCols((p) => ({ ...p, [key]: !p[key] }));

  const reset = () => {
    setRole(initialFilters?.roleFilter ?? "all");
    setStatus(initialFilters?.statusFilter ?? "all");
    setTab(initialFilters?.activeTab ?? "active");
    setKeyword(initialFilters?.search ?? "");
    setDepartment(initialFilters?.departmentFilter ?? "all");
    setCols({
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      department: true,
      role: true,
      isActive: true,
      joiningDate: true,
    });
  };

  if (!open) return null;

  const inputClass =
    "w-full h-10 px-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-slate-200 bg-white";

  const pillBtn = (active) =>
    [
      "px-3 h-9 rounded-full border font-bold text-sm transition",
      active
        ? "bg-slate-900 text-white border-slate-900"
        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
    ].join(" ");

  const ColRow = ({ k, label }) => (
    <button
      type="button"
      onClick={() => toggleCol(k)}
      className="h-10 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition flex items-center gap-2 text-sm font-bold text-slate-700"
    >
      {cols[k] ? <CheckSquare size={18} /> : <Square size={18} />}
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-[1.5rem] bg-white border border-slate-200 shadow-xl overflow-hidden">
          {/* header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div>
              <div className="text-lg font-black">{t("employeesAllExport.title")}</div>
              <div className="text-xs text-slate-500 font-bold">
                {t("employeesAllExport.rowsToExport")}{" "}
                <span className="text-slate-800">{filtered.length}</span>
              </div>
            </div>
            <button onClick={onClose} className="h-9 w-9 rounded-full hover:bg-slate-100">
              <X size={18} />
            </button>
          </div>

          {/* body */}
          <div className="px-6 py-5 space-y-5">
            {/* tabs */}
            <div className="flex gap-2">
              <button onClick={() => setTab("active")} className={pillBtn(tab === "active")}>
                {t("employeesAllExport.filters.activeTab")}
              </button>
              <button onClick={() => setTab("inactive")} className={pillBtn(tab === "inactive")}>
                {t("employeesAllExport.filters.resignedTab")}
              </button>
            </div>

            {/* filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold">{t("employeesAllExport.filters.department")}</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className={inputClass}
                >
                  <option value="all">{t("employeeList.allDepartments")}</option>
                  {[...new Set(employees.map((e) => e.department || "Unassigned"))].map((d) => (
                    <option key={d} value={d}>
                      {d === "Unassigned"
                        ? t("employeeList.departmentUnassigned")
                        : d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold">{t("employeesAllExport.filters.role")}</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
                  <option value="all">{t("employeesAllExport.options.all")}</option>
                  <option value="Worker">{t("employeesAllExport.options.worker")}</option>
                  <option value="HR">{t("employeesAllExport.options.hr")}</option>
                </select>
              </div>
            </div>

            {/* columns */}
            <div className="grid grid-cols-2 gap-2">
              <ColRow k="id" label={t("employeesAllExport.columns.employeeId")} />
              <ColRow k="firstName" label={t("employeesAllExport.columns.firstName")} />
              <ColRow k="lastName" label={t("employeesAllExport.columns.lastName")} />
              <ColRow k="email" label={t("employeesAllExport.columns.email")} />
              <ColRow k="department" label={t("employeeList.colDepartment")} />
              <ColRow k="role" label={t("employeesAllExport.columns.role")} />
              <ColRow k="isActive" label={t("employeesAllExport.columns.status")} />
              <ColRow k="joiningDate" label={t("employeesAllExport.columns.joiningDate")} />
            </div>
          </div>

          {/* footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t">
            <button onClick={onClose} className="h-10 px-4 rounded-full border">
              {t("common.cancel")}
            </button>
            <button
              onClick={downloadCsv}
              disabled={filtered.length === 0}
              className="h-11 px-8 min-w-[160px] rounded-full bg-slate-900 text-white font-black text-sm hover:bg-slate-800
                active:scale-[0.98] transition inline-flex items-center justify-center gap-3 disabled:opacity-60"
            >
              <Download size={18} /> {t("employeesAllExport.buttons.exportCsv")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
