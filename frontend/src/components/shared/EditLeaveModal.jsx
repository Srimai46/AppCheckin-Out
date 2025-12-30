import React, { useEffect, useMemo, useState } from "react";
import { X, Save, Upload } from "lucide-react";
import { alertConfirm } from "../../utils/sweetAlert";

const DURATIONS = [
  { value: "Full", label: "Full day" },
  { value: "HalfMorning", label: "Half day (AM)" },
  { value: "HalfAfternoon", label: "Half day (PM)" },
];

// ✅ ให้ส่งค่าตรงกับ Prisma enum: Full | HalfMorning | HalfAfternoon
const normalizeDuration = (v) => {
  if (!v) return "Full";
  const s = String(v).trim().replace(/\.$/, ""); // กันหลุด FULL.

  // รองรับของเก่า (ถ้าเคยใช้ FULL/AM/PM มาก่อน)
  if (s === "FULL") return "Full";
  if (s === "AM") return "HalfMorning";
  if (s === "PM") return "HalfAfternoon";

  // ถ้าส่งมาเป็น enum อยู่แล้วก็ปล่อยผ่าน
  if (s === "Full" || s === "HalfMorning" || s === "HalfAfternoon") return s;

  return "Full";
};

const toISODate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export default function EditLeaveModal({ open, leave, onClose, onSave }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  // ✅ ค่าเริ่มต้นต้องเป็น enum จริง
  const [startDuration, setStartDuration] = useState("Full");
  const [endDuration, setEndDuration] = useState("Full");
  const [attachmentFile, setAttachmentFile] = useState(null);

  useEffect(() => {
    if (!open || !leave) return;

    setStartDate(toISODate(leave.startDate));
    setEndDate(toISODate(leave.endDate));
    setReason(leave.reason || leave.note || "");

    // ✅ Normalize ค่าเก่า/ค่าหลุดให้ตรง enum
    setStartDuration(normalizeDuration(leave.startDuration));
    setEndDuration(normalizeDuration(leave.endDuration));

    setAttachmentFile(null);
  }, [open, leave]);

  const title = useMemo(() => {
    const type = leave?.leaveType?.typeName || leave?.type || "Leave";
    return `Edit ${type} Request`;
  }, [leave]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!leave?.id) return;

    const ok = await alertConfirm(
      "Save changes?",
      `Confirm update for request <b>#${leave.id}</b>?`,
      "Save"
    );
    if (!ok) return;

    // ✅ กันพลาดก่อนส่งออกไป backend
    const safeStartDuration = normalizeDuration(startDuration);
    const safeEndDuration = normalizeDuration(endDuration);

    onSave?.({
      id: leave.id,
      startDate,
      endDate,
      reason,
      startDuration: safeStartDuration,
      endDuration: safeEndDuration,
      attachmentFile,
    });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* modal */}
      <div className="relative w-full max-w-[720px] bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden">
        {/* header */}
        <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">
                {title}
              </div>
              <div className="mt-1 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                Request ID: #{leave?.id}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-11 h-11 rounded-full bg-slate-50 border border-slate-100 hover:bg-rose-50 hover:text-rose-600 transition flex items-center justify-center"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* body */}
        <div className="p-6 sm:p-8 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Start date
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-11 px-4 rounded-2xl bg-white border border-slate-200 font-black text-[12px] text-slate-800 outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                End date
              </div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-11 px-4 rounded-2xl bg-white border border-slate-200 font-black text-[12px] text-slate-800 outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Start duration
              </div>
              <select
                value={startDuration}
                onChange={(e) => setStartDuration(e.target.value)}
                className="w-full h-11 px-4 rounded-2xl bg-white border border-slate-200 font-black text-[12px] text-slate-800 outline-none focus:ring-2 focus:ring-blue-200"
              >
                {DURATIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                End duration
              </div>
              <select
                value={endDuration}
                onChange={(e) => setEndDuration(e.target.value)}
                className="w-full h-11 px-4 rounded-2xl bg-white border border-slate-200 font-black text-[12px] text-slate-800 outline-none focus:ring-2 focus:ring-blue-200"
              >
                {DURATIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Reason / Note
            </div>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 font-bold text-[12px] text-slate-800 outline-none focus:ring-2 focus:ring-blue-200 resize-none"
              placeholder="Update your reason..."
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition cursor-pointer font-black text-[11px] uppercase tracking-widest text-slate-700">
              <Upload size={16} />
              <span>Replace attachment</span>
              <input
                type="file"
                className="hidden"
                accept="image/*,application/pdf"
                onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
              />
            </label>

            {attachmentFile ? (
              <div className="text-[11px] font-black text-slate-600">
                Selected: <span className="font-bold">{attachmentFile.name}</span>
              </div>
            ) : (
              <div className="text-[11px] font-black text-slate-300">
                (Optional) Choose file to replace
              </div>
            )}
          </div>
        </div>

        {/* footer */}
        <div className="px-6 sm:px-8 py-5 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="h-11 px-5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition font-black text-[11px] uppercase tracking-widest text-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="h-11 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white transition font-black text-[11px] uppercase tracking-widest inline-flex items-center gap-2 active:scale-[0.98]"
          >
            <Save size={16} />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
