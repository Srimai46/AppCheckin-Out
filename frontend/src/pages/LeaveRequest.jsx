import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { createLeaveRequest } from "../api/leaveService";

export default function LeaveRequest() {
  const navigate = useNavigate();

  const [selectedType, setSelectedType] = useState("");
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [duration, setDuration] = useState("Full"); // Enum: Full, HalfMorning, HalfAfternoon
  const [isLoading, setIsLoading] = useState(false);

  // ✅ แก้ไข: id ต้องตรงกับ typeName ใน Database (Sick, Personal, Annual, Emergency, Other)
  const leaveTypes = [
    { id: "Sick", label: "ลาป่วย (Sick Leave)" },
    { id: "Personal", label: "ลากิจ (Personal Leave)" },
    { id: "Annual", label: "ลาพักร้อน (Annual Leave)" },
    { id: "Emergency", label: "ลาฉุกเฉิน (Emergency Leave)" },
    { id: "Other", label: "อื่นๆ (Other)" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedType) return alert("กรุณาเลือกประเภทการลา");
    if (!startDate || !endDate)
      return alert("กรุณาระบุวันที่เริ่มต้นและสิ้นสุด");
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end)
      return alert("วันที่สิ้นสุด ต้องมาทีหลังวันที่เริ่มต้น");

    // แปลงชื่อประเภทการลาเพื่อแสดงใน Confirm Dialog
    const typeLabel = leaveTypes.find(t => t.id === selectedType)?.label || selectedType;
    const durationLabel = 
      duration === "Full" ? "เต็มวัน" : 
      duration === "HalfMorning" ? "ครึ่งวันเช้า" : "ครึ่งวันบ่าย";

    const confirmMsg = `ยืนยันการส่งใบลาประเภท "${typeLabel}" แบบ ${durationLabel} ใช่หรือไม่?`;

    if (window.confirm(confirmMsg)) {
      setIsLoading(true);
      try {
        // 👇 เตรียมข้อมูลส่ง Backend ให้ตรงกับ Schema และ Controller
        const payload = {
          type: selectedType, // ส่ง 'Sick', 'Personal' ฯลฯ
          startDate: startDate,
          endDate: endDate,
          reason: reason,
          startDuration: duration,
          endDuration: duration,
        };

        await createLeaveRequest(payload);

        alert("✅ ส่งใบลาเรียบร้อยแล้ว!");
        navigate("/dashboard");
      } catch (error) {
        console.error(error);
        // แสดง Error Message ที่ส่งมาจาก Backend (เช่น "วันลาไม่พอ" หรือ "ลาซ้ำซ้อน")
        alert(
          "❌ ไม่สามารถลาได้: " + (error.response?.data?.error || "เกิดข้อผิดพลาดที่ระบบ")
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
        <div className="mb-8 border-b border-gray-50 pb-6">
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <CalendarIcon size={24} />
            </div>
            Leave Request (ยื่นคำขอลา)
          </h1>
          <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-2 ml-14">
            ระบบจัดการวันลาพนักงาน
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            
            {/* Left Column: Leave Type Selection */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-2">
                1. เลือกประเภทการลา <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 gap-3">
                {leaveTypes.map((type) => (
                  <div
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`flex items-center p-5 rounded-3xl border-2 cursor-pointer transition-all duration-300 ${
                      selectedType === type.id
                        ? "border-blue-500 bg-blue-50/50 ring-4 ring-blue-50"
                        : "border-gray-50 hover:border-blue-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-4 mr-4 transition-colors ${
                      selectedType === type.id ? "border-blue-600 bg-white" : "border-gray-200"
                    }`} />
                    <span className={`font-black text-sm ${
                      selectedType === type.id ? "text-blue-900" : "text-slate-500"
                    }`}>
                      {type.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Date, Duration & Reason */}
            <div className="space-y-8">
              
              {/* Date Selection */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-2">
                  2. เลือกวันที่และระยะเวลา
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 ml-1">เริ่ม</span>
                    <input
                      type="date"
                      className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 ml-1">สิ้นสุด</span>
                    <input
                      type="date"
                      className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Duration Picker (Radio-style Buttons) */}
                <div className="flex bg-gray-100 p-1.5 rounded-2xl gap-1">
                  {[
                    { id: "Full", label: "เต็มวัน" },
                    { id: "HalfMorning", label: "ครึ่งเช้า" },
                    { id: "HalfAfternoon", label: "ครึ่งบ่าย" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDuration(opt.id)}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        duration === opt.id
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason Input */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-2">
                  3. เหตุผลการลา
                </label>
                <textarea
                  rows="4"
                  placeholder="โปรดระบุรายละเอียดความจำเป็น..."
                  className="w-full p-5 bg-gray-50 border-none rounded-[2rem] font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                ></textarea>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="mt-12 flex items-center justify-between pt-8 border-t border-gray-50">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-slate-600 transition-colors"
            >
              ยกเลิก (Cancel)
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`px-12 py-5 rounded-[2rem] bg-slate-900 text-white font-black text-xs uppercase tracking-[0.3em] shadow-xl transition-all active:scale-95 ${
                isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-600"
              }`}
            >
              {isLoading ? "กำลังส่งข้อมูล..." : "ส่งคำขอลา"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}