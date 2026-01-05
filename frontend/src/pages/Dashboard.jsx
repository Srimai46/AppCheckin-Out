import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { checkIn, checkOut, getMyHistory } from "../api/attendanceService";
import { getMyQuotas, getMyLeaves } from "../api/leaveService";
import { LogIn, LogOut, Calendar, ChevronDown, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { alertConfirm, alertSuccess, alertError } from "../utils/sweetAlert";
import { useTranslation } from "react-i18next";
import { QuotaCards, HistoryTable } from "../components/shared";
import api from "../api/axios";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { t, i18n } = useTranslation();

  const [time, setTime] = useState(new Date());
  const [data, setData] = useState({ att: [], quotas: [], leaves: [], leaveSummary: [] });
  const [activeTab, setActiveTab] = useState("attendance");
  const [isProcessing, setIsProcessing] = useState(false);

  const [yearOpen, setYearOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // ✅ Modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState(null);

  /* -------------------- Year List Logic -------------------- */
  const currentYear = new Date().getFullYear();
  const FUTURE_YEARS = 2;
  const formatYear = (year, lang) => (lang === "th" ? year + 543 : year);

  const years = useMemo(() => {
    const yearsFromHistory = (data.att || [])
      .map((r) => new Date(r.date || r.dateDisplay).getFullYear())
      .filter(Boolean);

    const maxYear = Math.max(currentYear, ...(yearsFromHistory.length ? yearsFromHistory : [currentYear]));

    const futureYears = Array.from({ length: FUTURE_YEARS }, (_, i) => maxYear + 1 + i);

    return [...new Set([...yearsFromHistory, currentYear, ...futureYears])].sort((a, b) => a - b);
  }, [data.att, currentYear]);

  /* --------------------------------------------------------- */

  const buildFileUrl = (path) => {
    if (!path) return "";
    const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "");
    return `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
  };

  const fetchData = useCallback(
    async (year) => {
      try {
        const [h, q, l] = await Promise.all([getMyHistory(), getMyQuotas(year), getMyLeaves()]);

        setData({
          att: Array.isArray(h) ? h : h?.data || [],
          quotas: Array.isArray(q) ? q : q?.data || [],
          leaves: l?.history || [],
          leaveSummary: l?.summary || [],
        });
      } catch (err) {
        console.error(err);
        alertError(t("common.error"), t("dashboard.loadFail"));
        setData({ att: [], quotas: [], leaves: [], leaveSummary: [] });
      }
    },
    [t]
  );

  useEffect(() => {
    if (user) fetchData(selectedYear);
  }, [user, selectedYear, fetchData]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getCoordinates = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });

  const handleAction = async (type) => {
    const confirmed = await alertConfirm(
      t("dashboard.attendanceConfirmTitle"),
      t("dashboard.attendanceConfirmText", {
        action: type === "in" ? t("dashboard.checkIn") : t("dashboard.checkOut"),
      })
    );

    if (!confirmed) return;

    setIsProcessing(true);

    try {
      let location = null;
      try {
        location = await getCoordinates();
      } catch (geoErr) {
        console.warn("GPS Access Denied/Failed:", geoErr.message);
      }

      const res = type === "in" ? await checkIn({ location }) : await checkOut({ location });

      await alertSuccess(t("common.success"), res?.message || "");
      fetchData(selectedYear);
    } catch (err) {
      console.error(err);
      const errorMsg =
        err?.response?.data?.message || err?.response?.data?.error || err?.message || t("common.error");
      alertError(t("common.error"), errorMsg);
    } finally {
      setIsProcessing(false);
    }
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
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-black text-slate-800">{t("dashboard.title")}</h1>

        <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">
          {t("dashboard.welcome", { firstName: user?.firstName, lastName: user?.lastName })}
        </p>

        <p className="text-xs text-blue-600 font-black mt-2">
          {time.toLocaleString(i18n.language === "th" ? "th-TH" : "en-US")}
        </p>
      </div>

      {/* Year Dropdown */}
      <div className="flex justify-center">
        <div className="relative w-56">
          <div className="mb-1 ml-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {t("dashboard.selectYear")}
          </div>

          <button
            type="button"
            onClick={() => setYearOpen((v) => !v)}
            className={`w-full rounded-[1.8rem] px-6 py-3.5 font-black text-sm
              bg-white border border-gray-100 shadow-sm transition-all
              ${yearOpen ? "ring-2 ring-blue-100" : ""}
            `}
          >
            <div className="flex justify-between items-center">
              <span>
                {t("dashboard.year")} {formatYear(selectedYear, i18n.language)}
              </span>
              <ChevronDown size={18} className={`transition-transform ${yearOpen ? "rotate-180" : ""}`} />
            </div>
          </button>

          {yearOpen && (
            <div className="absolute z-20 mt-2 w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              {years.map((y) => (
                <button
                  key={y}
                  onClick={() => {
                    setSelectedYear(y);
                    setYearOpen(false);
                  }}
                  className={`w-full px-6 py-3 text-left text-sm font-black
                    hover:bg-blue-50 transition-all
                    ${selectedYear === y ? "bg-blue-50 text-blue-700" : "text-slate-700"}
                  `}
                >
                  {t("dashboard.year")} {formatYear(y, i18n.language)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <QuotaCards quotas={data.quotas} />

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <button
          disabled={isProcessing}
          onClick={() => handleAction("in")}
          className={`flex items-center justify-center gap-3 text-white py-4 rounded-3xl font-black shadow-lg transition-all hover:-translate-y-1 
            ${isProcessing ? "bg-gray-400 cursor-not-allowed" : "bg-emerald-500 hover:bg-emerald-600"}`}
        >
          {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
          {t("dashboard.checkIn")}
        </button>

        <button
          disabled={isProcessing}
          onClick={() => handleAction("out")}
          className={`flex items-center justify-center gap-3 text-white py-4 rounded-3xl font-black shadow-lg transition-all hover:-translate-y-1 
            ${isProcessing ? "bg-gray-400 cursor-not-allowed" : "bg-rose-500 hover:bg-rose-600"}`}
        >
          {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <LogOut size={20} />}
          {t("dashboard.checkOut")}
        </button>

        <button
          onClick={() => navigate("/leave-request")}
          className="flex items-center justify-center gap-3 bg-amber-300 text-slate-900 py-4 rounded-3xl font-black shadow-lg hover:bg-amber-400 transition-all hover:-translate-y-1"
        >
          <Calendar size={20} /> {t("dashboard.leave")}
        </button>
      </div>

      <HistoryTable
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        attendanceData={data.att}
        leaveData={data.leaves}
        buildFileUrl={buildFileUrl}
        onDeletedLeaveSuccess={(deletedLeave) => {
          console.log("DELETED =>", deletedLeave);
          if (!deletedLeave?.id) return;

          setData((prev) => ({
            ...prev,
            leaves: (prev?.leaves || []).filter((x) => x?.id !== deletedLeave.id),
          }));
        }}
      />
    </div>
  );
}
