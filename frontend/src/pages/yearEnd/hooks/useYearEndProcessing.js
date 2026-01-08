import { useEffect, useMemo, useState } from "react";
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
  getLeaveTypes,
} from "../../../api/leaveService";

export function useYearEndProcessing() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState([]);

  const [carryOvers, setCarryOvers] = useState({});
  const [quotas, setQuotas] = useState({});

  const [targetYear, setTargetYear] = useState(
    new Date().getFullYear() + 1
  );

  const lastYear = useMemo(
    () => Number(targetYear) - 1,
    [targetYear]
  );

  const [maxConsecutive, setMaxConsecutive] = useState(0);

  /* ================= Fetch Leave Types ================= */
  const fetchLeaveTypes = async () => {
    try {
      const data = await getLeaveTypes();
      const list = Array.isArray(data) ? data : [];
      setLeaveTypes(list);

      // init quotas + carryOvers จาก leaveTypes
      const q = {};
      const c = {};
      list.forEach((lt) => {
        const key = lt.typeName.toUpperCase();
        q[key] = 0;
        c[key] = 0;
      });

      setQuotas(q);
      setCarryOvers(c);
    } catch (err) {
      console.error("Fetch leave types error:", err);
    }
  };

  /* ================= Handlers ================= */
  const handleQuotaChange = (key, value) => {
    setQuotas((prev) => ({
      ...prev,
      [key]: Number(value),
    }));
  };

  const handleCarryOverChange = (key, value) => {
    setCarryOvers((prev) => ({
      ...prev,
      [key]: Number(value),
    }));
  };

  /* ================= Fetch Configs ================= */
  const fetchConfigs = async () => {
    try {
      const data = await getSystemConfigs();
      setConfigs(
        Array.isArray(data?.configs) ? data.configs : []
      );
    } catch (error) {
      console.error("Fetch configs error:", error);
      alertError(
        "Failed to Load Data",
        "Unable to retrieve system configuration."
      );
    }
  };

  /* ================= Initial Load + Socket ================= */
  useEffect(() => {
    fetchConfigs();
    fetchLeaveTypes();

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

    return () => socket.disconnect();
  }, []);

  /* ================= Confirm Dialog ================= */
  const buildProcessConfirmHtml = () => {
    const row = (label, value) => `
      <div style="display:flex; justify-content:space-between; padding:8px 0;">
        <div style="font-weight:900; font-size:12px;">
          ${escapeHtml(label)}
        </div>
        <div style="font-weight:900; font-size:12px;">
          ${escapeHtml(String(value))} day(s)
        </div>
      </div>
    `;

    return `
      <div style="text-align:left;">
        <b>Target Year:</b> ${escapeHtml(targetYear)}<br/>
        <b>Lock Year:</b> ${escapeHtml(lastYear)}<br/><br/>
        ${Object.keys(carryOvers)
          .map((k) => row(k, carryOvers[k]))
          .join("")}
        <div style="margin-top:10px;">
          <b>Max Consecutive:</b> ${
            maxConsecutive || "Unlimited (0)"
          }
        </div>
      </div>
    `;
  };

  /* ================= Process Year End ================= */
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
        carryConfigs: carryOvers,
        maxConsecutiveDays: Number(maxConsecutive) || 0,
      });

      await alertSuccess(
        "Processed Successfully",
        res?.message || "Year-end processing completed."
      );

      fetchConfigs();
    } catch (error) {
      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Processing failed";

      alertError("Processing Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  /* ================= Reopen Year ================= */
  const handleReopen = async (year) => {
    const confirmed = await alertConfirm(
      "Confirm Unlock",
      `Unlock year ${escapeHtml(year)} ?`,
      "Unlock"
    );
    if (!confirmed) return;

    try {
      await reopenYear({
        year,
        reason: "Admin reopen year",
      });
      await alertSuccess(
        "Unlocked",
        `Year ${year} unlocked`
      );
      fetchConfigs();
    } catch (error) {
      alertError(
        "Unlock Failed",
        error?.message || "Unknown error"
      );
    }
  };

  /* ================= Public API ================= */
  return {
    loading,
    configs,
    leaveTypes,

    targetYear,
    setTargetYear,
    lastYear,

    quotas,
    carryOvers,
    handleQuotaChange,
    handleCarryOverChange,

    maxConsecutive,
    setMaxConsecutive,

    handleProcess,
    handleReopen,
  };
}
