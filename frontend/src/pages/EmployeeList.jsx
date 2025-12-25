import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import LeavePolicyModal from "../components/LeavePolicyModal";
import {
  Plus,
  User,
  X,
  Users,
  UserMinus,
  Loader2,
  SlidersHorizontal,
  ShieldCheck,
  Briefcase,
  ChevronDown,
  KeyRound,
} from "lucide-react";
import { alertConfirm, alertSuccess, alertError } from "../utils/sweetAlert";

function PaginationBar({ page, totalPages, onPrev, onNext }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50">
      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
        Page {page} / {totalPages}
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
          Prev
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
          Next
        </button>
      </div>
    </div>
  );
}

export default function EmployeeList() {
  const [statusOpen, setStatusOpen] = useState(false);

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
        "Failed to Load Data",
        err?.response?.data?.message ||
          "An error occurred while retrieving the information."
      );
    } finally {
      setLoading(false);
    }
  }, []);

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

  const totalPages = Math.max(
    1,
    Math.ceil(filteredEmployees.length / PAGE_SIZE)
  );
  const pageItems = filteredEmployees.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

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
      "Confirm Employee Creation",
      `
      <div style="text-align:left; line-height:1.7">
        <div style="font-weight:900; color:#0f172a; margin-bottom:6px">Please review the information below</div>
        <div style="color:#64748b; font-weight:800">
          - First Name: ${formData.firstName || "-"}<br/>
          - Last Name: ${formData.lastName || "-"}<br/>
          - Email: ${formData.email || "-"}<br/>
          - Role: ${formData.role || "-"}<br/>
          - Start Date: ${formData.joiningDate || "-"}<br/>
        </div>
      </div>
      `,
      "Create Employee"
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

      await alertSuccess("Success", "Added new employee successfully.");
      setShowModal(false);
      fetchEmployees();
    } catch (err) {
      alertError(
        "Failed",
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "An unexpected error occurred. Please try again."
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
          <User className="text-blue-600" /> Employee Directory
        </h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPolicyModal(true)}
            className="bg-white text-slate-800 px-4 py-2.5 rounded-xl flex items-center gap-2 border border-gray-200 hover:bg-gray-50 shadow-sm transition-all active:scale-95 font-black text-xs uppercase tracking-widest"
          >
            <SlidersHorizontal size={18} className="text-blue-600" />
            Leave Policy
          </button>

          <button
            onClick={handleOpenCreate}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95 font-bold text-sm"
          >
            <Plus size={20} /> Add New Employee
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
                : "text-gray-400"
            }`}
          >
            <Users size={18} /> Active ({counts.active})
          </button>

          <button
            onClick={() => setActiveTab("inactive")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === "inactive"
                ? "bg-white text-rose-600 shadow-md"
                : "text-gray-400"
            }`}
          >
            <UserMinus size={18} /> Resigned ({counts.inactive})
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
          {/* Role Filter */}

          {/* Role Filter (Custom Dropdown) */}
          <div className="relative w-40">
            <button
              type="button"
              onClick={() => setRoleOpenFilter((v) => !v)}
              className={`w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5
      text-xs font-black uppercase tracking-widest text-slate-700
      flex items-center justify-between transition-all
      hover:bg-gray-50
      ${roleOpenFilter ? "ring-2 ring-blue-100" : ""}
    `}
            >
              <span>
                {roleFilter === "all"
                  ? "All Roles"
                  : roleFilter === "HR"
                  ? "HR"
                  : "Worker"}
              </span>

              <ChevronDown
                size={14}
                className={`transition-transform ${
                  roleOpenFilter ? "rotate-180" : ""
                }`}
              />
            </button>

            {roleOpenFilter && (
              <>
                {/* click outside */}
                <button
                  type="button"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setRoleOpenFilter(false)}
                  aria-label="Close role dropdown"
                />

                <div className="absolute z-20 mt-2 w-full rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden">
                  {[
                    { value: "all", label: "All Roles" },
                    { value: "Worker", label: "Worker" },
                    { value: "HR", label: "HR" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setRoleFilter(opt.value);
                        setRoleOpenFilter(false);
                      }}
                      className={`w-full px-6 py-3 text-left text-sm font-black transition-all
              hover:bg-blue-50
              ${
                roleFilter === opt.value
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-700"
              }
            `}
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
            placeholder="Search name, email, ID..."
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
              <th className="p-6">ID</th>
              <th className="p-6">Name</th>
              <th className="p-6">Email</th>
              <th className="p-6 text-center">Role</th>
              <th className="p-6 text-center">Status</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan="5" className="p-20 text-center">
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
                    <td className="p-6 text-gray-400 font-bold text-sm">
                      #{emp.id}
                    </td>
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
                          {active ? "Working" : "Resigned"}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan="5"
                  className="p-20 text-center text-gray-300 font-black text-xs uppercase"
                >
                  No employees found
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

      {/* ✅ Add Employee Modal (ตามแบบภาพ + ใช้ create จริง) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 space-y-6 animate-in zoom-in duration-300 shadow-2xl relative my-auto">
            {/* Header */}
            <div className="flex items-center">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                Employee Information
              </h2>

              <button
                type="button"
                onClick={() => {
                  if (isLoading) return;
                  setRoleOpen(false);
                  setShowModal(false);
                }}
                className="ml-auto text-gray-400 hover:text-rose-500 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-left">
              {/* Name Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                    Name
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
                    Surname
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
                  Email
                </label>
                <input
                  required
                  type="email"
                  placeholder="Please enter email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  disabled={isLoading}
                  className="w-full rounded-2xl bg-gray-50 px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-300 disabled:opacity-60"
                />
              </div>

              {/* Role Dropdown (เหมือนภาพ) */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                  ROLE
                </label>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setRoleOpen((v) => !v)}
                    disabled={isLoading}
                    className={`w-full rounded-2xl px-4 py-3 font-bold outline-none transition-all
                      bg-gray-50 ring-1 ring-transparent hover:bg-gray-100
                      focus:ring-2 focus:ring-blue-100 disabled:opacity-60
                      ${roleOpen ? "ring-2 ring-blue-100 bg-gray-100" : ""}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-9 w-9 rounded-xl flex items-center justify-center border
                            ${
                              formData.role === "HR"
                                ? "bg-blue-50 text-blue-700 border-blue-100"
                                : "bg-slate-50 text-slate-700 border-slate-100"
                            }
                          `}
                        >
                          {formData.role === "HR" ? (
                            <ShieldCheck size={16} />
                          ) : (
                            <Briefcase size={16} />
                          )}
                        </span>

                        <div className="text-left">
                          <div className="text-slate-800">{formData.role}</div>
                          <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                            {formData.role === "HR"
                              ? "Full Access"
                              : "Standard Access"}
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
                        aria-label="Close role dropdown"
                      />

                      <div className="absolute z-[70] mt-2 w-full rounded-2xl border border-gray-100 bg-white shadow-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, role: "Worker" });
                            setRoleOpen(false);
                          }}
                          className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-all
                            ${formData.role === "Worker" ? "bg-blue-50/40" : ""}
                          `}
                        >
                          <span className="h-9 w-9 rounded-xl bg-slate-50 text-slate-700 border border-slate-100 flex items-center justify-center">
                            <Briefcase size={16} />
                          </span>
                          <div className="flex-1">
                            <div className="font-black text-slate-800">
                              Worker
                            </div>
                            <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                              Standard Access
                            </div>
                          </div>
                          {formData.role === "Worker" && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">
                              Selected
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
                          className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-all
                            ${formData.role === "HR" ? "bg-blue-50/40" : ""}
                          `}
                        >
                          <span className="h-9 w-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center">
                            <ShieldCheck size={16} />
                          </span>
                          <div className="flex-1">
                            <div className="font-black text-slate-800">HR</div>
                            <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                              Full Access
                            </div>
                          </div>
                          {formData.role === "HR" && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">
                              Selected
                            </span>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <p className="text-[11px] text-gray-400 font-bold ml-1">
                  หมายเหตุ: เปลี่ยน Role จะมีผลกับสิทธิ์การเข้าถึงระบบ
                </p>
              </div>

              {/* Join Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                  Join Date
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

              {/* Password (create) */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1 flex items-center gap-2">
                  <KeyRound size={12} /> Password
                </label>
                <input
                  required
                  type="password"
                  placeholder="Minimum 6 characters"
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
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="py-4 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:bg-gray-400 disabled:shadow-none"
                >
                  {isLoading ? "PROCESSING..." : "REGISTER"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
