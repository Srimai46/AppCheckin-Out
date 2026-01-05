// frontend/src/pages/yearEnd/hooks/useYearEndProcessing.js
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { io } from "socket.io-client";
import {
  alertConfirm,
  alertError,
  alertSuccess,
} from "../../../utils/sweetAlert";
import { escapeHtml } from "../utils";
import {
  getSystemConfigs,
  processCarryOver,
  reopenYear,
} from "../../../api/leaveService";

const Ctx = createContext(null);

export function YearEndProcessingProvider({ children, carryOverLimitsRef }) {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);

  const [targetYear, setTargetYear] = useState(
    new Date().getFullYear() + 1
  );
  const lastYear = useMemo(() => Number(targetYear) - 1, [targetYear]);

  const [quotas, setQuotas] = useState({
    ANNUAL: 0,
    SICK: 0,
    PERSONAL: 0,
    EMERGENCY: 0,
  });

  // ✅ Max Consecutive Days
  const [maxConsecutive, setMaxConsecutive] = useState(0);

  const handleQuotaChange = (type, value) => {
    setQuotas((prev) => ({ ...prev, [type]: Number(value) }));
  };

  // ✅ FIX: ดึง configs จาก data.configs
  const fetchConfigs = async () => {
    try {
      const data = await getSystemConfigs();

      // 👉 backend ส่ง { configs, serverYear, ... }
      setConfigs(Array.isArray(data?.configs) ? data.configs : []);
    } catch (error) {
      console.error("Fetch error:", error);
      alertError(
        "Failed to Load Data",
        "Unable to retrieve system configuration."
      );
    }
  };

  // โหลดครั้งแรก + socket
  useEffect(() => {
    fetchConfigs();

    const API_URL = (
      import.meta.env.VITE_API_URL || "http://localhost:8080"
    ).replace(/\/$/, "");

    const socket = io(API_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("notification_refresh", () => {
      fetchConfigs();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const buildProcessConfirmHtml = () => {
    const co = carryOverLimitsRef?.current || {};
    const displayMaxConsecutive =
      maxConsecutive > 0 ? maxConsecutive : "Unlimited (0)";

    const row = (label, value) => `
      <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #eee;">
        <div style="font-weight:900; letter-spacing:.12em; font-size:12px;">
          ${escapeHtml(label)}
        </div>
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
          The system will process year-end for <b>${escapeHtml(
            targetYear
          )}</b>
          and lock <b>${escapeHtml(lastYear)}</b>.
        </div>

        <div style="border:1px solid #e5e7eb; border-radius:14px; padding:12px 14px; background:#f9fafb;">
          ${row("ANNUAL", co.ANNUAL ?? 0)}
          ${row("SICK", co.SICK ?? 0)}
          ${row("PERSONAL", co.PERSONAL ?? 0)}
          ${row("EMERGENCY", co.EMERGENCY ?? 0)}
        </div>

        <div style="margin-top:12px; font-size:13px; color:#4b5563;">
          <b>Max Consecutive Days:</b> ${escapeHtml(
            String(displayMaxConsecutive)
          )}
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
      const res = await processCarryOver({
        targetYear: Number(targetYear),
        quotas,
        carryConfigs: carryOverLimitsRef?.current || {},
        maxConsecutiveDays: maxConsecutive,
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
        <div style="text-align:left;">
          Do you want to unlock <b>${escapeHtml(year)}</b>?
        </div>
      `,
      "Unlock Year"
    );
    if (!confirmed) return;

    try {
  await reopenYear({
    year,
    reason: "Admin reopen year",
  });

  await alertSuccess("Unlocked", `Year ${year} has been unlocked.`);
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
    maxConsecutive,
    setMaxConsecutive,
    handleProcess,
    handleReopen,
    fetchConfigs,
  };

return React.createElement(Ctx.Provider, { value }, children);

}

export function useYearEndProcessing() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error(
      "useYearEndProcessing must be used within YearEndProcessingProvider"
    );
  }
  return ctx;
}
