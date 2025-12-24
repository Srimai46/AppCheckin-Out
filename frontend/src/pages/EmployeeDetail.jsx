import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import {
  X,
  ArrowLeft,
  UserMinus,
  UserPlus,
  Briefcase,
  ShieldCheck,
  Loader2,
  Edit3,
  KeyRound,
  Minus,
  Plus,
} from "lucide-react";
import { alertConfirm, alertSuccess, alertError } from "../utils/sweetAlert";

const TYPES = ["SICK", "PERSONAL", "ANNUAL", "EMERGENCY"];
const prettyLabel = (t) =>
  t === "SICK"
    ? "Sick"
    : t === "PERSONAL"
    ? "Personal"
    : t === "ANNUAL"
    ? "Annual"
    : "Emergency";

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("attendance");
  const [updating, setUpdating] = useState(false);

  const [showModal, setShowModal] = useState(false);

  // ✅ modal ปรับโควต้า (รายคน)
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [quotaLoading, setQuotaLoading] = useState(false);

  // ✅ draft โควต้า (totalDays ต่อประเภท)
  const [quotaDraft, setQuotaDraft] = useState({
    SICK: 0,
    PERSONAL: 0,
    ANNUAL: 0,
    EMERGENCY: 0,
  });

  // ✅ ฟอร์มแก้ไข (ตามบรรทัดที่ต้องการ)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "Worker",
    joiningDate: "",
    resignationDate: "",
  });

  // ✅ รหัสผ่าน + ยืนยันรหัสผ่าน (แถว 3-4)
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/employees/${id}`);
      setData(res.data);
    } catch (err) {
      console.error("Fetch error:", err);
      alertError("โหลดข้อมูลไม่สำเร็จ", "ไม่สามารถติดต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const isEmpActive = data?.info?.isActive === true || data?.info?.isActive === 1;

  // ✅ ช่วยดึง total ของ quota จาก data.quotas
  const totalFromServerByType = useMemo(() => {
    const m = { SICK: 0, PERSONAL: 0, ANNUAL: 0, EMERGENCY: 0 };
    (data?.quotas || []).forEach((q) => {
      const key = String(q.type || "").toUpperCase();
      if (m[key] !== undefined) m[key] = Number(q.total ?? 0);
    });
    return m;
  }, [data]);

  // ✅ เปิด modal แล้ว init ค่า draft จาก server
  const openQuotaModal = () => {
    setQuotaDraft({
      SICK: totalFromServerByType.SICK ?? 0,
      PERSONAL: totalFromServerByType.PERSONAL ?? 0,
      ANNUAL: totalFromServerByType.ANNUAL ?? 0,
      EMERGENCY: totalFromServerByType.EMERGENCY ?? 0,
    });
    setShowQuotaModal(true);
  };

  const closeQuotaModal = () => {
    if (quotaLoading) return;
    setShowQuotaModal(false);
  };

  const setQuota = (type, value) => {
    setQuotaDraft((prev) => ({
      ...prev,
      [type]: clamp(Number(value) || 0, 0, 365),
    }));
  };

  const handleUpdateStatus = async () => {
    if (!data?.info) return;
    const isCurrentlyActive = data.info.isActive === true || data.info.isActive === 1;

    const confirmed = await alertConfirm(
      "ยืนยันการเปลี่ยนสถานะ",
      isCurrentlyActive
        ? "ต้องการเปลี่ยนเป็น 'พ้นสภาพ' ใช่ไหม?"
        : "ต้องการเปลี่ยนเป็น 'พนักงานปัจจุบัน' ใช่ไหม?"
    );
    if (!confirmed) return;

    try {
      setUpdating(true);
      await api.patch(`/employees/${id}/status`, { isActive: !isCurrentlyActive });
      await alertSuccess("สำเร็จ", "อัปเดตสถานะเรียบร้อยแล้ว");
      setShowModal(false);
      fetchData();
    } catch (err) {
      alertError("อัปเดตไม่สำเร็จ", err.response?.data?.error || "เกิดข้อผิดพลาด");
    } finally {
      setUpdating(false);
    }
  };

  // ✅ บันทึกแบบรวม (ชื่อ+นามสกุล+อีเมล+รหัสผ่านใหม่ ถ้ามี)
  const handleSaveAll = async (e) => {
    e.preventDefault();

    // validate password ถ้ามีการกรอก
    const wantsChangePassword = Boolean(newPassword || confirmPassword);
    if (wantsChangePassword) {
      if (!newPassword || newPassword.length < 6) {
        return alertError("ผิดพลาด", "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      }
      if (newPassword !== confirmPassword) {
        return alertError("ผิดพลาด", "รหัสผ่านใหม่ และ ยืนยันรหัสผ่าน ต้องตรงกัน");
      }
    }

    const confirmed = await alertConfirm(
      "ยืนยันการบันทึกข้อมูล",
      `
      <div style="text-align:left; line-height:1.7">
        <div style="font-weight:900; color:#0f172a; margin-bottom:6px">
          พนักงาน: ${data?.info?.fullName || "-"}
        </div>
        <div style="color:#64748b; font-weight:800">
          - ชื่อ: ${formData.firstName || "-"}<br/>
          - นามสกุล: ${formData.lastName || "-"}<br/>
          - อีเมล: ${formData.email || "-"}<br/>
          ${
            wantsChangePassword
              ? `<span style="color:#f59e0b; font-weight:900">* มีการเปลี่ยนรหัสผ่าน</span>`
              : `<span style="color:#94a3b8; font-weight:900">* ไม่เปลี่ยนรหัสผ่าน</span>`
          }
        </div>
      </div>
      `,
      "บันทึก"
    );
    if (!confirmed) return;

    try {
      setUpdating(true);

      // 1) อัปเดตข้อมูลพื้นฐาน
      await api.put(`/employees/${id}`, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role,
        joiningDate: formData.joiningDate,
        resignationDate: formData.resignationDate,
      });

      // 2) ถ้าต้องการเปลี่ยนรหัสผ่าน ค่อยยิง reset-password
      if (wantsChangePassword) {
        await api.post(`/employees/${id}/reset-password`, { newPassword });
      }

      await alertSuccess("สำเร็จ", "บันทึกข้อมูลเรียบร้อยแล้ว");
      setNewPassword("");
      setConfirmPassword("");
      setShowModal(false);
      fetchData();
    } catch (err) {
      alertError("ผิดพลาด", err.response?.data?.error || "ไม่สามารถบันทึกข้อมูลได้");
    } finally {
      setUpdating(false);
    }
  };

  // ✅ Apply โควต้า “รายคน” (SICK/PERSONAL/ANNUAL/EMERGENCY)
  const handleApplyQuota = async () => {
    for (const t of TYPES) {
      const v = Number(quotaDraft[t]);
      if (!Number.isFinite(v) || v < 0 || v > 365) {
        return alertError("ข้อมูลไม่ถูกต้อง", `จำนวนวันลา ${t} ต้องอยู่ในช่วง 0 - 365`);
      }
    }

    const html = `
      <div style="text-align:left; line-height:1.6">
        <div style="margin-bottom:10px; color:#64748b; font-weight:800">
          ปรับโควตาวันลาให้พนักงาน: <span style="color:#0f172a">${data?.info?.fullName || ""}</span>
        </div>
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:14px">
          <div style="display:grid; grid-template-columns: 1fr auto; gap:10px; font-size:14px">
            ${TYPES.map(
              (t) => `
                <div style="color:#94a3b8; font-weight:800; letter-spacing:.12em; text-transform:uppercase; font-size:11px">${t}</div>
                <div style="color:#0f172a; font-weight:900">${Number(quotaDraft[t])} วัน</div>
              `
            ).join("")}
          </div>
        </div>
        <div style="margin-top:10px; color:#ef4444; font-size:12px; font-weight:800">
          หมายเหตุ: ปรับเฉพาะ “โควต้า (ทั้งหมด)” ของรายคนนี้
        </div>
      </div>
    `;

    const confirmed = await alertConfirm("ยืนยันปรับโควต้าวันลา (รายคน)", html, "ยืนยันปรับโควต้า");
    if (!confirmed) return;

    try {
      setQuotaLoading(true);

      await api.put(`/leaves/policy/quotas/${id}`, {
        quotas: {
          SICK: Number(quotaDraft.SICK),
          PERSONAL: Number(quotaDraft.PERSONAL),
          ANNUAL: Number(quotaDraft.ANNUAL),
          EMERGENCY: Number(quotaDraft.EMERGENCY),
        },
      });

      await alertSuccess("สำเร็จ", "อัปเดตโควต้าวันลาเรียบร้อยแล้ว");
      setShowQuotaModal(false);
      fetchData();
    } catch (err) {
      console.error("Apply quota error:", err);
      alertError(
        "อัปเดตไม่สำเร็จ",
        err.response?.data?.error || err.response?.data?.message || "เกิดข้อผิดพลาด"
      );
    } finally {
      setQuotaLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-600 mr-2" />
        <span className="font-black text-gray-400 uppercase tracking-widest">Loading Profile...</span>
      </div>
    );

  if (!data || !data.info)
    return <div className="p-10 text-center text-rose-600 font-black">ไม่พบข้อมูลพนักงาน</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <button
        onClick={() => navigate(-1)}
        className="mb-2 flex items-center text-gray-400 hover:text-blue-600 font-black transition-all group"
      >
        <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" />
        ย้อนกลับรายชื่อพนักงาน
      </button>

      {/* Header Profile Section */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div
            className={`h-24 w-24 rounded-3xl flex items-center justify-center text-white text-4xl font-black shadow-xl transition-all duration-500 ${
              isEmpActive ? "bg-blue-600" : "bg-slate-400"
            }`}
          >
            {data.info.fullName?.charAt(0) || "E"}
          </div>

          <div className="space-y-2 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <h1 className="text-3xl font-black text-gray-800 tracking-tight">{data.info.fullName}</h1>
              <span
                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 ${
                  isEmpActive
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                    : "bg-rose-50 text-rose-600 border-rose-100"
                }`}
              >
                {isEmpActive ? "พนักงานปัจจุบัน" : "พ้นสภาพ"}
              </span>
            </div>
            <p className="text-gray-500 font-bold">{data.info.email}</p>
            <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-2 text-[10px] font-black uppercase">
              <div className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-xl border border-blue-100 flex items-center gap-1.5">
                <Briefcase size={14} /> {data.info.role}
              </div>
              <div className="bg-gray-50 text-gray-600 px-4 py-1.5 rounded-xl border border-gray-100 flex items-center gap-1.5">
                <ShieldCheck size={14} /> เริ่มงาน: {data.info.joiningDate}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            const [fName, ...lNames] = data.info.fullName?.split(" ") || ["", ""];
            setFormData({
              firstName: data.info.firstName || fName,
              lastName: data.info.lastName || lNames.join(" "),
              email: data.info.email || "",
              role: data.info.role || "Worker",
              joiningDate: data.info.joiningDate || "",
              resignationDate: data.info.resignationDate || "",
            });
            setNewPassword("");
            setConfirmPassword("");
            setShowModal(true);
          }}
          className="px-8 py-4 rounded-2xl bg-blue-600 text-white hover:bg-blue-400 font-black flex items-center gap-2 shadow-lg transition-all active:scale-95"
        >
          <Edit3 size={18} /> จัดการข้อมูล
        </button>
      </div>

      {/* ✅ Leave Quota cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.quotas?.map((q, idx) => {
          const total = parseFloat(q.total);
          const used = parseFloat(q.used);
          const percent = total > 0 ? (used / total) * 100 : 0;

          return (
            <div
              key={idx}
              className="bg-white p-6 rounded-4xl shadow-sm border border-gray-100 hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                  {q.type}
                </span>
              </div>
              <div className="text-3xl font-black text-slate-800 tracking-tighter">
                {q.remaining} <span className="text-xs font-normal text-gray-400">วัน</span>
              </div>
              <div className="text-[10px] text-gray-400 mt-1 font-black uppercase tracking-tighter">
                ใช้แล้ว {used} / ทั้งหมด {total} วัน
              </div>
              <div className="mt-4 w-full bg-gray-50 h-1.5 rounded-full overflow-hidden border border-gray-50">
                <div
                  className={`h-full transition-all duration-700 ${
                    percent >= 100 ? "bg-rose-500" : "bg-blue-600"
                  }`}
                  style={{ width: `${Math.min(percent, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs + ✅ Button ปรับโควต้า */}
      <div className="flex items-center">
        <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl w-fit border border-gray-200">
          {["attendance", "leave"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                tab === t ? "bg-white text-blue-600 shadow-md" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {t === "attendance" ? "ประวัติเข้างาน" : "ประวัติการลา"}
            </button>
          ))}
        </div>

        <button
          className="ml-auto px-4 py-2.5 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 font-black flex items-center gap-2 shadow-lg transition-all active:scale-95"
          onClick={openQuotaModal}
        >
          ปรับโควต้าวันลา (รายคน)
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden mb-8">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50/50 border-b border-gray-100 font-black text-[10px] text-gray-400 uppercase tracking-widest">
            {tab === "attendance" ? (
              <tr>
                <th className="p-6">วันที่</th>
                <th className="p-6">เข้า</th>
                <th className="p-6">ออก</th>
                <th className="p-6 text-center">สถานะ</th>
              </tr>
            ) : (
              <tr>
                <th className="p-6">ประเภท</th>
                <th className="p-6">ระยะเวลา</th>
                <th className="p-6 text-center">วัน</th>
                <th className="p-6 text-center">สถานะ</th>
                <th className="p-6">เหตุผล</th>
              </tr>
            )}
          </thead>

          <tbody className="divide-y divide-gray-50 font-black uppercase text-[11px]">
            {tab === "attendance" ? (
              data.attendance?.length > 0 ? (
                data.attendance.map((row) => (
                  <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-6 text-gray-700">{row.date}</td>
                    <td className="p-6 text-emerald-600">{row.checkIn || "--:--"}</td>
                    <td className="p-6 text-rose-500">{row.checkOut || "--:--"}</td>
                    <td className="p-6 text-center">
                      <span
                        className={`px-4 py-1.5 rounded-lg border ${
                          row.status === "สาย"
                            ? "bg-rose-50 text-rose-600 border-rose-100"
                            : "bg-emerald-50 text-emerald-600 border-emerald-100"
                        }`}
                      >
                        {row.status || "ปกติ"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="p-16 text-center text-gray-300 italic">
                    ไม่พบข้อมูลการเข้างาน
                  </td>
                </tr>
              )
            ) : data.leaves?.length > 0 ? (
              data.leaves.map((leave) => (
                <tr key={leave.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-6 text-gray-800">{leave.type}</td>
                  <td className="p-6 text-gray-500 font-bold italic">
                    {leave.start} - {leave.end}
                  </td>
                  <td className="p-6 text-center text-slate-700 font-black">{leave.days}</td>
                  <td className="p-6 text-center">
                    <span
                      className={`px-4 py-1.5 rounded-lg border ${
                        leave.status === "Approved"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : leave.status === "Rejected"
                          ? "bg-rose-50 text-rose-600 border-rose-100"
                          : "bg-amber-50 text-amber-600 border-amber-100"
                      }`}
                    >
                      {leave.status}
                    </span>
                  </td>
                  <td className="p-6 text-gray-400 italic max-w-xs truncate">{leave.reason || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="p-16 text-center text-gray-300 italic">
                  ไม่มีประวัติการลา
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* จัดการข้อมูลพนักงาน */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 space-y-6 animate-in zoom-in duration-300 shadow-2xl relative my-auto">
            <div className="flex items-center">
              <h2 className="text-2xl font-black text-gray-800">จัดการข้อมูลพนักงาน</h2>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="ml-auto py-4 text-gray-400 font-black uppercase text-[10px] tracking-widest hover:text-gray-600 transition-all"
              >
                <X />
              </button>
            </div>

            <form onSubmit={handleSaveAll} className="space-y-4">
              {/* Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                    ชื่อ
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                    นามสกุล
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                  อีเมล
                </label>
                <input
                  required
                  type="email"
                  value={formData.email}
                  readOnly
                  className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              {/* Role */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  <option value="Worker">Worker</option>
                  <option value="HR">HR</option>
                </select>

                <p className="text-[11px] text-gray-400 font-bold ml-1">
                  หมายเหตุ: เปลี่ยน Role จะมีผลกับสิทธิ์การเข้าถึงระบบ
                </p>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1 flex items-center gap-2">
                  <KeyRound size={12} /> รหัสผ่านใหม่
                  <span className="text-[10px] font-black text-gray-300">(เว้นว่าง = ไม่เปลี่ยน)</span>
                </label>
                <input
                  type="password"
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-amber-100"
                />
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                  ยืนยันรหัสผ่าน
                </label>
                <input
                  type="password"
                  placeholder="พิมพ์ให้ตรงกับรหัสผ่านใหม่"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-amber-100"
                />
              </div>

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleUpdateStatus}
                  disabled={updating}
                  className={`py-4 rounded-2xl font-black transition-all shadow-md border-2 flex items-center justify-center gap-2 ${
                    isEmpActive
                      ? "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white"
                      : "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white"
                  }`}
                >
                  {isEmpActive ? (
                    <>
                      <UserMinus size={18} /> ปรับพ้นสภาพ
                    </>
                  ) : (
                    <>
                      <UserPlus size={18} /> ปรับเป็นปัจจุบัน
                    </>
                  )}
                </button>

                <button
                  type="submit"
                  disabled={updating}
                  className="py-4 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
                >
                  {updating ? "กำลังบันทึก..." : "บันทึกแก้ไข"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ปรับโควต้าวันลา (รายคน) */}
      {showQuotaModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] p-8 space-y-6 shadow-2xl">
            <div className="flex items-center">
              <h2 className="text-xl font-black">ปรับโควต้าวันลา (รายคน)</h2>
              <button
                onClick={closeQuotaModal}
                disabled={quotaLoading}
                className="ml-auto text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <X />
              </button>
            </div>

            <div className="text-sm font-bold text-slate-500">
              พนักงาน: <span className="text-slate-800">{data?.info?.fullName}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TYPES.map((t) => (
                <div key={t} className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {prettyLabel(t)}
                    </div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Total Days
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuota(t, Number(quotaDraft[t]) - 1)}
                      disabled={quotaLoading}
                      className="h-11 w-11 rounded-2xl bg-white border border-gray-200 hover:bg-gray-100 active:scale-95 transition-all flex items-center justify-center"
                    >
                      <Minus size={18} />
                    </button>

                    <input
                      type="number"
                      min={0}
                      max={365}
                      value={quotaDraft[t]}
                      onChange={(e) => setQuota(t, e.target.value)}
                      disabled={quotaLoading}
                      className="flex-1 h-11 rounded-2xl border border-gray-200 bg-white px-4 font-black text-slate-800 outline-none focus:ring-2 focus:ring-blue-100"
                    />

                    <button
                      type="button"
                      onClick={() => setQuota(t, Number(quotaDraft[t]) + 1)}
                      disabled={quotaLoading}
                      className="h-11 w-11 rounded-2xl bg-white border border-gray-200 hover:bg-gray-100 active:scale-95 transition-all flex items-center justify-center"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  <div className="mt-2 text-[11px] text-gray-500 font-bold">ช่วงที่แนะนำ: 0 - 365 วัน</div>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-rose-100 bg-rose-50 p-4">
              <div className="text-[11px] font-black text-rose-600 uppercase tracking-widest">Warning</div>
              <div className="text-sm font-bold text-rose-700 mt-1">
                หากตั้ง “Total” ต่ำกว่า “Used” ระบบจะปรับให้เท่ากับ Used อัตโนมัติ (เพื่อไม่ให้คงเหลือติดลบ)
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={closeQuotaModal}
                disabled={quotaLoading}
                className="flex-1 py-4 rounded-3xl font-black text-[11px] uppercase tracking-widest
                  border border-gray-200 bg-white text-gray-500
                  hover:bg-gray-50 hover:text-slate-700
                  transition-all active:scale-[0.98] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleApplyQuota}
                disabled={quotaLoading}
                className={`flex-1 py-4 rounded-3xl font-black text-sm shadow-xl
                  transition-all active:scale-[0.98] ${
                    quotaLoading
                      ? "bg-blue-600/60 text-white cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
                  }`}
              >
                {quotaLoading ? "UPDATING..." : "APPLY"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
