import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
// อย่าลืมลง library นี้: npm install socket.io-client
import { io } from "socket.io-client"; 
import { alertConfirm, alertError, alertSuccess } from "../../../utils/sweetAlert";
import { escapeHtml } from "../utils";
import { getSystemConfigs, processCarryOver, reopenYear } from "../../../api/leaveService";

const Ctx = createContext(null);

export function YearEndProcessingProvider({ children, carryOverLimitsRef, maxConsecutiveRef }) {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);

  const [targetYear, setTargetYear] = useState(new Date().getFullYear() + 1);
  const lastYear = useMemo(() => Number(targetYear) - 1, [targetYear]);

  const [quotas, setQuotas] = useState({
    ANNUAL: 0,
    SICK: 0,
    PERSONAL: 0,
    EMERGENCY: 0,
  });

  const handleQuotaChange = (type, value) => {
    setQuotas((prev) => ({ ...prev, [type]: Number(value) }));
  };

  const fetchConfigs = async () => {
    try {
      const data = await getSystemConfigs();
      setConfigs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch error:", error);
      alertError("Failed to Load Data", "Unable to retrieve system configuration.");
    }
  };

  // ✅ 1. โหลดข้อมูลครั้งแรก + เชื่อมต่อ Socket เพื่อรอฟังการอัปเดตจากเครื่องอื่น
  useEffect(() => {
    fetchConfigs();

    // ตั้งค่า Socket URL (ใช้ค่าเดียวกับที่ตั้งไว้ในไฟล์ config อื่นๆ)
    const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");
    
    const socket = io(API_URL, { 
      withCredentials: true,
      transports: ["websocket", "polling"]
    });

    // เมื่อ Backend บอกให้รีเฟรช (เช่น มีการ Lock ปีงบประมาณสำเร็จ)
    socket.on("notification_refresh", () => {
      console.log("🔄 System config updated via socket");
      fetchConfigs();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const buildProcessConfirmHtml = () => {
    const co = carryOverLimitsRef?.current || {};
    const maxConsecutiveHolidayDays = maxConsecutiveRef?.current ?? "-";

    const row = (label, value) => `
        <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #eee;">
        <div style="font-weight:900; letter-spacing:.12em; font-size:12px;">${escapeHtml(label)}</div>
        <div style="font-weight:900; font-size:12px; color:#111827;">
            ${escapeHtml(String(value))} day(s)
        </div>
        </div>
    `;

    return `
        <div style="text-align:left;">
        <div style="font-weight:900; font-size:16px; margin-bottom:6px;">
            Year-End Processing Summary
        </div>
        <div style="font-size:13px; margin-bottom:12px;">
            The system will process year-end for <b>${escapeHtml(targetYear)}</b>
            and lock <b>${escapeHtml(lastYear)}</b>.
        </div>

        <div style="border:1px solid #e5e7eb; border-radius:14px; padding:12px 14px; background:#f9fafb;">
            ${row("ANNUAL", co.ANNUAL ?? 0)}
            ${row("SICK", co.SICK ?? 0)}
            ${row("PERSONAL", co.PERSONAL ?? 0)}
            ${row("EMERGENCY", co.EMERGENCY ?? 0)}
        </div>

        <div style="margin-top:12px; font-size:12px; opacity:.8;">
            Max consecutive holiday days allowed:
            <b>${escapeHtml(String(maxConsecutiveHolidayDays))}</b> day(s)
        </div>
        </div>
    `.trim();
  };

  const handleProcess = async () => {
    if (loading) return;

    const confirmed = await alertConfirm(
      "Confirm Year-End Processing",
      buildProcessConfirmHtml(),
      "Confirm & Process"
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      // ✅ 2. แก้ไขชื่อ Parameter ตรงนี้ให้ตรงกับ Backend (carryConfigs)
      const res = await processCarryOver({
        targetYear: Number(targetYear),
        quotas,
        carryConfigs: carryOverLimitsRef?.current || {}, // แก้จาก carryOverLimits เป็น carryConfigs
      });

      await alertSuccess(
        "Processed Successfully",
        res?.message || "Year-end processing completed successfully."
      );
      await fetchConfigs();
    } catch (error) {
      const errorMsg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "An error occurred during processing.";
      alertError("Processing Failed", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleReopen = async (year) => {
    const confirmed = await alertConfirm(
      "Confirm Unlock",
      `
        <div style="text-align:left; line-height:1.7;">
          Do you want to unlock <b>${escapeHtml(year)}</b>?
          <div style="margin-top:8px; font-size:12px; opacity:.8;">
            Once unlocked, this year will be set to <b>Open</b> and can be edited again.
          </div>
        </div>
      `.trim(),
      "Unlock Year"
    );
    if (!confirmed) return;

    try {
      await reopenYear(year);
      await alertSuccess("Unlocked", `Year ${year} has been unlocked successfully.`);
      fetchConfigs();
    } catch (error) {
      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Unknown error";
      alertError("Unlock Failed", msg);
    }
  };

  const value = {
    configs,
    loading,
    targetYear,
    setTargetYear,
    lastYear,
    quotas,
    handleQuotaChange,
    handleProcess,
    handleReopen,
    fetchConfigs,
  };

  // ✅ NO JSX in .js
  return React.createElement(Ctx.Provider, { value }, children);
}

export function useYearEndProcessing() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useYearEndProcessing must be used within YearEndProcessingProvider");
  }
  return ctx;
}