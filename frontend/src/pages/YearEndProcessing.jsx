import React from "react";
import { Calendar, ShieldCheck } from "lucide-react";

import { HolidayPolicyProvider } from "./yearEnd/hooks/useHolidayPolicy";
import { CarryOverLimitsProvider } from "./yearEnd/hooks/useCarryOverLimits";

import WorkingDaysCard from "./yearEnd/components/WorkingDaysCard";
import WorkTimeByRoleCard from "./yearEnd/components/WorkTimeByRoleCard";
import MaxConsecutiveCard from "./yearEnd/components/MaxConsecutiveCard";
import SpecialHolidaysCard from "./yearEnd/components/SpecialHolidaysCard";
import CarryOverCard from "./yearEnd/components/CarryOverCard";
import YearEndCard from "./yearEnd/components/YearEndCard";
import LeaveTypeCard from "./yearEnd/components/LeaveTypeCard";

export default function YearEndProcessing() {
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
                    Holiday Policy & Special Holidays
                  </h1>
                  <p className="text-gray-500">
                    Configure working days and manage special holidays.
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
                  Year-End Processing & Quota Assignment
                </h1>
                <p className="text-gray-500">
                  Carry over leave balances and assign new yearly quotas in one step.
                </p>
              </header>
              
              {/* ถ้ายังต้องใช้ CarryOverCard แยก */}
              <CarryOverCard />
            </div>
          </div>
        </div>
      </CarryOverLimitsProvider>
    </HolidayPolicyProvider>
  );
}
