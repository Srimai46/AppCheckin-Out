import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar as CalendarIcon, Paperclip, X } from "lucide-react";
import { createLeaveRequest } from "../api/leaveService";
import {
  alertConfirm,
  alertSuccess,
  alertPolicyBlocked,
  alertError,
} from "../utils/sweetAlert";
import { useTranslation } from "react-i18next";

export default function LeaveRequest() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [selectedType, setSelectedType] = useState("");
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [duration, setDuration] = useState("Full");
  const [attachment, setAttachment] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const leaveTypes = useMemo(
    () => [
      { id: "Sick", label: t("leaveRequest.type") + " - Sick" },
      { id: "Personal", label: t("leaveRequest.type") + " - Personal" },
      { id: "Annual", label: t("leaveRequest.type") + " - Annual" },
      { id: "Emergency", label: t("leaveRequest.type") + " - Emergency" },
      { id: "Other", label: t("leaveRequest.type") + " - Other" },
    ],
    [t]
  );

  const durationLabel =
    duration === "Full"
      ? t("leaveRequest.fullDay")
      : duration === "HalfMorning"
      ? t("leaveRequest.halfMorning")
      : t("leaveRequest.halfAfternoon");

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

  const handleFileChange = (e) => {
    setAttachment(e.target.files?.[0] || null);
  };

  const clearFile = () => {
    setAttachment(null);
    const el = document.getElementById("leave-attachment");
    if (el) el.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedType) {
      return alertError(
        t("common.missingInfo"),
        t("leaveRequest.errors.missingType")
      );
    }

    if (!startDate || !endDate) {
      return alertError(
        t("common.missingInfo"),
        t("leaveRequest.errors.missingDates")
      );
    }

    if (new Date(startDate) > new Date(endDate)) {
      return alertError(
        t("common.error"),
        t("leaveRequest.errors.invalidDate")
      );
    }

    const confirmed = await alertConfirm(
      t("leaveRequest.confirmTitle"),
      t("leaveRequest.confirmText"),
      t("leaveRequest.confirmButton")
    );
    if (!confirmed) return;

    try {
      setIsLoading(true);

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
        t("leaveRequest.successTitle"),
        res?.message || t("leaveRequest.successMessage")
      );
      navigate("/dashboard");
    } catch (error) {
      alertError(
        t("leaveRequest.submissionFailed"),
        error?.response?.data?.message || t("common.systemError")
      );
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
            {t("leaveRequest.headerTitle")}
          </h1>
          <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-2 ml-14">
            {t("leaveRequest.headerSubtitle")}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Left */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-2">
                {t("leaveRequest.step1")}{" "}
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
                      className={`w-5 h-5 rounded-full border-4 mr-4 ${
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

            {/* Right */}
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
                <input
                  type="date"
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>

              <div className="flex bg-gray-100 p-1.5 rounded-2xl gap-1">
                {[
                  { id: "Full", label: t("leaveRequest.fullDay") },
                  {
                    id: "HalfMorning",
                    label: t("leaveRequest.halfMorning"),
                  },
                  {
                    id: "HalfAfternoon",
                    label: t("leaveRequest.halfAfternoon"),
                  },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDuration(opt.id)}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                      duration === opt.id
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-400"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <textarea
                rows="4"
                className="w-full p-5 bg-gray-50 border-none rounded-[2rem] font-bold text-sm"
                placeholder={t("leaveRequest.placeholderReason")}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />

              <div className="bg-gray-50 rounded-[2rem] p-5 border border-gray-100">
                <label
                  htmlFor="leave-attachment"
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white rounded-xl shadow-sm">
                      <Paperclip size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-700">
                        {t("leaveRequest.chooseFile")}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                    Browse
                  </span>
                </label>

                <input
                  id="leave-attachment"
                  type="file"
                  hidden
                  onChange={handleFileChange}
                />

                {attachment && (
                  <div className="mt-4 flex items-center justify-between bg-white rounded-xl px-4 py-3 text-xs font-bold">
                    <span>
                      {attachment.name} ({prettyFileSize(attachment.size)})
                    </span>
                    <button type="button" onClick={clearFile}>
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-12 flex items-center justify-between pt-8 border-t border-gray-50">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400"
            >
              {t("leaveRequest.cancel")}
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="px-12 py-5 rounded-[2rem] bg-slate-900 text-white font-black text-xs uppercase tracking-[0.3em]"
            >
              {isLoading
                ? t("leaveRequest.submitting")
                : t("leaveRequest.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
