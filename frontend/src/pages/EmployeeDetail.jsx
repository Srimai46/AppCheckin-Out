// frontend/src/pages/EmployeeDetail.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import {
  ArrowLeft,
  Briefcase,
  ShieldCheck,
  Edit3,
  Settings2,
  X,
  KeyRound,
  UserMinus,
  UserPlus,
  Minus,
  Plus,
  ChevronDown,
} from "lucide-react";
import { alertConfirm, alertSuccess, alertError } from "../utils/sweetAlert";

// Shared Components
import { QuotaCards, HistoryTable } from "../components/shared";
import LeaveSummaryPopup from "../components/shared/LeaveSummaryPopup";
import { getLeaveTypes } from "../api/leaveService";

// ✅ 1. Import Dashboard Component ที่เพิ่งสร้าง
import AttendanceDashboardComponent from "./yearEnd/components/AttendanceDashboard"; // ปรับ Path ตามที่คุณวางไฟล์จริง

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [roleOpen, setRoleOpen] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [data, setData] = useState(null);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("attendance");

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [showModal, setShowModal] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
    joiningDate: "",
  });

  const [quotaDraft, setQuotaDraft] = useState({
    SICK: 0,
    PERSONAL: 0,
    ANNUAL: 0,
    EMERGENCY: 0,
  });

  // ================= Fetch Data =================
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [res, types] = await Promise.all([
        api.get(`/employees/${id}?year=${selectedYear}`),
        getLeaveTypes(),
      ]);

      setData(res.data);

      const list = Array.isArray(types) ? types : types?.data || [];
      setLeaveTypes(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error(err);
      alertError("Request Failed", "Could not retrieve employee data.");
      setLeaveTypes([]);
    } finally {
      setLoading(false);
    }
  }, [id, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ================= Years (Auto) =================
  const years = useMemo(() => {
    if (!data) return [selectedYear];

    const currentYear = new Date().getFullYear();
    const FUTURE_YEARS = 2;

    const dataYears = [
      ...(data.attendance || []).map((r) => new Date(r.date || r.dateDisplay).getFullYear()),
      ...(data.leaves || []).map((r) => new Date(r.startDate).getFullYear()),
    ].filter(Number.isFinite);

    const maxYear = Math.max(currentYear, ...dataYears);
    const futureYears = Array.from({ length: FUTURE_YEARS }, (_, i) => maxYear + i + 1);

    return [...new Set([currentYear, ...dataYears, ...futureYears])].sort((a, b) => a - b);
  }, [data, selectedYear]);

  // ================= Quota Update =================
  const handleApplyQuota = async () => {
    const confirmed = await alertConfirm("Confirm Quota Update", "Update leave quotas for this year?");
    if (!confirmed) return;

    try {
      setQuotaLoading(true);
      await api.put(`/leaves/policy/quotas/${id}`, {
        quotas: quotaDraft,
        year: selectedYear,
      });
      alertSuccess("Success", "Quota updated successfully.");
      setShowQuotaModal(false);
      fetchData();
    } catch {
      alertError("Failed", "Failed to update quota.");
    } finally {
      setQuotaLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center font-black italic text-blue-600">
        LOADING PROFILE...
      </div>
    );
  }

  const handleSaveAll = async (e) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      return alertError("Error", "The passwords do not match.");
    }

    const confirmed = await alertConfirm("Confirm Update", "Are you sure?");
    if (!confirmed) return;

    try {
      setUpdating(true);
      await api.put(`/employees/${id}`, formData);
      if (newPassword) await api.post(`/employees/${id}/reset-password`, { newPassword });
      await alertSuccess("Success", "Information updated.");
      setShowModal(false);
      fetchData();
    } catch (err) {
      alertError("Request Failed", err.response?.data?.error || "An error occurred");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStatus = async () => {
    const isCurrentlyActive = data.info.isActive;
    const confirmed = await alertConfirm(
      "Confirm Status Change",
      `Change to ${isCurrentlyActive ? "Resigned" : "Active"}?`
    );
    if (!confirmed) return;

    try {
      setUpdating(true);
      await api.patch(`/employees/${id}/status`, {
        isActive: !isCurrentlyActive,
      });
      alertSuccess("Success", "Status changed successfully.");
      setShowModal(false);
      fetchData();
    } catch (err) {
      alertError("Request Failed", "Failed to change status.");
    } finally {
      setUpdating(false);
    }
  };

  // ================= UI =================
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-400 hover:text-blue-600 font-black text-sm"
      >
        <ArrowLeft size={16} className="mr-2" />
        BACK
      </button>

      {/* 1. Profile Header */}
      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6 transition-all hover:shadow-md">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="h-28 w-28 rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-5xl font-black shadow-xl shadow-blue-100 uppercase">
            {data.info.firstName?.charAt(0)}
          </div>

          <div className="space-y-2 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <h1 className="text-4xl font-black text-slate-800 tracking-tight">{data.info.fullName}</h1>
              <span
                className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 ${
                  data.info.isActive
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                    : "bg-rose-50 text-rose-600 border-rose-100"
                }`}
              >
                {data.info.isActive ? "Working" : "Resigned"}
              </span>
            </div>

            <p className="text-slate-400 font-bold text-lg italic">{data.info.email}</p>

            <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-2">
              <span className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl border border-blue-100 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
                <Briefcase size={14} /> {data.info.role}
              </span>
              <span className="bg-slate-50 text-slate-600 px-4 py-2 rounded-xl border border-slate-100 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
                <ShieldCheck size={14} /> Joined: {data.info.joiningDate}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setFormData({
              firstName: data.info.firstName,
              lastName: data.info.lastName,
              email: data.info.email,
              role: data.info.role,
              joiningDate: data.info.joiningDate,
            });
            setShowModal(true);
          }}
          className="px-8 py-5 rounded-[2rem] bg-slate-900 text-white font-black flex items-center gap-3 hover:bg-slate-800 active:scale-95 transition-all shadow-xl shadow-slate-200 text-sm uppercase tracking-widest"
        >
          <Edit3 size={18} /> Manage Info
        </button>
      </div>

      {/* 2. Leave Balance Summary */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-4">
          <div className="flex items-center gap-2 font-black text-slate-400 text-[11px] uppercase tracking-widest">
            <Settings2 size={14} /> Leave Balance
          </div>
          
          <div className="w-44">
            <LeaveSummaryPopup
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
              years={years}
              formatYear={(y) => y}
              leaveTypes={leaveTypes}
              quotas={data?.quotas || []}
              leaves={data?.leaves || []}
            />
          </div>
        </div>
      </div>

      {/* 4. Detailed History Table */}
      <HistoryTable
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        attendanceData={data.attendance || []}
        leaveData={data.leaves || []}
      />

      {/* ✅ 3. Attendance Dashboard Component */}
<div className="bg-white p-6 rounded-[3rem] border border-gray-100 shadow-sm">
   <AttendanceDashboardComponent 
      propEmployeeId={id} // ดึง id จาก useParams() ของหน้า EmployeeDetail
      hideTitle={false}    
      targetEmployeeId={id}
   />
</div>



      {/* ===== Modals (Quota & Edit Info) ===== */}
      {showQuotaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-8 space-y-6">
            <h2 className="text-xl font-black">Adjust Quota ({selectedYear})</h2>

            <div className="grid grid-cols-2 gap-4">
              {Object.keys(quotaDraft).map((t) => (
                <div key={t} className="p-4 rounded-2xl bg-gray-50">
                  <div className="flex justify-between mb-2 text-xs font-black">
                    <span>{t}</span>
                    <span>{quotaDraft[t]} days</span>
                  </div>

                  <div className="flex justify-between">
                    <button
                      onClick={() =>
                        setQuotaDraft((p) => ({
                          ...p,
                          [t]: Math.max(0, p[t] - 1),
                        }))
                      }
                    >
                      <Minus />
                    </button>
                    <button
                      onClick={() =>
                        setQuotaDraft((p) => ({
                          ...p,
                          [t]: p[t] + 1,
                        }))
                      }
                    >
                      <Plus />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowQuotaModal(false)}
                className="flex-1 py-4 rounded-2xl border font-black"
              >
                CANCEL
              </button>
              <button
                onClick={handleApplyQuota}
                disabled={quotaLoading}
                className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-black"
              >
                {quotaLoading ? "UPDATING..." : "APPLY"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 space-y-6 animate-in zoom-in duration-300 shadow-2xl relative my-auto">
            <div className="flex items-center">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Employee Information</h2>
              <button
                onClick={() => setShowModal(false)}
                className="ml-auto text-gray-400 hover:text-rose-500 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveAll} className="space-y-4 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Name</label>
                  <input
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full rounded-2xl bg-gray-50 px-4 py-3 font-bold border-none outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Surname</label>
                  <input
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full rounded-2xl bg-gray-50 px-4 py-3 font-bold border-none outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  readOnly
                  className="w-full rounded-2xl bg-gray-100 px-4 py-3 font-bold text-gray-400 cursor-not-allowed outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">ROLE</label>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setRoleOpen((v) => !v)}
                    className={`w-full rounded-2xl px-4 py-3 font-bold outline-none transition-all
                      bg-gray-50 ring-1 ring-transparent hover:bg-gray-100
                      focus:ring-2 focus:ring-blue-100
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
                          {formData.role === "HR" ? <ShieldCheck size={16} /> : <Briefcase size={16} />}
                        </span>

                        <div className="text-left">
                          <div className="text-slate-800">{formData.role}</div>
                          <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                            {formData.role === "HR" ? "Full Access" : "Standard Access"}
                          </div>
                        </div>
                      </div>

                      <ChevronDown
                        size={18}
                        className={`text-gray-400 transition-transform ${roleOpen ? "rotate-180" : ""}`}
                      />
                    </div>
                  </button>

                  {roleOpen && (
                    <>
                      <button
                        type="button"
                        onClick={() => setRoleOpen(false)}
                        className="fixed inset-0 z-[70] cursor-default"
                        aria-label="Close role dropdown"
                      />

                      <div className="absolute z-[80] mt-2 w-full rounded-2xl border border-gray-100 bg-white shadow-xl overflow-hidden">
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
                            <div className="font-black text-slate-800">Worker</div>
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

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1 flex items-center gap-2">
                  <KeyRound size={12} /> New Password{" "}
                  <span className="text-[10px] font-black text-gray-300 normal-case">(เว้นว่าง = ไม่เปลี่ยน)</span>
                </label>
                <input
                  type="password"
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-2xl bg-gray-50 px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-amber-100 placeholder:font-medium placeholder:text-gray-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Confirm Password</label>
                <input
                  type="password"
                  placeholder="พิมพ์ให้ตรงกับรหัสผ่านใหม่"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-2xl bg-gray-50 px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-amber-100 placeholder:font-medium placeholder:text-gray-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleUpdateStatus}
                  className={`py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 ${
                    data.info.isActive
                      ? "bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100"
                      : "bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100"
                  }`}
                >
                  {data.info.isActive ? <UserMinus size={18} /> : <UserPlus size={18} />}
                  {data.info.isActive ? "Terminate" : "Reinstate"}
                </button>

                <button
                  type="submit"
                  disabled={updating}
                  className="py-4 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:bg-gray-400 disabled:shadow-none"
                >
                  {updating ? "กำลังบันทึก..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}