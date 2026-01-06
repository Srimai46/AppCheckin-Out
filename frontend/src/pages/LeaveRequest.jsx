import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar as CalendarIcon, Paperclip, X } from "lucide-react";
import { createLeaveRequest } from "../api/leaveService";
import { alertConfirm, alertSuccess, alertPolicyBlocked, alertError } from "../utils/sweetAlert";

export default function LeaveRequest() {
  
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState("");
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [duration, setDuration] = useState("Full"); // Full, HalfMorning, HalfAfternoon
  const [attachment, setAttachment] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ id must match typeName in DB (Sick, Personal, Annual, Emergency, Other)
  const leaveTypes = useMemo(
    () => [
      { id: "Sick", label: "Sick Leave" },
      { id: "Personal", label: "Personal Leave" },
      { id: "Annual", label: "Annual Leave" },
      { id: "Emergency", label: "Emergency Leave" },
      { id: "Other", label: "Other" },
    ],
    []
  );

  const durationLabel =
    duration === "Full"
      ? "Full Day (เต็มวัน)"
      : duration === "HalfMorning"
      ? "Half Day (Morning)"
      : "Half Day (Afternoon)";

  const prettyFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return "";
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let idx = 0;
    while (size >= 1024 && idx < units.length - 1) {
      size /= 1024;
      idx += 1;
    }
    return `${size.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
  };

  const escapeHtml = (v = "") =>
    String(v)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setAttachment(file);
  };

  const clearFile = () => {
    setAttachment(null);
    const el = document.getElementById("leave-attachment");
    if (el) el.value = "";
  };

  // ================================
  // ✅ Holiday overlap helpers
  // ================================
  const toISODate = (d) => {
    // ให้เป็น YYYY-MM-DD แบบ local (กัน timezone เพี้ยน)
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const normalizeHolidayDate = (h) => {
    // รองรับหลายชื่อ field เผื่อ backend ส่งมาไม่เหมือนกัน
    const raw =
      h?.date ||
      h?.holidayDate ||
      h?.holiday_date ||
      h?.day ||
      h?.holiday ||
      h?.startDate ||
      h?.start_date;

    if (!raw) return null;

    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return toISODate(d);
  };

  const normalizeHolidayName = (h) =>
    h?.name || h?.title || h?.holidayName || h?.holiday_name || "Holiday";

  const getHolidayListFromResponse = (payload) => {
    // รองรับรูปแบบ response: {data:[...]} หรือ {holidays:[...]} หรือเป็น array ตรง ๆ
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.holidays)) return payload.holidays;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
  };

  const findHolidayOverlaps = async (startISO, endISO) => {
    const start = new Date(startISO);
    const end = new Date(endISO);

    const years = new Set([start.getFullYear(), end.getFullYear()]);
    const all = [];

    for (const y of years) {
      const res = await fetchHolidays(y);
      const list = getHolidayListFromResponse(res);
      all.push(...list);
    }

    // ทำ lookup เป็น Map: date -> name
    const holidayMap = new Map();
    all.forEach((h) => {
      const iso = normalizeHolidayDate(h);
      if (!iso) return;
      if (!holidayMap.has(iso)) holidayMap.set(iso, normalizeHolidayName(h));
    });

    // ไล่ทุกวันในช่วงที่เลือก
    const overlaps = [];
    const cur = new Date(start);
    cur.setHours(0, 0, 0, 0);

    const endD = new Date(end);
    endD.setHours(0, 0, 0, 0);

    while (cur <= endD) {
      const iso = toISODate(cur);
      if (holidayMap.has(iso)) {
        overlaps.push({ date: iso, name: holidayMap.get(iso) });
      }
      cur.setDate(cur.getDate() + 1);
    }

    return overlaps;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedType) {
      return alertError("Missing Information", "Please select a leave type.");
    }
    if (!startDate || !endDate) {
      return alertError(
        "Missing Information",
        "Please specify both start and end dates."
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      return alertError("Invalid Date", "End date must be after the start date.");
    }

    // ✅ เช็ควันหยุด (ทำครั้งเดียวก่อน Confirm)
    try {
      const overlaps = await checkLeaveOverlapWithHoliday(startDate, endDate);

      if (overlaps.length > 0) {
        const primary = overlaps?.[0]?.date || null;
        const details = overlaps
          .slice(0, 6)
          .map((x) => `${escapeHtml(x.date)} — ${escapeHtml(x.name)}`);

        await alertPolicyBlocked({
          title: "Leave Request Blocked",
          message: "You can’t request leave on holidays or non-working days. ",
          primary,
          details,
        });
        return;
      }
    } catch (err) {
      console.error("[Holiday check failed]", err);
      // ถ้าอยากบล็อกตอนเช็คไม่ได้:
      // return alertError("System Error", "Cannot verify holiday dates. Please try again.");
    }

    const typeLabel =
      leaveTypes.find((t) => t.id === selectedType)?.label || selectedType;

    const fileLine = attachment
      ? `${attachment.name} (${prettyFileSize(attachment.size)})`
      : "- (None)";

    const confirmHtml = `
      <div style="text-align:left; line-height:1.6;">
        <div style="font-weight:800; margin-bottom:8px;">
          Leave Request Summary
        </div>
        <ul style="margin:0; padding-left:18px;">
          <li><b>Type</b> : ${escapeHtml(typeLabel)}</li>
          <li><b>Period</b> : ${escapeHtml(startDate)} - ${escapeHtml(endDate)}</li>
          <li><b>Duration</b> : ${escapeHtml(durationLabel)}</li>
          <li><b>Attachment</b> : ${escapeHtml(fileLine)}</li>
          ${
            reason?.trim()
              ? `<li><b>Reason</b>: ${escapeHtml(reason.trim())}</li>`
              : ""
          }
        </ul>
        <div style="margin-top:10px; font-size:12px; opacity:.75;">
          Please review the details before confirming.
        </div>
      </div>
    `.trim();

    const confirmed = await alertConfirm(
      "Confirm Leave Request",
      confirmHtml,
      "Submit Request"
    );
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("type", selectedType);
      formData.append("startDate", startDate);
      formData.append("endDate", endDate);
      formData.append("reason", reason || "");
      formData.append("startDuration", duration);
      formData.append("endDuration", duration);

      if (attachment) formData.append("attachment", attachment);

      const res = await createLeaveRequest(formData);

      await alertSuccess(
        "Request Submitted",
        res?.message || "Your leave request has been submitted."
      );
      navigate("/dashboard");
    } catch (error) {
      console.error(error);

      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "A system error occurred.";

      // ✅ ถ้า backend บล็อกเพราะ holiday/non-working -> ใช้ popup สวยเหมือนกัน
      if (
        typeof msg === "string" &&
        msg.toLowerCase().includes("cannot request leave")
      ) {
        const dateMatch = msg.match(/\d{4}-\d{2}-\d{2}/);
        const primary = dateMatch?.[0] || null;

        await alertPolicyBlocked({
          title: "Leave Request Blocked",
          message: "You can’t request leave on holidays or non-working days. ",
          primary,
          details: [escapeHtml(msg)],
        });
        return;
      }

      alertError("Submission Failed", msg);
    } finally {
      setIsLoading(false);
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
            Employee Leave Management System
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Left Column: Leave Type Selection */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-2">
                1. Select Leave Type (เลือกประเภทการลา){" "}
                <span className="text-red-500">*</span>
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
                    <div
                      className={`w-5 h-5 rounded-full border-4 mr-4 transition-colors ${
                        selectedType === type.id
                          ? "border-blue-600 bg-white"
                          : "border-gray-200"
                      }`}
                    />
                    <span
                      className={`font-black text-sm ${
                        selectedType === type.id
                          ? "text-blue-900"
                          : "text-slate-500"
                      }`}
                    >
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
                  2. Select Dates & Duration
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 ml-1">
                      Start
                    </span>
                    <input
                      type="date"
                      className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 ml-1">
                      End
                    </span>
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

                {/* Duration Picker */}
                <div className="flex bg-gray-100 p-1.5 rounded-2xl gap-1">
                  {[
                    { id: "Full", label: "Full Day" },
                    { id: "HalfMorning", label: "Half (Morning)" },
                    { id: "HalfAfternoon", label: "Half (Afternoon)" },
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
                  3. Reason
                </label>
                <textarea
                  rows="4"
                  placeholder="Please provide details..."
                  className="w-full p-5 bg-gray-50 border-none rounded-[2rem] font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              {/* Attachment (Optional) */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-2">
                  4. Attachment (Optional)
                </label>

                <div className="bg-gray-50 rounded-[2rem] p-4 border border-gray-100">
                  <div className="flex items-center justify-between gap-3">
                    <label className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white border border-gray-100 shadow-sm cursor-pointer hover:border-blue-200 transition-all">
                      <Paperclip size={16} className="text-slate-500" />
                      <span className="text-xs font-black uppercase tracking-widest text-slate-700">
                        Choose File
                      </span>
                      <input
                        id="leave-attachment"
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                        // accept=".pdf,.jpg,.jpeg,.png"
                      />
                    </label>

                    {attachment ? (
                      <button
                        type="button"
                        onClick={clearFile}
                        className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-red-600 hover:bg-red-50 transition-all"
                        title="Remove attachment"
                      >
                        <X size={16} />
                        Remove
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-gray-400">
                        No file selected
                      </span>
                    )}
                  </div>

                  {attachment && (
                    <div className="mt-3 rounded-2xl bg-white border border-gray-100 p-4">
                      <div className="text-xs font-black text-slate-700 break-all">
                        {attachment.name}
                      </div>
                      <div className="text-[10px] font-bold text-gray-400 mt-1">
                        {prettyFileSize(attachment.size)}
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-[10px] font-bold text-gray-400 ml-2">
                  You may attach supporting documents (e.g., medical certificate).  
                </p>
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
              Cancel
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className={`px-12 py-5 rounded-[2rem] bg-slate-900 text-white font-black text-xs uppercase tracking-[0.3em] shadow-xl transition-all active:scale-95 ${
                isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-600"
              }`}
            >
              {isLoading
                ? "Submitting request..."
                : "Submit Leave Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
