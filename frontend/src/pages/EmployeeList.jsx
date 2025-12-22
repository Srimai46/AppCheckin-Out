import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { Plus, User, X, Users, UserMinus, Loader2 } from "lucide-react";
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
          className={`h-9 px-4 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all active:scale-95
            ${
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
          className={`h-9 px-4 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all active:scale-95
            ${
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
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("active");

  // ✅ กันเปิด modal แล้วหน้าขาว
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "Worker",
    joiningDate: "",
  });

  const [search, setSearch] = useState("");

  // ✅ pagination
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const resetForm = () =>
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "Worker",
      joiningDate: "",
    });

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get("/employees");

      // รองรับหลายรูปแบบ response
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res?.data?.employees)
        ? res.data.employees
        : [];

      setEmployees(list);
      setPage(1); // ✅ รีเซ็ตหน้าเมื่อโหลดใหม่
    } catch (err) {
      console.error("Fetch Error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "ไม่สามารถดึงรายชื่อพนักงานได้";
      alertError("โหลดข้อมูลไม่สำเร็จ", msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const activeCount = useMemo(
    () => employees.filter((e) => e.isActive === true || e.isActive === 1).length,
    [employees]
  );

  const inactiveCount = useMemo(
    () => employees.filter((e) => e.isActive === false || e.isActive === 0).length,
    [employees]
  );

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const isEmpActive = emp.isActive === true || emp.isActive === 1;
      const matchStatus = activeTab === "active" ? isEmpActive : !isEmpActive;

      const keyword = search.toLowerCase().trim();
      const matchSearch =
        emp.firstName?.toLowerCase().includes(keyword) ||
        emp.lastName?.toLowerCase().includes(keyword) ||
        emp.email?.toLowerCase().includes(keyword) ||
        String(emp.id).includes(keyword);

      return matchStatus && matchSearch;
    });
  }, [employees, activeTab, search]);

  // ✅ เมื่อเปลี่ยน tab หรือ search ให้กลับไปหน้า 1
  useEffect(() => {
    setPage(1);
  }, [activeTab, search]);

  // ✅ clamp หน้าเมื่อจำนวน filtered ลดลง
  useEffect(() => {
    const total = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE));
    setPage((p) => clamp(p, 1, total));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredEmployees.length]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE));
  const pageItems = filteredEmployees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const onChange = (key) => (e) => setFormData((p) => ({ ...p, [key]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();

    // ✅ Basic validation
    if (!formData.firstName.trim()) return alertError("ข้อมูลไม่ครบ", "กรุณากรอก First Name");
    if (!formData.lastName.trim()) return alertError("ข้อมูลไม่ครบ", "กรุณากรอก Last Name");
    if (!formData.email.trim()) return alertError("ข้อมูลไม่ครบ", "กรุณากรอก Email");
    if (!formData.password) return alertError("ข้อมูลไม่ครบ", "กรุณากรอก Password");
    if (!formData.joiningDate) return alertError("ข้อมูลไม่ครบ", "กรุณาเลือก Joining Date");

    const roleBadge =
      formData.role === "HR"
        ? `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#eef2ff;color:#4f46e5;font-weight:800">HR</span>`
        : `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#f1f5f9;color:#334155;font-weight:800">Worker</span>`;

    const confirmed = await alertConfirm(
      "ยืนยันการเพิ่มพนักงาน",
      `
      <div style="text-align:left; line-height:1.6">
        <div style="margin-bottom:10px; color:#64748b; font-weight:600">
          โปรดตรวจสอบข้อมูลก่อนยืนยัน
        </div>

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:14px">
          <div style="display:grid; grid-template-columns:120px 1fr; gap:8px 12px; font-size:14px">
            <div style="color:#94a3b8; font-weight:700">ชื่อ</div>
            <div style="color:#0f172a; font-weight:800">${formData.firstName} ${formData.lastName}</div>

            <div style="color:#94a3b8; font-weight:700">Email</div>
            <div style="color:#0f172a; font-weight:700">${formData.email}</div>

            <div style="color:#94a3b8; font-weight:700">Role</div>
            <div>${roleBadge}</div>

            <div style="color:#94a3b8; font-weight:700">Joining</div>
            <div style="color:#0f172a; font-weight:700">${formData.joiningDate}</div>
          </div>
        </div>

        <div style="margin-top:10px; color:#64748b; font-size:12px">
          กด “ยืนยันเพิ่มพนักงาน” เพื่อบันทึกข้อมูล
        </div>
      </div>
      `,
      "ยืนยันเพิ่มพนักงาน"
    );

    if (!confirmed) return;

    try {
      setIsLoading(true);
      await api.post("/employees", formData);

      await alertSuccess("เพิ่มพนักงานสำเร็จ", "ระบบได้บันทึกข้อมูลพนักงานเรียบร้อยแล้ว");

      setShowModal(false);
      resetForm();
      fetchEmployees();
    } catch (err) {
      console.error("Create Error:", err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "ไม่สามารถเพิ่มพนักงานได้";
      alertError("เพิ่มพนักงานไม่สำเร็จ", msg);
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    if (isLoading) return;
    setShowModal(false);
    resetForm();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-center gap-4">
        <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
          <User className="text-blue-600" /> Employee Directory
        </h1>

        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95 font-bold text-sm"
        >
          <Plus size={20} /> Add New Employee
        </button>
      </div>

      {/* Tabs + Search */}
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
            <Users size={18} /> Active ({activeCount})
          </button>

          <button
            onClick={() => setActiveTab("inactive")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === "inactive"
                ? "bg-white text-rose-600 shadow-md"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <UserMinus size={18} /> Resigned ({inactiveCount})
          </button>
        </div>

        <input
          type="text"
          placeholder="Search employee..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:ml-auto w-full sm:w-80 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 border-b border-gray-100 font-black text-[10px] text-gray-400 uppercase tracking-widest">
            <tr>
              <th className="p-6">ID</th>
              <th className="p-6">Employee Name</th>
              <th className="p-6">Email Address</th>
              <th className="p-6 text-center">Role</th>
              <th className="p-6 text-center">Status</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan="5" className="p-20 text-center">
                  <Loader2 className="animate-spin mx-auto text-blue-600 mb-2" />
                  <span className="font-bold text-gray-400">Loading directory...</span>
                </td>
              </tr>
            ) : pageItems.length > 0 ? (
              pageItems.map((emp) => {
                const isActive = emp.isActive === true || emp.isActive === 1;

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

                    <td className="p-6 text-gray-500 text-sm font-medium italic">{emp.email}</td>

                    <td className="p-6 text-center">
                      <span
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                          emp.role === "HR"
                            ? "bg-indigo-50 text-indigo-600 border border-indigo-100"
                            : "bg-slate-50 text-slate-600 border border-slate-100"
                        }`}
                      >
                        {emp.role}
                      </span>
                    </td>

                    <td className="p-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            isActive
                              ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                              : "bg-rose-500"
                          }`}
                        />
                        <span
                          className={`text-[10px] font-black uppercase tracking-widest ${
                            isActive ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {isActive ? "Working" : "Resigned"}
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
                  className="p-20 text-center text-gray-300 font-black uppercase tracking-widest text-xs"
                >
                  No employees found in this category
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {!loading && filteredEmployees.length > 0 && (
          <PaginationBar
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          />
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 relative animate-in zoom-in duration-300 shadow-2xl">
            <button
              onClick={closeModal}
              className="absolute top-8 right-8 text-gray-300 hover:text-rose-500 transition-colors"
              aria-label="Close"
              type="button"
              disabled={isLoading}
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-black mb-8 text-slate-800 tracking-tight">
              Add New Employee
            </h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">
                    First Name
                  </label>
                  <input
                    required
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                    value={formData.firstName}
                    onChange={onChange("firstName")}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">
                    Last Name
                  </label>
                  <input
                    required
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                    value={formData.lastName}
                    onChange={onChange("lastName")}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">
                  Email Address
                </label>
                <input
                  required
                  type="email"
                  className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                  value={formData.email}
                  onChange={onChange("email")}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">
                  Password
                </label>
                <input
                  required
                  type="password"
                  className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                  value={formData.password}
                  onChange={onChange("password")}
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">
                    Role
                  </label>
                  <select
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                    value={formData.role}
                    onChange={onChange("role")}
                    disabled={isLoading}
                  >
                    <option value="Worker">Worker</option>
                    <option value="HR">HR</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">
                    Joining Date
                  </label>
                  <input
                    required
                    type="date"
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                    value={formData.joiningDate}
                    onChange={onChange("joiningDate")}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-5 rounded-3xl font-black text-sm shadow-xl mt-6 transition-all active:scale-[0.98] ${
                  isLoading
                    ? "bg-blue-600/60 text-white cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
                }`}
              >
                {isLoading ? "PROCESSING..." : "REGISTER EMPLOYEE"}
              </button>

              <button
                type="button"
                onClick={closeModal}
                disabled={isLoading}
                className="w-full py-4 rounded-3xl font-black text-[11px] uppercase tracking-widest text-gray-400 hover:text-slate-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
