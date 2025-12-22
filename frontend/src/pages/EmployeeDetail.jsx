import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { X } from "lucide-react";
import {
  ArrowLeft,
  UserMinus,
  UserPlus,
  Briefcase,
  ShieldCheck,
  Loader2,
  Edit3,
  KeyRound,
} from "lucide-react";
import { alertConfirm, alertSuccess, alertError } from "../utils/sweetAlert";

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("attendance");
  const [updating, setUpdating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

const [leaveForm, setLeaveForm] = useState({
  type: "",
  start: "",
  end: "",
  reason: "",
});


  // ✅ เพิ่ม state สำหรับรหัสผ่านใหม่
  const [newPassword, setNewPassword] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    joiningDate: "",
    resignationDate: "",
  });

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

  // ✅ ฟังก์ชันรีเซ็ตรหัสผ่าน
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      return alertError("ผิดพลาด", "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
    }

    const confirmed = await alertConfirm(
      "ยืนยันการรีเซ็ตรหัสผ่าน",
      `ต้องการเปลี่ยนรหัสผ่านของ ${data.info.fullName} ใช่หรือไม่?`
    );
    if (!confirmed) return;

    try {
      setUpdating(true);
      await api.post(`/employees/${id}/reset-password`, { newPassword });
      await alertSuccess("สำเร็จ", "รีเซ็ตรหัสผ่านพนักงานเรียบร้อยแล้ว");
      setNewPassword(""); // ล้างค่าหลังทำรายการสำเร็จ
    } catch (err) {
      alertError(
        "ล้มเหลว",
        err.response?.data?.error || "ไม่สามารถรีเซ็ตรหัสผ่านได้"
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!data?.info) return;
    const isCurrentlyActive =
      data.info.isActive === true || data.info.isActive === 1;

    const confirmed = await alertConfirm(
      "ยืนยันการเปลี่ยนสถานะ",
      isCurrentlyActive
        ? "ต้องการเปลี่ยนเป็น 'พ้นสภาพ' ใช่ไหม?"
        : "ต้องการเปลี่ยนเป็น 'พนักงานปัจจุบัน' ใช่ไหม?"
    );

    if (!confirmed) return;

    try {
      setUpdating(true);
      await api.patch(`/employees/${id}/status`, {
        isActive: !isCurrentlyActive,
      });
      await alertSuccess("สำเร็จ", "อัปเดตสถานะเรียบร้อยแล้ว");
      fetchData();
    } catch (err) {
      alertError(
        "อัปเดตไม่สำเร็จ",
        err.response?.data?.error || "เกิดข้อผิดพลาด"
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleAddLeave = async (e) => {
  e.preventDefault();

  const confirmed = await alertConfirm(
    "ยืนยันการเพิ่มวันลา",
    "ต้องการเพิ่มวันลาให้พนักงานคนนี้ใช่หรือไม่?"
  );
  if (!confirmed) return;

  try {
    setUpdating(true);
    await api.post(`/employees/${id}/leaves`, leaveForm);
    await alertSuccess("สำเร็จ", "เพิ่มวันลาเรียบร้อย");
    setShowLeaveModal(false);
    setLeaveForm({ type: "", start: "", end: "", reason: "" });
    fetchData();
  } catch (err) {
    alertError(
      "ผิดพลาด",
      err.response?.data?.error || "ไม่สามารถเพิ่มวันลาได้"
    );
  } finally {
    setUpdating(false);
  }
};

  
  
  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    try {
      setUpdating(true);
      await api.put(`/employees/${id}`, formData);
      await alertSuccess("สำเร็จ", "อัปเดตข้อมูลพนักงานเรียบร้อย");
      setShowModal(false);
      fetchData();
    } catch (err) {
      alertError(
        "ผิดพลาด",
        err.response?.data?.error || "ไม่สามารถอัปเดตข้อมูลได้"
      );
    } finally {
      setUpdating(false);
    }
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-600 mr-2" />
        <span className="font-black text-gray-400 uppercase tracking-widest">
          Loading Profile...
        </span>
      </div>
    );

  if (!data || !data.info)
    return (
      <div className="p-10 text-center text-rose-600 font-black">
        ไม่พบข้อมูลพนักงาน
      </div>
    );

  const isEmpActive = data.info.isActive === true || data.info.isActive === 1;

  return (
    
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <button
        onClick={() => navigate(-1)}
        className="mb-2 flex items-center text-gray-400 hover:text-blue-600 font-black transition-all group"
      >
        <ArrowLeft
          size={18}
          className="mr-2 group-hover:-translate-x-1 transition-transform"
        />
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
              <h1 className="text-3xl font-black text-gray-800 tracking-tight">
                {data.info.fullName}
              </h1>
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
            const [fName, ...lNames] = data.info.fullName?.split(" ") || [
              "",
              "",
            ];
            setFormData({
              firstName: data.info.firstName || fName,
              lastName: data.info.lastName || lNames.join(" "),
              email: data.info.email || "",
              joiningDate: data.info.joiningDate || "",
            });
            setShowModal(true);
          }}
          className="px-8 py-4 rounded-2xl bg-blue-600 text-white hover:bg-blue-400 font-black flex items-center gap-2 shadow-lg transition-all active:scale-95"
        >
          <Edit3 size={18} /> จัดการข้อมูล
        </button>
      </div>

      {/* Modal Section (Enhanced with Password Reset) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 space-y-6 animate-in zoom-in duration-300 shadow-2xl relative my-auto">
<div className="flex items-center">
  <h2 className="text-2xl font-black text-gray-800">
    จัดการข้อมูลพนักงาน
  </h2>

  <button
    type="button"
    onClick={() => setShowModal(false)}
    className="ml-auto py-4 text-gray-400 font-black uppercase text-[10px] tracking-widest hover:text-gray-600 transition-all"
  >
    <X />
  </button>
</div>

            {/* 1. ส่วนแก้ไขข้อมูลทั่วไป */}
            <form
              onSubmit={handleUpdateInfo}
              className="space-y-4 border-b border-gray-100 pb-6"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                    ชื่อ
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
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
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={updating}
                className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
              >
                {updating ? "กำลังบันทึก..." : "อัปเดตชื่อ-นามสกุล"}
              </button>
            </form>

            {/* 2. ส่วนรีเซ็ตรหัสผ่าน */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest flex items-center gap-2">
                <KeyRound size={12} /> รีเซ็ตรหัสผ่านใหม่
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="ระบุรหัสผ่านใหม่อย่างน้อย 6 ตัว"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="flex-1 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-amber-100"
                />
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={updating}
                  className="px-4 bg-amber-500 text-white rounded-2xl hover:bg-amber-600 transition-all active:scale-95"
                >
                  รีเซ็ต
                </button>
              </div>
            </div>

            {/* 3. ส่วนเปลี่ยนสถานะและปิด */}
            <div className="pt-4 space-y-3">
              <button
                type="button"
                onClick={handleUpdateStatus}
                disabled={updating}
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black transition-all shadow-md ${
                  isEmpActive
                    ? "bg-rose-50 text-rose-600 border-2 border-rose-100 hover:bg-rose-600"
                    : "bg-emerald-50 text-emerald-600 border-2 border-emerald-100 hover:bg-emerald-600 hover:text-white"
                }`}
              >
                {isEmpActive ? (
                  <>
                    <UserMinus size={18} /> ปรับเป็นพ้นสภาพ
                  </>
                ) : (
                  <>
                    <UserPlus size={18} /> ปรับเป็นพนักงานปกติ
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

 {/* Modalเพิ่มโควต้าวันลา */}
{showLeaveModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
    <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 space-y-6 shadow-2xl">
      <div className="flex items-center">
        <h2 className="text-xl font-black">เพิ่มโควต้าวันลา</h2>
        <button
          onClick={() => setShowLeaveModal(false)}
          className="ml-auto text-gray-400 hover:text-gray-600"
        >
          <X />
        </button>
      </div>

      <form onSubmit={handleAddLeave} className="space-y-4">
       

        <button
          type="submit"
          disabled={updating}
          className="w-full py-4 rounded-xl bg-blue-600 text-white font-black"
        >
          บันทึกวันลา
        </button>
      </form>
    </div>
  </div>
)}



      {/* Leave Quota & Tables (ส่วนเดิมที่คงไว้) */}
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
                {q.remaining}{" "}
                <span className="text-xs font-normal text-gray-400">วัน</span>
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
 <div className="flex items-center">
      <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl w-fit border border-gray-200">
        {["attendance", "leave"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              tab === t
                ? "bg-white text-blue-600 shadow-md"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {t === "attendance" ? "ประวัติเข้างาน" : "ประวัติการลา"}
          </button>
        ))}
      </div>
              <button className="ml-auto px-4 py-1.5 rounded-2xl bg-blue-600 text-white hover:bg-blue-400 font-black flex items-center shadow-lg transition-all active:scale-95"
          onClick={() => setShowLeaveModal(true)}
        >
          เพิ่มโควต้าวันลา
        </button>
</div>
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
                  <tr
                    key={row.id}
                    className="hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="p-6 text-gray-700">{row.date}</td>
                    <td className="p-6 text-emerald-600">
                      {row.checkIn || "--:--"}
                    </td>
                    <td className="p-6 text-rose-500">
                      {row.checkOut || "--:--"}
                    </td>
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
                  <td
                    colSpan="4"
                    className="p-16 text-center text-gray-300 italic"
                  >
                    ไม่พบข้อมูลการเข้างาน
                  </td>
                </tr>
              )
            ) : data.leaves?.length > 0 ? (
              data.leaves.map((leave) => (
                <tr
                  key={leave.id}
                  className="hover:bg-blue-50/30 transition-colors"
                >
                  <td className="p-6 text-gray-800">{leave.type}</td>
                  <td className="p-6 text-gray-500 font-bold italic">
                    {leave.start} - {leave.end}
                  </td>
                  <td className="p-6 text-center text-slate-700 font-black">
                    {leave.days}
                  </td>
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
                  <td className="p-6 text-gray-400 italic max-w-xs truncate">
                    {leave.reason || "-"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="5"
                  className="p-16 text-center text-gray-300 italic"
                >
                  ไม่มีประวัติการลา
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
