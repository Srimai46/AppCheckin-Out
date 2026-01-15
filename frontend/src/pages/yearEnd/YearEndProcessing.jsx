import React from "react";
import { Calendar, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

import { HolidayPolicyProvider } from "./hooks/useHolidayPolicy";
import { CarryOverLimitsProvider } from "./hooks/useCarryOverLimits";

import WorkingDaysCard from "./components/WorkingDaysCard";
import WorkTimeByRoleCard from "./components/WorkTimeByRoleCard";
import MaxConsecutiveCard from "./components/MaxConsecutiveCard";
import SpecialHolidaysCard from "./components/SpecialHolidaysCard";
import CarryOverCard from "./components/CarryOverCard";
import LeaveTypeCard from "./components/LeaveTypeCard";

export default function YearEndProcessing() {
  const { t } = useTranslation();

  return (
    <HolidayPolicyProvider>
      <CarryOverLimitsProvider>
        <div className="p-8 bg-gray-50 min-h-screen">
          <div className="max-w-5xl mx-auto">
            {/* ================= Holiday Policy Panel ================= */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 mb-8">
              <header className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <ShieldCheck className="text-indigo-600" />
                    {t("yearEndPolicy.title")}
                  </h1>
                  <p className="text-gray-500">
                    {t("yearEndPolicy.subtitle")}
                  </p>
                </div>
              </header>

              <WorkingDaysCard />
              <WorkTimeByRoleCard />
              <MaxConsecutiveCard />
              <LeaveTypeCard />
              <SpecialHolidaysCard />
            </div>

            {/* ================= Year End Panel ================= */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 mb-8">
              <header className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Calendar className="text-indigo-600" />
                  {t("yearEndProcess.title")}
                </h1>
                <p className="text-gray-500">
                  {t("yearEndProcess.subtitle")}
                </p>
              </header>

              <CarryOverCard />
            </div>
          </div>
        </div>
      </CarryOverLimitsProvider>
    </HolidayPolicyProvider>
  );
}
