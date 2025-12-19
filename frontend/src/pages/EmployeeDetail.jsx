import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import {
  ArrowLeft,
  PieChart,
  UserMinus,
  UserPlus,
  Briefcase,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { alertConfirm, alertSuccess, alertError } from "../utils/sweetAlert";

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("attendance");
  const [updating, setUpdating] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);

      const res = await api.get(`/employees/${id}`);
      setData(res.data);
    } catch (err) {
      console.error("Fetch error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "ไม่สามารถโหลดข้อมูลพนักงานได้";

      await alertError("โหลดข้อมูลไม่สำเร็จ", msg);
    } finally {
      setLoading(false);
    }
  };

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    joiningDate: "",
    resignationDate: "",
  });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ✅ Logic สำหรับเปลี่ยนสถานะ (ใช้ SweetAlert)
  const handleUpdateStatus = async () => {
    if (!data?.info) return;

    const isCurrentlyActive =
      data.info.isActive === true || data.info.isActive === 1;

    const confirmed = await alertConfirm(
      "ยืนยันการเปลี่ยนสถานะ",
      isCurrentlyActive
        ? "ต้องการเปลี่ยนสถานะเป็น “ไม่ใช่พนักงาน / พ้นสภาพ” ใช่ไหม?"
        : "ต้องการเปลี่ยนสถานะเป็น “พนักงานปัจจุบัน” ใช่ไหม?",
      isCurrentlyActive
        ? "ยืนยันเปลี่ยนเป็นพ้นสภาพ"
        : "ยืนยันเปลี่ยนเป็นพนักงาน"
    );

    if (!confirmed) return;

    try {
      setUpdating(true);

      await api.patch(`/employees/${id}/status`, {
        isActive: !isCurrentlyActive,
      });

      await alertSuccess("อัปเดตสำเร็จ", "อัปเดตสถานะพนักงานเรียบร้อยแล้ว");
      fetchData();
    } catch (err) {
      console.error("Update status error:", err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "เกิดข้อผิดพลาด กรุณาลองใหม่";
      alertError("อัปเดตไม่สำเร็จ", msg);
    } finally {
      setUpdating(false);
    }
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
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

      {/* Header Profile */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6 transition-all">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div
            className={`h-24 w-24 rounded-3xl flex items-center justify-center text-white text-4xl font-black shadow-xl transition-all duration-500 ${
              isEmpActive
                ? "bg-blue-600 shadow-blue-100"
                : "bg-slate-400 shadow-slate-100"
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
                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                  isEmpActive
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                    : "bg-rose-50 text-rose-600 border-rose-100"
                }`}
              >
                ตอนนี้:{" "}
                {isEmpActive ? "พนักงานปัจจุบัน" : "ไม่ใช่พนักงาน / พ้นสภาพ"}
              </span>
            </div>

            <p className="text-gray-500 font-bold">{data.info.email}</p>

            <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-2">
              <div className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase border border-blue-100 flex items-center gap-1.5">
                <Briefcase size={14} /> {data.info.role}
              </div>
              <div className="bg-gray-50 text-gray-600 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase border border-gray-100 flex items-center gap-1.5">
                <ShieldCheck size={14} /> เริ่มงาน: {data.info.joiningDate}
              </div>
            </div>
          </div>
        </div>

        <button
  onClick={() => {
    // ถ้า backend มี firstName / lastName
    const firstName =
      data.info.firstName ||
      data.info.fullName?.split(" ")[0] ||
      "";

    const lastName =
      data.info.lastName ||
      data.info.fullName?.split(" ").slice(1).join(" ") ||
      "";

    setFormData({
      firstName,
      lastName,
      email: data.info.email || "",
      joiningDate: data.info.joiningDate || "",
      resignationDate: data.info.resignationDate || "",
    });

    setShowModal(true);
  }}
  className="px-6 py-2.5 rounded-xl bg-sky-50 text-sky-600 border-2 border-sky-100 hover:bg-sky-600 hover:text-white font-black"
>
  ✏️ แก้ไขข้อมูล
</button>
<form
  onSubmit={async (e) => {
    e.preventDefault(); // กัน reload
    try {
      await api.put(`/employees/${id}`, formData);
      await alertSuccess("สำเร็จ", "อัปเดตข้อมูลเรียบร้อย");
      setShowModal(false);
      fetchData();
    } catch (err) {
      alertError("ผิดพลาด", "ไม่สามารถอัปเดตข้อมูลได้");
    }
  }}
>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white w-full max-w-lg rounded-3xl p-8 space-y-5 animate-in fade-in zoom-in">
              <h2 className="text-xl font-black text-gray-800">
                แก้ไขข้อมูลพนักงาน
              </h2>

             {[
  ["firstName", "ชื่อ"],
  ["lastName", "นามสกุล"],
  ["email", "Email"],
].map(([key, label]) => {
  const isEmail = key === "email";

  return (
    <div key={key}>
      <label className="text-xs font-black text-gray-500 uppercase">
        {label}
      </label>

      <input
        type="text"
        value={formData[key] || ""}
        onChange={(e) =>
          setFormData({ ...formData, [key]: e.target.value })
        }
        disabled={isEmail}
        className={`mt-1 w-full rounded-xl border px-4 py-2.5 font-bold
          focus:outline-none focus:ring-2 focus:ring-blue-500
          ${
            isEmail
              ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
              : "border-gray-200"
          }`}
      />
                  </div>
                );
              })}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={handleUpdateStatus}
                  disabled={updating}
                  className={`flex items-center gap-2 px-8 py-4 rounded-2xl text-xs font-black transition-all active:scale-95 shadow-lg ${
                    updating ? "opacity-60 cursor-not-allowed" : ""
                  } ${
                    isEmpActive
                      ? "bg-rose-50 text-rose-600 border-2 border-rose-100 hover:bg-rose-600 hover:text-white"
                      : "bg-emerald-50 text-emerald-600 border-2 border-emerald-100 hover:bg-emerald-600 hover:text-white"
                  }`}
                >
                  {isEmpActive ? (
                    <>
                      <UserMinus size={18} /> เปลี่ยนเป็น "ไม่ใช่พนักงาน"
                    </>
                  ) : (
                    <>
                      <UserPlus size={18} /> เปลี่ยนเป็น "พนักงานปัจจุบัน"
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 rounded-xl border font-black text-gray-500 hover:bg-gray-100"
                >
                  ยกเลิก
                </button>

                <button
                type="submit"
                  onClick={async () => {
                    try {
                      await api.put(`/employees/${id}`, formData);
                      await alertSuccess("สำเร็จ", "อัปเดตข้อมูลเรียบร้อย");
                      setShowModal(false);
                      fetchData();
                    } catch (alertError) {
                      alertError("ผิดพลาด", "ไม่สามารถอัปเดตข้อมูลได้");
                    }
                  }}
                  className="px-6 py-2 rounded-xl bg-blue-600 text-white font-black hover:bg-blue-700"
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        )}
        </form>

      </div>

      {/* Leave Quota Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.isArray(data.quotas) && data.quotas.length > 0 ? (
          data.quotas.map((q, idx) => {
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
                  <PieChart size={18} className="text-blue-500" />
                </div>

                <div className="text-3xl font-black text-slate-800 tracking-tighter">
                  {q.remaining}{" "}
                  <span className="text-xs font-normal text-gray-400">วัน</span>
                </div>

                <div className="text-[10px] text-gray-400 mt-1 font-black uppercase">
                  ใช้แล้ว {used} / ทั้งหมด {total} วัน
                </div>

                <div className="mt-4 w-full bg-gray-50 h-2 rounded-full overflow-hidden border border-gray-100">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      percent >= 100 ? "bg-rose-500" : "bg-blue-600"
                    }`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full p-10 bg-gray-50 text-gray-400 rounded-3xl text-center font-black border-2 border-dashed">
            ไม่มีข้อมูลโควตาวันลา
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl w-fit border border-gray-200">
        <button
          onClick={() => setTab("attendance")}
          className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            tab === "attendance"
              ? "bg-white text-blue-600 shadow-md"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          ประวัติเข้างาน
        </button>
        <button
          onClick={() => setTab("leave")}
          className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            tab === "leave"
              ? "bg-white text-blue-600 shadow-md"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          ประวัติการลา
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
              (data.attendance || []).length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="p-16 text-center text-gray-300 italic"
                  >
                    ไม่พบข้อมูล
                  </td>
                </tr>
              ) : (
                (data.attendance || []).map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="p-6 text-gray-700">{row.date}</td>
                    <td className="p-6 text-emerald-600 font-black">
                      {row.checkIn || "--:--"}
                    </td>
                    <td className="p-6 text-rose-500 font-black">
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
              )
            ) : (data.leaves || []).length === 0 ? (
              <tr>
                <td
                  colSpan="5"
                  className="p-16 text-center text-gray-300 italic"
                >
                  ไม่มีประวัติการลา
                </td>
              </tr>
            ) : (
              (data.leaves || []).map((leave) => (
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
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
