import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { checkIn, checkOut, getMyHistory } from "../api/attendanceService";
import { getMyQuotas, getMyLeaves, getLeaveTypes } from "../api/leaveService";
import { LogIn, LogOut, Calendar, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { alertConfirm, alertSuccess, alertError } from "../utils/sweetAlert";
import { useTranslation } from "react-i18next";
import { HistoryTable } from "../components/shared";
import LeaveSummaryPopup from "../components/shared/LeaveSummaryPopup";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { t, i18n } = useTranslation();

  const [time, setTime] = useState(new Date());
  const [data, setData] = useState({ att: [], quotas: [], leaves: [] });
  const [leaveTypes, setLeaveTypes] = useState([]);

  const [activeTab, setActiveTab] = useState("attendance");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const currentYear = new Date().getFullYear();
  const FUTURE_YEARS = 2;

  const formatYear = (year, lang) =>
    String(lang || "").startsWith("th") ? year + 543 : year;

  // คำนวณรายการปีใน Dropdown
  const years = useMemo(() => {
    const yearsFromHistory = (data.att || [])
      .map((r) => {
        const dateVal = r.workDate || r.work_date || r.date || r.dateDisplay || r.checkInTime || r.check_in_time;
        return dateVal ? new Date(dateVal).getFullYear() : null;
      })
      .filter(Boolean);

    const allYears = [...yearsFromHistory, currentYear];
    const maxYear = Math.max(...allYears);
    
    const futureYears = Array.from(
      { length: FUTURE_YEARS },
      (_, i) => maxYear + 1 + i
    );

    return [...new Set([...allYears, ...futureYears])].sort((a, b) => a - b);
  }, [data.att, currentYear]);

  const dateTimeText = useMemo(() => {
    const locale = String(i18n.language || "").startsWith("th")
      ? "th-TH"
      : "en-US";
    return new Intl.DateTimeFormat(locale, {
      weekday: "long",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    }).format(time);
  }, [time, i18n.language]);

  const fetchData = useCallback(
    async (year) => {
      try {
        const [h, q, l, types] = await Promise.all([
          getMyHistory(),
          getMyQuotas(year),
          getMyLeaves(),
          getLeaveTypes(),
        ]);

        const attRaw = Array.isArray(h) ? h : h?.data || [];
        const quotasRaw = Array.isArray(q) ? q : q?.data || [];
        const leavesRaw = l?.history || [];

        const quotas =
          Array.isArray(quotasRaw) && quotasRaw.some((x) => x?.year != null)
            ? quotasRaw.filter((x) => Number(x?.year) === Number(year))
            : quotasRaw;

        const leaves =
          Array.isArray(leavesRaw) && leavesRaw.some((x) => x?.startDate || x?.endDate)
            ? leavesRaw.filter((x) => {
                const d = x.startDate || x.endDate;
                if (!d) return false;
                const y = new Date(d).getFullYear();
                return y === Number(year);
              })
            : leavesRaw;

        const att = (Array.isArray(attRaw) ? attRaw : []).map((r) => {
          const checkOutTime = r.checkOutTime || r.check_out_time;
          const checkOutStatus = r.checkOutStatus || r.check_out_status;

          return {
            ...r,
            checkOutStatus: checkOutStatus || (!checkOutTime ? "NO_CHECKOUT" : checkOutStatus),
          };
        });

        setData({ att, quotas, leaves });

        const typeList = Array.isArray(types) ? types : types?.data || [];
        setLeaveTypes(Array.isArray(typeList) ? typeList : []);
      } catch (err) {
        console.error(err);
        alertError(t("common.error"), t("dashboard.loadFail"));
        setData({ att: [], quotas: [], leaves: [] });
        setLeaveTypes([]);
      }
    },
    [t]
  );

  useEffect(() => {
    if (!user) return;
    fetchData(selectedYear);
  }, [user, selectedYear, fetchData]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // เช็คสถานะวันนี้
  const todayStatus = useMemo(() => {
    if (!data.att.length) return { isCheckedIn: false, isCheckedOut: false };
    
    // ใช้ Local Date แก้ปัญหา Timezone
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    
    const todayRecord = data.att.find(r => {
        const rDate = r.workDate || r.dateDisplay; 
        return rDate && String(rDate).startsWith(todayStr);
    });

    return {
        isCheckedIn: !!todayRecord?.checkInTime,
        isCheckedOut: !!todayRecord?.checkOutTime
    };
  }, [data.att]);

  const getCoordinates = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation)
        return reject(new Error("Geolocation not supported"));
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });

  const handleAction = async (type) => {

    // แต่ Check-out ต้องเคย Check-in ก่อนเสมอ
    if (type === 'out' && !todayStatus.isCheckedIn) {
        return alertError("Alert", "Please check-in first.");
    }

    // ปรับข้อความ Confirm ตามสถานะ
    let confirmTitle = t("dashboard.attendanceConfirmTitle");
    let confirmText = t("dashboard.attendanceConfirmText", {
        action: type === "in" ? t("dashboard.checkIn") : t("dashboard.checkOut"),
    });

    if (type === 'out' && todayStatus.isCheckedOut) {
        confirmTitle = "Update Check-out?";
        confirmText = "You already checked out. Do you want to update (re-check out)?";
    }

    const confirmed = await alertConfirm(confirmTitle, confirmText);
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      let location = null;
      try {
        location = await getCoordinates();
      } catch (e) {
        console.warn("Location error:", e);
      }

      const res =
        type === "in"
          ? await checkIn({ location })
          : await checkOut({ location });
          
      await alertSuccess(t("common.success"), res?.message || "");
      fetchData(selectedYear);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        t("common.error");
      alertError(t("common.error"), msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const buildFileUrl = (path) => {
    if (!path) return "";
    const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "");
    return `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center text-blue-600 font-black">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight">
          {t("dashboard.attendance")}
        </h1>
        <p className="text-xl md:text-2xl text-blue-700 font-black mt-3">
          {dateTimeText}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto items-stretch">
        <button
  disabled={isProcessing}
  onClick={() => handleAction("in")}
  className={`flex items-center justify-center gap-3 text-white py-4 rounded-3xl font-black shadow-lg transition-all hover:-translate-y-1 
    ${
      isProcessing
        ? "bg-gray-400 cursor-not-allowed"
        : "bg-emerald-500 hover:bg-emerald-600"
    }`}
>
  {isProcessing ? (
    <Loader2 className="animate-spin" size={20} />
  ) : (
    <LogIn size={20} />
  )}
  {t("dashboard.checkIn")}
</button>


       <button
  disabled={isProcessing || !todayStatus.isCheckedIn}
  onClick={() => handleAction("out")}
  className={`flex items-center justify-center gap-3 text-white py-4 rounded-3xl font-black shadow-lg transition-all hover:-translate-y-1 
    ${
      isProcessing || !todayStatus.isCheckedIn
        ? "bg-gray-400 cursor-not-allowed"
        : "bg-rose-500 hover:bg-rose-600"
    }`}
>
  {isProcessing ? (
    <Loader2 className="animate-spin" size={20} />
  ) : (
    <LogOut size={20} />
  )}

  {todayStatus.isCheckedOut
    ? t("dashboard.updatecheckOut")
    : t("dashboard.checkOut")}
</button>


        <button
          onClick={() => navigate("/leave-request")}
          className="flex items-center justify-center gap-3 bg-amber-300 text-slate-900 py-4 rounded-3xl font-black shadow-lg hover:bg-amber-400 transition-all hover:-translate-y-1"
        >
          <Calendar size={20} /> {t("dashboard.leave")}
        </button>

        <LeaveSummaryPopup
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          years={years}
          formatYear={formatYear}
          leaveTypes={leaveTypes}
          quotas={data.quotas}
          leaves={data.leaves}
        />
      </div>

      <HistoryTable
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        attendanceData={data.att}
        leaveData={data.leaves}
        buildFileUrl={buildFileUrl}
      />
    </div>
  );
}