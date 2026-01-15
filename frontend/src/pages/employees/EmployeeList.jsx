// frontend/src/pages/EmployeeList.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import LeavePolicyModal from "../../components/shared/LeavePolicyModal";
import { useTranslation } from "react-i18next";
import { alertConfirm, alertSuccess, alertError } from "../../utils/sweetAlert";
import CsvForEmployee from "./csv/csvforEmployee";
import CsvForEmployeesAll from "./csv/csvforEmployeesAll";
import XlsxForEmployeesWorkbook from "./csv/xlsxForEmployeesWorkbook";
import {
  Plus,
  User,
  X,
  Users,
  UserMinus,
  Loader2,
  ShieldCheck,
  Briefcase,
  ChevronDown,
  KeyRound,
  Download,
  FileSpreadsheet,
} from "lucide-react";

function PaginationBar({ page, totalPages, onPrev, onNext }) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50">
      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
        {t("employeeList.pagination.label", { page, totalPages })}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={page <= 1}
          className={`h-9 px-4 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 ${
            page <= 1
              ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
              : "bg-white text-slate-800 border-gray-200 hover:bg-gray-50"
          }`}
        >
          {t("common.prev")}
        </button>

        <button
          onClick={onNext}
          disabled={page >= totalPages}
          className={`h-9 px-4 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 ${
            page >= totalPages
              ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
              : "bg-white text-slate-800 border-gray-200 hover:bg-gray-50"
          }`}
        >
          {t("common.next")}
        </button>
      </div>
    </div>
  );
}

function ExportAllChooser({ open, onClose, onPick }) {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-[1.5rem] bg-white border border-slate-200 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="text-lg font-black text-slate-800">
              {t("employeeList.exportAll.title")}
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

          <div className="p-6 space-y-3">
            <button
              type="button"
              onClick={() => onPick("workbook")}
              className="w-full text-left p-5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition"
            >
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="mt-0.5" />
                <div>
                  <div className="font-black text-slate-800">
                    {t("employeeList.exportAll.workbook.title")}
                  </div>
                  <div className="text-sm text-slate-600 font-bold">
                    {t("employeeList.exportAll.workbook.desc")}
                  </div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onPick("employeesList")}
              className="w-full text-left p-5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition"
            >
              <div className="flex items-start gap-3">
                <Download className="mt-0.5" />
                <div>
                  <div className="font-black text-slate-800">
                    {t("employeeList.exportAll.employeesList.title")}
                  </div>
                  <div className="text-sm text-slate-600 font-bold">
                    {t("employeeList.exportAll.employeesList.desc")}
                  </div>
                </div>
              </div>
            </button>

            <div className="text-xs text-slate-500 font-bold pt-2">
              {t("employeeList.exportAll.note")}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-full border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmployeeList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [roleFilter, setRoleFilter] = useState("all"); // all | Worker | HR
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | inactive

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // modals
  const [showModal, setShowModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  // ui state
  const [activeTab, setActiveTab] = useState("active");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // create employee form
  const [isLoading, setIsLoading] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [roleOpenFilter, setRoleOpenFilter] = useState(false);

  // export per employee
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);

  // export all (chooser + 2 pages)
  const [exportAllChooserOpen, setExportAllChooserOpen] = useState(false);
  const [exportAllWorkbookOpen, setExportAllWorkbookOpen] = useState(false);
  const [exportAllEmployeesListOpen, setExportAllEmployeesListOpen] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "Worker",
    joiningDate: "",
  });

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/employees");
      const list = Array.isArray(res?.data)
        ? res.data
        : res?.data?.employees || res?.data?.data || [];
      setEmployees(list);
    } catch (err) {
      alertError(
        t("employeeCreate.failed"),
        err?.response?.data?.message ||
          t("employeeCreate.fetchErrorFallback", {
            defaultValue: "An error occurred while retrieving the information.",
          })
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const counts = useMemo(() => {
    return employees.reduce(
      (acc, emp) => {
        const isActive = emp.isActive === true || emp.isActive === 1;
        isActive ? acc.active++ : acc.inactive++;
        return acc;
      },
      { active: 0, inactive: 0 }
    );
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return employees.filter((emp) => {
      const isActive = emp.isActive === true || emp.isActive === 1;

      // tab active / inactive
      if (activeTab === "active" && !isActive) return false;
      if (activeTab === "inactive" && isActive) return false;

      // status filter
      if (statusFilter === "active" && !isActive) return false;
      if (statusFilter === "inactive" && isActive) return false;

      // role filter
      if (roleFilter !== "all" && emp.role !== roleFilter) return false;

      // search
      if (!keyword) return true;

      return (
        emp.firstName?.toLowerCase().includes(keyword) ||
        emp.lastName?.toLowerCase().includes(keyword) ||
        emp.email?.toLowerCase().includes(keyword) ||
        String(emp.id).includes(keyword)
      );
    });
  }, [employees, activeTab, roleFilter, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE));
  const pageItems = filteredEmployees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [activeTab, roleFilter, statusFilter, search]);

  const resetCreateForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "Worker",
      joiningDate: "",
    });
    setRoleOpen(false);
  };

  const handleOpenCreate = () => {
    resetCreateForm();
    setShowModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    const confirmed = await alertConfirm(
      t("employeeCreate.confirmTitle"),
      `
      <div style="text-align:left; line-height:1.7">
        <div style="font-weight:900; color:#0f172a; margin-bottom:6px">
          ${t("employeeCreate.confirmReviewTitle")}
        </div>
        <div style="color:#64748b; font-weight:800">
          - ${t("employeeCreate.firstName")}: ${formData.firstName || "-"}<br/>
          - ${t("employeeCreate.lastName")}: ${formData.lastName || "-"}<br/>
          - ${t("employeeCreate.email")}: ${formData.email || "-"}<br/>
          - ${t("employeeCreate.role")}: ${formData.role || "-"}<br/>
          - ${t("employeeCreate.joinDate")}: ${formData.joiningDate || "-"}<br/>
        </div>
      </div>
      `,
      t("employeeCreate.confirmButton")
    );
    if (!confirmed) return;

    try {
      setIsLoading(true);

      await api.post("/employees", {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        joiningDate: formData.joiningDate,
      });

      await alertSuccess(t("employeeCreate.success"), t("employeeCreate.successText"));
      setShowModal(false);
      fetchEmployees();
    } catch (err) {
      alertError(
        t("employeeCreate.failed"),
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          t("employeeCreate.unexpectedErrorFallback", {
            defaultValue: "An unexpected error occurred. Please try again.",
          })
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-center gap-4">
        <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
          <User className="text-blue-600" /> {t("employeeList.title")}
        </h1>

        <div className="flex items-center gap-2">
          {/* ✅ Export All */}
          <button
            type="button"
            onClick={() => setExportAllChooserOpen(true)}
            className="h-11 px-4 rounded-xl border border-gray-200 bg-white text-slate-800
              inline-flex items-center gap-2 font-black text-sm
              hover:bg-gray-50 active:scale-95 transition"
            title={t("employeeList.exportAll.buttonTitle")}
          >
            <Download size={18} />
            {t("employeeList.exportAll.button")}
          </button>

          <button
            onClick={handleOpenCreate}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95 font-bold text-sm"
          >
            <Plus size={20} /> {t("employeeList.addNew")}
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl w-fit border border-gray-200">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === "active"
                ? "bg-white text-blue-600 shadow-md"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Users size={18} /> {t("employeeList.activeTab")} ({counts.active})
          </button>

          <button
            onClick={() => setActiveTab("inactive")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === "inactive"
                ? "bg-white text-rose-600 shadow-md"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <UserMinus size={18} /> {t("employeeList.resignedTab")} ({counts.inactive})
          </button>
        </div>

        {/* Filters */}
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
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
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
            ) : pageItems.length > 0 ? (
              pageItems.map((emp) => {
                const active = emp.isActive === true || emp.isActive === 1;

                return (
                  <tr
                    key={emp.id}
                    onClick={() => navigate(`/employees/${emp.id}`)}
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
                          setSelectedEmp(emp);
                          setExportOpen(true);
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

        {totalPages > 1 && (
          <PaginationBar
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          />
        )}
      </div>

      {/* Leave Policy Modal */}
      <LeavePolicyModal
        isOpen={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
      />

      {/* per-employee export */}
      <CsvForEmployee
        open={exportOpen}
        employee={selectedEmp}
        onClose={() => {
          setExportOpen(false);
          setSelectedEmp(null);
        }}
      />

      {/* ✅ Export All chooser */}
      <ExportAllChooser
        open={exportAllChooserOpen}
        onClose={() => setExportAllChooserOpen(false)}
        onPick={(mode) => {
          setExportAllChooserOpen(false);
          if (mode === "workbook") setExportAllWorkbookOpen(true);
          if (mode === "employeesList") setExportAllEmployeesListOpen(true);
        }}
      />

      {/* ✅ (1) Workbook export: per employee sheets */}
      <XlsxForEmployeesWorkbook
        open={exportAllWorkbookOpen}
        onClose={() => setExportAllWorkbookOpen(false)}
        employees={filteredEmployees}
      />

      {/* ✅ (2) Export employee list */}
      <CsvForEmployeesAll
        open={exportAllEmployeesListOpen}
        onClose={() => setExportAllEmployeesListOpen(false)}
        employees={filteredEmployees}
      />

      {/* Add Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 space-y-6 animate-in zoom-in duration-300 shadow-2xl relative my-auto">
            {/* Header */}
            <div className="flex items-center">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                {t("employeeCreate.title")}
              </h2>

              <button
                type="button"
                onClick={() => {
                  if (isLoading) return;
                  setRoleOpen(false);
                  setShowModal(false);
                }}
                className="ml-auto text-gray-400 hover:text-rose-500 transition-colors"
                aria-label={t("common.close")}
                title={t("common.close")}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-left">
              {/* Name Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                    {t("employeeCreate.firstName")}
                  </label>
                  <input
                    required
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    disabled={isLoading}
                    className="w-full rounded-2xl bg-gray-50 px-4 py-3 font-bold border-none outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                    {t("employeeCreate.lastName")}
                  </label>
                  <input
                    required
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    disabled={isLoading}
                    className="w-full rounded-2xl bg-gray-50 px-4 py-3 font-bold border-none outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                  {t("employeeCreate.email")}
                </label>
                <input
                  required
                  type="email"
                  placeholder={t("employeeCreate.emailPlaceholder")}
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  disabled={isLoading}
                  className="w-full rounded-2xl bg-gray-50 px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-300 disabled:opacity-60"
                />
              </div>

              {/* Role Dropdown */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                  {t("employeeCreate.role")}
                </label>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setRoleOpen((v) => !v)}
                    disabled={isLoading}
                    className={`w-full rounded-2xl px-4 py-3 font-bold outline-none transition-all
                      bg-gray-50 ring-1 ring-transparent hover:bg-gray-100
                      focus:ring-2 focus:ring-blue-100 disabled:opacity-60
                      ${roleOpen ? "ring-2 ring-blue-100 bg-gray-100" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-9 w-9 rounded-xl flex items-center justify-center border ${
                            formData.role === "HR"
                              ? "bg-blue-50 text-blue-700 border-blue-100"
                              : "bg-slate-50 text-slate-700 border-slate-100"
                          }`}
                        >
                          {formData.role === "HR" ? (
                            <ShieldCheck size={16} />
                          ) : (
                            <Briefcase size={16} />
                          )}
                        </span>

                        <div className="text-left">
                          <div className="text-slate-800">
                            {formData.role === "HR"
                              ? t("employeeCreate.roleHR")
                              : t("employeeCreate.roleWorker")}
                          </div>
                          <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                            {formData.role === "HR"
                              ? t("employeeCreate.hrAccess")
                              : t("employeeCreate.workerAccess")}
                          </div>
                        </div>
                      </div>

                      <ChevronDown
                        size={18}
                        className={`text-gray-400 transition-transform ${
                          roleOpen ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {roleOpen && (
                    <>
                      <button
                        type="button"
                        onClick={() => setRoleOpen(false)}
                        className="fixed inset-0 z-[60] cursor-default"
                        aria-label={t("employeeList.aria.closeRoleDropdown")}
                      />

                      <div className="absolute z-[70] mt-2 w-full rounded-2xl border border-gray-100 bg-white shadow-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, role: "Worker" });
                            setRoleOpen(false);
                          }}
                          className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-all ${
                            formData.role === "Worker" ? "bg-blue-50/40" : ""
                          }`}
                        >
                          <span className="h-9 w-9 rounded-xl bg-slate-50 text-slate-700 border border-slate-100 flex items-center justify-center">
                            <Briefcase size={16} />
                          </span>
                          <div className="flex-1">
                            <div className="font-black text-slate-800">
                              {t("employeeCreate.roleWorker")}
                            </div>
                            <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                              {t("employeeCreate.workerAccess")}
                            </div>
                          </div>
                          {formData.role === "Worker" && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">
                              {t("employeeCreate.selected")}
                            </span>
                          )}
                        </button>

                        <div className="h-px bg-gray-100" />

                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, role: "HR" });
                            setRoleOpen(false);
                          }}
                          className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-all ${
                            formData.role === "HR" ? "bg-blue-50/40" : ""
                          }`}
                        >
                          <span className="h-9 w-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center">
                            <ShieldCheck size={16} />
                          </span>
                          <div className="flex-1">
                            <div className="font-black text-slate-800">
                              {t("employeeCreate.roleHR")}
                            </div>
                            <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                              {t("employeeCreate.hrAccess")}
                            </div>
                          </div>
                          {formData.role === "HR" && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">
                              {t("employeeCreate.selected")}
                            </span>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <p className="text-[11px] text-gray-400 font-bold ml-1">
                  {t("employeeCreate.roleNote")}
                </p>
              </div>

              {/* Join Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                  {t("employeeCreate.joinDate")}
                </label>
                <input
                  required
                  type="date"
                  value={formData.joiningDate}
                  onChange={(e) =>
                    setFormData({ ...formData, joiningDate: e.target.value })
                  }
                  disabled={isLoading}
                  className="w-full rounded-2xl bg-gray-50 px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1 flex items-center gap-2">
                  <KeyRound size={12} /> {t("employeeCreate.password")}
                </label>
                <input
                  required
                  type="password"
                  placeholder={t("employeeCreate.passwordHint")}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  disabled={isLoading}
                  className="w-full rounded-2xl bg-gray-50 px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-amber-100 placeholder:font-medium placeholder:text-gray-300 disabled:opacity-60"
                />
              </div>

              {/* Footer */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (isLoading) return;
                    setRoleOpen(false);
                    setShowModal(false);
                  }}
                  disabled={isLoading}
                  className="py-4 rounded-2xl font-black border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-60"
                >
                  {t("employeeCreate.cancel")}
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="py-4 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:bg-gray-400 disabled:shadow-none"
                >
                  {isLoading ? t("employeeCreate.processing") : t("employeeCreate.submit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
