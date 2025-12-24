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
            page <= 1 ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed" : "bg-white text-slate-800 border-gray-200 hover:bg-gray-50"
          }`}
        >
          Prev
        </button>
        <button
          onClick={onNext}
          disabled={page >= totalPages}
          className={`h-9 px-4 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 ${
            page >= totalPages ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed" : "bg-white text-slate-800 border-gray-200 hover:bg-gray-50"
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
  const [isLoading, setIsLoading] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", password: "", role: "Worker", joiningDate: ""
  });

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/employees");
      const list = Array.isArray(res?.data) ? res.data : (res?.data?.employees || res?.data?.data || []);
      setEmployees(list);
    } catch (err) {
      alertError("โหลดข้อมูลไม่สำเร็จ", err?.response?.data?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  // ✅ Optimized Count Logic
  const counts = useMemo(() => {
    return employees.reduce((acc, emp) => {
      const isActive = emp.isActive === true || emp.isActive === 1;
      isActive ? acc.active++ : acc.inactive++;
      return acc;
    }, { active: 0, inactive: 0 });
  }, [employees]);

  // ✅ Optimized Search & Filter
  const filteredEmployees = useMemo(() => {
    const keyword = search.toLowerCase().trim();
    return employees.filter((emp) => {
      const isEmpActive = emp.isActive === true || emp.isActive === 1;
      const matchStatus = activeTab === "active" ? isEmpActive : !isEmpActive;
      if (!matchStatus) return false;
      if (!keyword) return true;
      return (
        emp.firstName?.toLowerCase().includes(keyword) ||
        emp.lastName?.toLowerCase().includes(keyword) ||
        emp.email?.toLowerCase().includes(keyword) ||
        String(emp.id).includes(keyword)
      );
    });
  }, [employees, activeTab, search]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE));
  const pageItems = filteredEmployees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [activeTab, search]);

  const onChange = (key) => (e) => setFormData(p => ({ ...p, [key]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    const confirmed = await alertConfirm("ยืนยันการเพิ่มพนักงาน", "โปรดตรวจสอบข้อมูลให้ถูกต้อง", "เพิ่มพนักงาน");
    if (!confirmed) return;

    try {
      setIsLoading(true);
      await api.post("/employees", formData);
      await alertSuccess("สำเร็จ", "เพิ่มพนักงานใหม่เรียบร้อยแล้ว");
      setShowModal(false);
      setFormData({ firstName: "", lastName: "", email: "", password: "", role: "Worker", joiningDate: "" });
      fetchEmployees();
    } catch (err) {
      alertError("ล้มเหลว", err?.response?.data?.error || "ไม่สามารถเพิ่มพนักงานได้");
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
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95 font-bold text-sm"
          >
            <Plus size={20} /> Add New Employee
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl w-fit border border-gray-200">
          <button onClick={() => setActiveTab("active")} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "active" ? "bg-white text-blue-600 shadow-md" : "text-gray-400"}`}>
            <Users size={18} /> Active ({counts.active})
          </button>
          <button onClick={() => setActiveTab("inactive")} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "inactive" ? "bg-white text-rose-600 shadow-md" : "text-gray-400"}`}>
            <UserMinus size={18} /> Resigned ({counts.inactive})
          </button>
        </div>
        <input
          type="text"
          placeholder="Search employee..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:ml-auto w-full sm:w-80 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100"
        />
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
              <tr><td colSpan="5" className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" /></td></tr>
            ) : pageItems.length > 0 ? (
              pageItems.map((emp) => (
                <tr key={emp.id} onClick={() => navigate(`/employees/${emp.id}`)} className="hover:bg-blue-50/30 cursor-pointer transition-all group">
                  <td className="p-6 text-gray-400 font-bold text-sm">#{emp.id}</td>
                  <td className="p-6 font-black text-slate-800">{emp.firstName} {emp.lastName}</td>
                  <td className="p-6 text-gray-500 text-sm font-medium italic">{emp.email}</td>
                  <td className="p-6 text-center">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${emp.role === "HR" ? "bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-600"}`}>{emp.role}</span>
                  </td>
                  <td className="p-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${emp.isActive ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500"}`} />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${emp.isActive ? "text-emerald-600" : "text-rose-600"}`}>{emp.isActive ? "Working" : "Resigned"}</span>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="5" className="p-20 text-center text-gray-300 font-black text-xs uppercase">No employees found</td></tr>
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <PaginationBar page={page} totalPages={totalPages} onPrev={() => setPage(p => Math.max(1, p - 1))} onNext={() => setPage(p => Math.min(totalPages, p + 1))} />
        )}
      </div>

      {/* ✅ Leave Policy Modal Component */}
      <LeavePolicyModal isOpen={showPolicyModal} onClose={() => setShowPolicyModal(false)} />

      {/* Add Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 relative shadow-2xl animate-in zoom-in duration-300">
            <button onClick={() => !isLoading && setShowModal(false)} className="absolute top-8 right-8 text-gray-300 hover:text-rose-500" disabled={isLoading}><X size={24} /></button>
            <h2 className="text-2xl font-black mb-8 text-slate-800 tracking-tight">Add New Employee</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input required placeholder="First Name" className="bg-gray-50 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100" value={formData.firstName} onChange={onChange("firstName")} disabled={isLoading} />
                <input required placeholder="Last Name" className="bg-gray-50 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100" value={formData.lastName} onChange={onChange("lastName")} disabled={isLoading} />
              </div>
              <input required placeholder="Email Address" type="email" className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100" value={formData.email} onChange={onChange("email")} disabled={isLoading} />
              <input required placeholder="Password" type="password" className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100" value={formData.password} onChange={onChange("password")} disabled={isLoading} />
              <div className="grid grid-cols-2 gap-4">
                <select className="bg-gray-50 rounded-2xl p-4 text-sm font-bold outline-none" value={formData.role} onChange={onChange("role")} disabled={isLoading}>
                  <option value="Worker">Worker</option>
                  <option value="HR">HR</option>
                </select>
                <input required type="date" className="bg-gray-50 rounded-2xl p-4 text-sm font-bold outline-none" value={formData.joiningDate} onChange={onChange("joiningDate")} disabled={isLoading} />
              </div>
              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 rounded-3xl font-black text-[11px] uppercase border border-gray-200 text-gray-500">Cancel</button>
                <button type="submit" disabled={isLoading} className="flex-1 py-5 rounded-3xl font-black text-sm bg-blue-600 text-white shadow-xl">{isLoading ? "PROCESSING..." : "REGISTER"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}