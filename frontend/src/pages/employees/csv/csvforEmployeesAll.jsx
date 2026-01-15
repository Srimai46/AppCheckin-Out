// frontend/src/pages/csv/csvforEmployeesAll.jsx
import { useEffect, useMemo, useState } from "react";
import { Download, Filter, X, CheckSquare, Square } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function CsvForEmployeesAll({ open, onClose, employees = [], initialFilters }) {
  const { t } = useTranslation();

  // -------------------------
  // Filters (ควรมี)
  // -------------------------
  const [role, setRole] = useState("all"); // all | Worker | HR
  const [status, setStatus] = useState("all"); // all | active | inactive
  const [tab, setTab] = useState("active"); // active | inactive (ให้ตรงกับหน้า)
  const [keyword, setKeyword] = useState("");

  // columns toggles (เลือกคอลัมน์ที่อยาก export)
  const [cols, setCols] = useState({
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    role: true,
    isActive: true,
    joiningDate: true,
  });

  useEffect(() => {
    if (!open) return;
    // default ใช้ค่าจากหน้าหลักก่อน เพื่อให้ export ตรงที่ user กรองไว้
    setRole(initialFilters?.roleFilter ?? "all");
    setStatus(initialFilters?.statusFilter ?? "all");
    setTab(initialFilters?.activeTab ?? "active");
    setKeyword(initialFilters?.search ?? "");
  }, [open, initialFilters]);

  const normalize = (v) => (v ?? "").toString().trim().toLowerCase();

  const filtered = useMemo(() => {
    const kw = normalize(keyword);

    return (employees || []).filter((emp) => {
      const isActive = emp?.isActive === true || emp?.isActive === 1;

      // tab (active/inactive)
      if (tab === "active" && !isActive) return false;
      if (tab === "inactive" && isActive) return false;

      // status filter
      if (status === "active" && !isActive) return false;
      if (status === "inactive" && isActive) return false;

      // role filter
      if (role !== "all" && emp?.role !== role) return false;

      // keyword
      if (!kw) return true;
      const hay = `${emp?.firstName || ""} ${emp?.lastName || ""} ${emp?.email || ""} ${emp?.role || ""} ${
        emp?.id || ""
      }`.toLowerCase();
      return hay.includes(kw);
    });
  }, [employees, tab, role, status, keyword]);

  const escapeCsv = (value) => {
    const s = (value ?? "").toString();
    return `"${s.replace(/"/g, '""')}"`;
  };

  const getColHeaderAndValue = (emp) => {
    const isActive = emp?.isActive === true || emp?.isActive === 1;

    const map = [
      cols.id && { h: "employeeId", v: emp?.id ?? "" },
      cols.firstName && { h: "firstName", v: emp?.firstName ?? "" },
      cols.lastName && { h: "lastName", v: emp?.lastName ?? "" },
      cols.email && { h: "email", v: emp?.email ?? "" },
      cols.role && { h: "role", v: emp?.role ?? "" },
      cols.isActive && {
        h: "status",
        v: isActive ? t("employeesAllExport.status.active") : t("employeesAllExport.status.inactive"),
      },
      cols.joiningDate && { h: "joiningDate", v: emp?.joiningDate ?? "" },
    ].filter(Boolean);

    return map;
  };

  const buildCsv = (rows) => {
    const sample = rows?.[0] || {};
    const headers = getColHeaderAndValue(sample).map((x) => x.h);

    const lines = rows.map((emp) => {
      const cells = getColHeaderAndValue(emp).map((x) => escapeCsv(x.v));
      return cells.join(",");
    });

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

    const fileName = `employees_export_${tab}_${role}_${status}_${stamp}.csv`;

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    onClose?.();
  };

  const toggleCol = (key) => setCols((prev) => ({ ...prev, [key]: !prev[key] }));

  const reset = () => {
    setRole(initialFilters?.roleFilter ?? "all");
    setStatus(initialFilters?.statusFilter ?? "all");
    setTab(initialFilters?.activeTab ?? "active");
    setKeyword(initialFilters?.search ?? "");
    setCols({
      id: true,
      firstName: true,
      lastName: true,
      email: true,
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
      {/* overlay */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-[1.5rem] bg-white border border-slate-200 shadow-xl overflow-hidden">
          {/* header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-slate-700" />
              <div>
                <div className="text-lg font-black text-slate-800">
                  {t("employeesAllExport.title")}
                </div>
                <div className="text-xs text-slate-500 font-bold">
                  {t("employeesAllExport.rowsToExport")}{" "}
                  <span className="text-slate-800">{filtered.length}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-slate-100 transition"
              aria-label={t("common.close")}
              title={t("common.close")}
            >
              <X size={18} />
            </button>
          </div>

          {/* body */}
          <div className="px-6 py-5 space-y-5">
            {/* quick filters */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-600">{t("employeesAllExport.filters.label")}</div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTab("active")}
                  className={pillBtn(tab === "active")}
                >
                  {t("employeesAllExport.filters.activeTab")}
                </button>
                <button
                  type="button"
                  onClick={() => setTab("inactive")}
                  className={pillBtn(tab === "inactive")}
                >
                  {t("employeesAllExport.filters.resignedTab")}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">
                    {t("employeesAllExport.filters.role")}
                  </label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
                    <option value="all">{t("employeesAllExport.options.all")}</option>
                    <option value="Worker">{t("employeesAllExport.options.worker")}</option>
                    <option value="HR">{t("employeesAllExport.options.hr")}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">
                    {t("employeesAllExport.filters.status")}
                  </label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                    <option value="all">{t("employeesAllExport.options.all")}</option>
                    <option value="active">{t("employeesAllExport.status.active")}</option>
                    <option value="inactive">{t("employeesAllExport.status.inactive")}</option>
                  </select>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-slate-600">
                    {t("employeesAllExport.filters.keyword")}
                  </label>
                  <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder={t("employeesAllExport.filters.keywordPlaceholder")}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* column selector */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-600">{t("employeesAllExport.columns.label")}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <ColRow k="id" label={t("employeesAllExport.columns.employeeId")} />
                <ColRow k="firstName" label={t("employeesAllExport.columns.firstName")} />
                <ColRow k="lastName" label={t("employeesAllExport.columns.lastName")} />
                <ColRow k="email" label={t("employeesAllExport.columns.email")} />
                <ColRow k="role" label={t("employeesAllExport.columns.role")} />
                <ColRow k="isActive" label={t("employeesAllExport.columns.status")} />
                <ColRow k="joiningDate" label={t("employeesAllExport.columns.joiningDate")} />
              </div>
              <div className="text-xs text-slate-500">{t("employeesAllExport.columns.tip")}</div>
            </div>

            {/* preview */}
            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="text-sm text-slate-700">
                {t("employeesAllExport.previewRows")}{" "}
                <span className="font-black">{filtered.length}</span>
              </div>
              <button
                type="button"
                onClick={reset}
                className="text-sm font-bold text-slate-600 hover:text-slate-900"
              >
                {t("common.reset")}
              </button>
            </div>
          </div>

          {/* footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-full border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={downloadCsv}
              disabled={filtered.length === 0}
              className="h-10 px-5 rounded-full bg-slate-900 text-white font-black hover:bg-slate-800 active:scale-[0.98] transition inline-flex items-center gap-2 disabled:opacity-60"
            >
              <Download size={18} />
              {t("employeesAllExport.buttons.exportCsv")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
