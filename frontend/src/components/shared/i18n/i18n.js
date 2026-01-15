import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// =========================
// EN
// =========================
import dashboardEN from "./en/dashboard";
import commonEN from "./en/common";
import sweetAlertEN from "./en/sweetAlert";
import dateGridPickerEN from "./en/dateGridPicker";
import dateGridPickerExtraEN from "./en/dateGridPickerExtra";

import leaveRequestEN from "./en/leaveRequest";
import leaveApprovalEN from "./en/leaveApproval";
import leaveHistoryEN from "./en/leaveHistory";
import leaveSummaryEN from "./en/leaveSummary";
import leaveCalendarEN from "./en/leaveCalendar";
import leavePolicyEN from "./en/leavePolicy";
import quotaAdjustmentEN from "./en/quotaAdjustment";
import specialHolidayEN from "./en/specialHoliday";

import attendanceDashboardEN from "./en/attendanceDashboard";
import attendanceLogEN from "./en/attendanceLog";

import employeeListEN from "./en/employeeList";
import employeeCreateEN from "./en/employeeCreate";
import employeeDetailEN from "./en/employeeDetail";

import holidayConfigEN from "./en/holidayConfig";
import yearEndConfigEN from "./en/yearEndConfig";

// =========================
// JP
// =========================
import dashboardJP from "./jp/dashboard";
import commonJP from "./jp/common";
import sweetAlertJP from "./jp/sweetAlert";
import dateGridPickerJP from "./jp/dateGridPicker";
import dateGridPickerExtraJP from "./jp/dateGridPickerExtra";

import leaveRequestJP from "./jp/leaveRequest";
import leaveApprovalJP from "./jp/leaveApproval";
import leaveHistoryJP from "./jp/leaveHistory";
import leaveSummaryJP from "./jp/leaveSummary";
import leaveCalendarJP from "./jp/leaveCalendar";
import leavePolicyJP from "./jp/leavePolicy";
import quotaAdjustmentJP from "./jp/quotaAdjustment";
import specialHolidayJP from "./jp/specialHoliday";

import attendanceDashboardJP from "./jp/attendanceDashboard";
import attendanceLogJP from "./jp/attendanceLog";

import employeeListJP from "./jp/employeeList";
import employeeCreateJP from "./jp/employeeCreate";
import employeeDetailJP from "./jp/employeeDetail";

import holidayConfigJP from "./jp/holidayConfig";
import yearEndConfigJP from "./jp/yearEndConfig";

// =========================
// INIT
// =========================

i18n.use(initReactI18next).init({
  resources: {
    en: {
      dashboard: dashboardEN,
      common: commonEN,
      sweetAlert: sweetAlertEN,
      dateGridPicker: dateGridPickerEN,
      dateGridPickerExtra: dateGridPickerExtraEN,

      leaveRequest: leaveRequestEN,
      leaveApproval: leaveApprovalEN,
      leaveHistory: leaveHistoryEN,
      leaveSummary: leaveSummaryEN,
      leaveCalendar: leaveCalendarEN,
      leavePolicy: leavePolicyEN,
      quotaAdjustment: quotaAdjustmentEN,
      specialHoliday: specialHolidayEN,

      attendanceDashboard: attendanceDashboardEN,
      attendanceLog: attendanceLogEN,

      employeeList: employeeListEN,
      employeeCreate: employeeCreateEN,
      employeeDetail: employeeDetailEN,

      holidayConfig: holidayConfigEN,
      yearEndConfig: yearEndConfigEN,
    },

    jp: {
      dashboard: dashboardJP,
      common: commonJP,
      sweetAlert: sweetAlertJP,
      dateGridPicker: dateGridPickerJP,
      dateGridPickerExtra: dateGridPickerExtraJP,

      leaveRequest: leaveRequestJP,
      leaveApproval: leaveApprovalJP,
      leaveHistory: leaveHistoryJP,
      leaveSummary: leaveSummaryJP,
      leaveCalendar: leaveCalendarJP,
      leavePolicy: leavePolicyJP,
      quotaAdjustment: quotaAdjustmentJP,
      specialHoliday: specialHolidayJP,

      attendanceDashboard: attendanceDashboardJP,
      attendanceLog: attendanceLogJP,

      employeeList: employeeListJP,
      employeeCreate: employeeCreateJP,
      employeeDetail: employeeDetailJP,

      holidayConfig: holidayConfigJP,
      yearEndConfig: yearEndConfigJP,
    },
  },

  lng: "en", // default language
  fallbackLng: "en",

  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
