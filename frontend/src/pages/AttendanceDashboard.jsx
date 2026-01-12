// frontend/src/pages/yearEnd/components/AttendanceDashboard.jsx
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { getAttendanceStats } from "../api/attendanceService";
import DateGridPicker from "../components/shared/DateGridPicker";
import {
  Calendar,
  Clock,
  Briefcase,
  CheckCircle2,
  XCircle,
  Timer,
  Filter,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

/* ---------------- Stat Card ---------------- */
const StatCard = ({
  title,
  value,
  subValue,
  icon: Icon,
  colorClass,
  bgClass,
}) => (
  <div
    className={`p-6 rounded-[2rem] border transition-all hover:shadow-lg ${bgClass} border-transparent`}
  >
    <div className="flex justify-between items-start">
      <div>
        <p className="text-[11px] font-black uppercase tracking-widest opacity-60 mb-1">
          {title}
        </p>
        <h3 className="text-3xl font-black text-slate-800">{value}</h3>
        {subValue && (
          <p className="text-xs font-bold mt-1 opacity-80 flex items-center gap-1">
            {subValue}
          </p>
        )}
      </div>
      <div className={`p-3 rounded-2xl ${colorClass} text-white shadow-sm`}>
        <Icon size={24} />
      </div>
    </div>
  </div>
);

/* ---------------- Legend Badge ---------------- */
const LegendBadge = ({ color, text, textColor }) => (
  <span
    className={`flex items-center gap-1 text-[9px] font-black uppercase ${textColor} px-2 py-1 rounded-lg`}
  >
    <div className={`w-2 h-2 rounded-full ${color}`} />
    {text}
  </span>
);

/* ---------------- Calendar ---------------- */
const AttendanceCalendar = ({ year, month, stats }) => {
  const { t } = useTranslation();

  if (month === "All") {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <Calendar size={48} className="mb-4 opacity-20" />
        <p className="font-bold">{t("attendanceDashboard.selectMonthHint")}</p>
      </div>
    );
  }

  const monthIndex = parseInt(month) - 1;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDay = new Date(year, monthIndex, 1).getDay();

  const getDateStr = (day) =>
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const getStringLabel = (val) => {
    if (!val) return "";
    if (typeof val === "string") return val;
    return val.en || val.th || String(val);
  };

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-24 md:h-32" />);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = getDateStr(d);
    const events = [];

    const holidayObj = stats.holidayDates?.find((h) => h.date === dateStr);
    if (holidayObj)
      events.push({
        label: getStringLabel(holidayObj.name),
        color: "bg-purple-500 text-white shadow-purple-200",
      });

    const leaveObj = stats.leaveDates?.find((l) => l.date === dateStr);
    if (leaveObj)
      events.push({
        label: getStringLabel(leaveObj.type),
        color: "bg-blue-500 text-white shadow-blue-200",
      });

    if (
      stats.absentDates?.some((a) => a === dateStr || a.startsWith(dateStr))
    ) {
      events.push({
        label: t("history.absent"),
        color: "bg-rose-500 text-white shadow-rose-200",
      });
    }

    if (stats.lateDates?.includes(dateStr)) {
      events.push({
        label: t("history.late"),
        color: "bg-amber-400 text-white shadow-amber-200",
      });
    }

    if (stats.earlyLeaveDates?.includes(dateStr)) {
      events.push({
        label: t("history.early"),
        color: "bg-orange-400 text-white shadow-orange-200",
      });
    }

    days.push(
      <div
        key={d}
        className="min-h-[6rem] md:min-h-[8rem] border border-slate-100 rounded-2xl p-2 bg-white flex flex-col justify-between"
      >
        <span
          className={`text-sm font-bold mb-1 ${
            holidayObj ? "text-purple-600" : "text-slate-700"
          }`}
        >
          {d}
        </span>
        <div className="flex flex-col gap-1">
          {events.map((ev, idx) => (
            <div
              key={idx}
              className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase truncate ${ev.color}`}
              title={ev.label}
            >
              {ev.label}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-7 gap-2 md:gap-4">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
        <div
          key={d}
          className="text-center text-[10px] font-black uppercase text-slate-300 py-2"
        >
          {t(`attendanceDashboard.weekdays.${d.toLowerCase()}`)}
        </div>
      ))}
      {days}
    </div>
  );
};

/* ================= MAIN ================= */
export default function AttendanceDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const attendanceRatioData = useMemo(() => {
    if (!stats) return [];
    return [
      {
        name: t("attendanceDashboard.present"),
        value: stats.present,
        color: "#10B981",
      },
      {
        name: t("attendanceDashboard.leave"),
        value: stats.leave,
        color: "#3B82F6",
      },
      {
        name: t("attendanceDashboard.absent"),
        value: stats.absent,
        color: "#F43F5E",
      },
    ].filter((d) => d.value > 0);
  }, [stats, t]);

  const leaveBreakdownData = useMemo(() => {
    if (!stats?.leaveBreakdown) return [];
    const COLORS = ["#8B5CF6", "#F59E0B", "#6366F1", "#EC4899", "#14B8A6"];
    return Object.entries(stats.leaveBreakdown).map(([key, value], i) => ({
      name: key,
      value,
      color: COLORS[i % COLORS.length],
    }));
  }, [stats]);

  const pad2 = (n) => String(n).padStart(2, "0");
  const filterLabel = useMemo(
    () =>
      month === "All"
        ? t("attendanceDashboard.allYear", { year })
        : `${pad2(month)}/${year}`,
    [month, year, t]
  );

  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      try {
        setLoading(true);
        const data = await getAttendanceStats({
          year,
          month,
          employeeId: user.id,
        });
        setStats({
          ...data.stats,
          employeeName: data.employee?.name,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [year, month, user]);

  if (loading && !stats) {
    return (
      <div className="p-10 flex justify-center font-bold text-blue-600 animate-pulse">
        {t("common.loading")}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-center text-slate-400 font-bold border-2 border-dashed rounded-3xl">
        {t("attendanceDashboard.noData")}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
         <div className="flex items-center gap-3">
             <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 shadow-sm border border-blue-100">
                <Clock size={32} />
             </div>
             <div>
                 <h1 className="text-3xl font-black text-slate-800">{t("attendanceDashboard.title")}</h1>
                 <p className="text-sm text-slate-400 font-bold flex items-center gap-2">
                    {t("attendanceDashboard.viewing")} <span className="text-blue-600">{stats?.employeeName || user?.firstName || "Me"}</span>
                 </p>
             </div>
         </div>

        {/* Filter Controls */}
        <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
            <button
                type="button"
                onClick={() => setDatePickerOpen(true)}
                className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-transparent hover:border-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm"
            >
                <Filter size={16} className="text-slate-400" />
                {filterLabel}
            </button>
            
            <button
                type="button"
                onClick={() => { setYear(new Date().getFullYear()); setMonth("All"); }}
                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 font-black py-2 px-4 rounded-xl transition-all text-[10px] uppercase tracking-widest active:scale-95"
            >
                CLEAR
            </button>
        </div>

        <DateGridPicker
            open={datePickerOpen}
            value={month === "All" ? `${year}` : `${year}-${pad2(month)}`}
            granularity="month"
            allowAll={true}
            title="Select Period"
            onClose={() => setDatePickerOpen(false)}
            onChange={(val) => {
                if (!val) { setMonth("All"); setYear(new Date().getFullYear()); return; }
                const s = String(val);
                if (/^\d{4}$/.test(s)) { setYear(Number(s)); setMonth("All"); return; }
                const m = s.match(/^(\d{4})-(\d{2})$/);
                if (m) { setYear(Number(m[1])); setMonth(Number(m[2])); }
            }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title={t("attendanceDashboard.workingDays")}
          value={`${stats.present}/${stats.totalDaysExpected}`}
          subValue={t("attendanceDashboard.presentExpected")}
          icon={Briefcase}
          bgClass="bg-blue-50/50"
          colorClass="bg-blue-500"
        />
        <StatCard
          title={t("attendanceDashboard.late")}
          value={stats.late}
          subValue={`${stats.lateMinutes || 0} ${t(
            "attendanceDashboard.minutes"
          )}`}
          icon={Clock}
          bgClass="bg-amber-50/50"
          colorClass="bg-amber-500"
        />
        <StatCard
          title={t("attendanceDashboard.early")}
          value={stats.earlyLeave}
          subValue={`${stats.earlyLeaveMinutes || 0} ${t(
            "attendanceDashboard.minutes"
          )}`}
          icon={Timer}
          bgClass="bg-orange-50/50"
          colorClass="bg-orange-500"
        />
        <StatCard
          title={t("attendanceDashboard.leave")}
          value={stats.leave}
          subValue={t("attendanceDashboard.daysTaken")}
          icon={CheckCircle2}
          bgClass="bg-emerald-50/50"
          colorClass="bg-emerald-500"
        />
        <StatCard
          title={t("attendanceDashboard.absent")}
          value={stats.absent}
          subValue={t("attendanceDashboard.unexcused")}
          icon={XCircle}
          bgClass="bg-rose-50/50"
          colorClass="bg-rose-500"
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ---------- Charts ---------- */}
        <div className="lg:col-span-1 space-y-6">
          {/* Attendance Ratio */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 h-80">
            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
              <PieChartIcon size={16} />
              {t("attendanceDashboard.attendanceRatio")}
            </h3>

            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendanceRatioData}
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {attendanceRatioData.map((e, i) => (
                      <Cell key={i} fill={e.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Leave Types */}
          {leaveBreakdownData.length > 0 && (
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 h-80">
              <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Filter size={16} />
                {t("attendanceDashboard.leaveTypes")}
              </h3>

              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leaveBreakdownData}
                      outerRadius={70}
                      dataKey="value"
                    >
                      {leaveBreakdownData.map((e, i) => (
                        <Cell key={i} fill={e.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* ---------- Calendar ---------- */}
        <div className="lg:col-span-2">
          <AttendanceCalendar year={year} month={month} stats={stats} />
        </div>
      </div>
      
    </div>
  );
}
