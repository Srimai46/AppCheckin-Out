import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n.use(initReactI18next).init({
  lng: "th",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  resources: {
    /* ===================== EN ===================== */
    en: {
      translation: {
        /* -------- Dashboard -------- */
        dashboard: {
          title: "Dashboard",
          welcome: "Welcome, {{firstName}} {{lastName}}",
          selectYear: "Select Year",
          year: "Year",

          checkIn: "CHECK IN",
          checkOut: "CHECK OUT",
          leave: "LEAVE",

          attendanceConfirmTitle: "Attendance Confirmation",
          attendanceConfirmText: "Are you sure you want to {{action}}?",
          loadFail: "Failed to load dashboard data.",
        },

        /* -------- Layout / Sidebar -------- */
        layout: {
          mainMenu: "Main Menu",
          hrManagement: "HR Management",
          approveLeave: "Approve Leave Requests",
          employees: "Employee Directory",
          calendar: "Calendar",
          yearEnd: "Setting",
          logout: "Logout",
        },

        /* -------- Common -------- */
        common: {
          loading: "LOADING...",
          success: "Success",
          error: "Error",
        },

        /* -------- QuotaCard -------- */
        quota: {
          noData: "No leave quota data found for this period",
          carryOver: "CARRY OVER",
          used: "Used",
          specialUsage: "Special Leave Usage",
          days: "Days",
          usedTotal: "Used {{used}} / Total {{total}}",
          carriedDetail: "({{base}} base + {{carry}} carried)",
        },
        /* -------- history -------- */
        history: {
          attendanceLog: "Attendance Log",
          leaveHistory: "Leave History",

          tabAttendance: "Attendance",
          tabLeave: "Leave",

          date: "Date",
          inOut: "In / Out",
          status: "Status",

          type: "Type",
          period: "Period",
          days: "Days",
          note: "Note",
          file: "File",

          noData: "No Data",

          late: "Late",
          onTime: "On Time",

          usedDays: "{{days}} Days",
        },
        /* -------- leaveApproveal -------- */
        leaveApproval: {
          title: "Pending Approvals",

          selected: "{{count}} Selected",

          bulkApprove: "Bulk Approve",
          bulkSpecial: "Bulk Special",
          bulkReject: "Reject",

          table: {
            employee: "Employee",
            type: "Type",
            reason: "Note / Reason",
            duration: "Duration",
            evidence: "Evidence",
            action: "Action",
          },

          loading: "SYNCHRONIZING DATA...",
          noData: "No Pending Tasks",

          ref: "Ref: #{{id}}",

          days: "Days",
          noFile: "No File",

          actions: {
            approve: "Approved",
            special: "Special",
            reject: "Rejected",
          },

          tooltips: {
            viewAttachment: "View Attachment",
            approve: "Approve",
            special: "Special Approval",
            reject: "Reject",
          },

          labels: {
            reason: "Reason",
            cancelReason: "Cancel Reason",
            note: "Note",
          },
        },
      },
    },

    /* ===================== TH ===================== */
    th: {
      translation: {
        /* -------- Dashboard -------- */
        dashboard: {
          title: "แดชบอร์ด",
          welcome: "ยินดีต้อนรับ {{firstName}} {{lastName}}",
          selectYear: "เลือกปี",
          year: "ปี",

          checkIn: "เช็กอิน",
          checkOut: "เช็กเอาต์",
          leave: "ลา",

          attendanceConfirmTitle: "ยืนยันการลงเวลา",
          attendanceConfirmText: "คุณต้องการ {{action}} ใช่หรือไม่",
          loadFail: "ไม่สามารถโหลดข้อมูลแดชบอร์ดได้",
        },

        /* -------- Layout / Sidebar -------- */
        layout: {
          mainMenu: "เมนูหลัก",
          hrManagement: "จัดการฝ่ายบุคคล",
          approveLeave: "อนุมัติการลา",
          employees: "รายชื่อพนักงาน",
          calendar: "ปฏิทิน",
          yearEnd: "ตั้งค่า",
          logout: "ออกจากระบบ",
        },

        /* -------- Common -------- */
        common: {
          loading: "กำลังโหลด...",
          success: "สำเร็จ",
          error: "เกิดข้อผิดพลาด",
        },

        /* -------- QuotaCard -------- */
        quota: {
          noData: "ไม่พบข้อมูลโควต้าการลาในช่วงเวลานี้",
          carryOver: "ยกมา",
          used: "ใช้ไป",
          specialUsage: "การใช้วันลาพิเศษ",
          days: "วัน",
          usedTotal: "ใช้ไป {{used}} / ทั้งหมด {{total}}",
          carriedDetail: "({{base}} สิทธิพื้นฐาน + {{carry}} ยกมา)",
        },

        /* -------- history -------- */
        history: {
          attendanceLog: "บันทึกเวลาเข้าออกงาน",
          leaveHistory: "ประวัติการลา",

          tabAttendance: "เข้างาน",
          tabLeave: "ลา",

          date: "วันที่",
          inOut: "เข้า / ออก",
          status: "สถานะ",

          type: "ประเภท",
          period: "ช่วงเวลา",
          days: "วัน",
          note: "หมายเหตุ",
          file: "ไฟล์",

          noData: "ไม่พบข้อมูล",

          late: "สาย",
          onTime: "ตรงเวลา",

          usedDays: "{{days}} วัน",
        },
        /* -------- leaveApproveal -------- */
        leaveApproval: {
          title: "รายการรออนุมัติ",

          selected: "เลือกแล้ว {{count}} รายการ",

          bulkApprove: "อนุมัติทั้งหมด",
          bulkSpecial: "อนุมัติพิเศษ",
          bulkReject: "ปฏิเสธ",

          table: {
            employee: "พนักงาน",
            type: "ประเภท",
            reason: "หมายเหตุ / เหตุผล",
            duration: "ระยะเวลา",
            evidence: "เอกสารแนบ",
            action: "การดำเนินการ",
          },

          loading: "กำลังซิงค์ข้อมูล...",
          noData: "ไม่มีรายการที่รออนุมัติ",

          ref: "อ้างอิง #{{id}}",

          days: "วัน",
          noFile: "ไม่มีไฟล์",

          actions: {
            approve: "อนุมัติ",
            special: "อนุมัติพิเศษ",
            reject: "ปฏิเสธ",
          },

          tooltips: {
            viewAttachment: "ดูไฟล์แนบ",
            approve: "อนุมัติ",
            special: "อนุมัติพิเศษ",
            reject: "ปฏิเสธ",
          },

          labels: {
            reason: "เหตุผล",
            cancelReason: "เหตุผลการยกเลิก",
            note: "หมายเหตุ",
          },
        },
      },
    },
  },
});

export default i18n;
