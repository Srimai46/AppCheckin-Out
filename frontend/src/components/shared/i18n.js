//frontend/src/components/shared/i18n.js
import { add } from "date-fns";
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
          attendance: "Attendance",
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

          yes: "Yes",
          no: "No",
          save: "Save",
          delete: "Delete",
          confirm: "Confirm",
          cancel: "Cancel",
          days: "Days",
          unlimited: "Unlimited",

          page: "page",
          showing: "showing",
          of: "of",

          prev: "prev",
          next: "next",

          // Alerts / Validation
          missingInfo: "Missing information",
          invalidValue: "Invalid value",
          saveFailed: "Save failed",
          deleteFailed: "Delete failed",
          systemError: "System error occurred",
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

          cancellationRequests: "Cancellation Requests",
          newrequest: "New Request",

          selectionEmptyTitle: "No Selection",
          selectionEmptyText: "Please select at least one request.",

          confirmTitle: "Confirm {{action}}",
          confirmText:
            "Are you sure you want to {{action}} {{count}} request(s)?",

          processed: "{{count}} request(s) processed successfully.",
          actionFailed: "Action failed",

          actionText: {
            approve: "approve",
            special: "special approve",
            reject: "reject",
          },

          tabs: {
            new: "New Requests",
            cancel: "Cancellation Requests",
          },
        },

        /* -------- Special Holidays -------- */
        specialHoliday: {
          title: "Special Holidays",
          subtitle: "Add / Edit holiday and apply immediately",

          form: {
            holidayName: "Holiday Name",
            startDate: "Start Date",
            endDate: "End Date",
            duration: "Duration",
            day: "day",
            days: "days",
            add: "Add",
            update: "Update",
            cancelEdit: "Cancel Edit",
            close: "Close",
          },

          table: {
            title: "Special Holidays Log",
            subtitle: "DD-MM-YYYY (total days), name, edit, delete",
            date: "Date",
            name: "Holiday Name",
            actions: "Actions",
            empty: "No special holidays yet.",
          },

          pagination: {
            page: "Page",
            showing: "Showing",
            of: "of",
            prev: "Prev",
            next: "Next",
          },

          action: {
            addHoliday: "Add Holiday",
            edit: "Edit",
            delete: "Delete",
          },
        },

        /* -------- Leave Type -------- */
        leaveType: {
          table: {
            title: "Leave Types",
            subtitle: "Manage leave types, paid status and limits",
            name: "Leave Type",
            paid: "Paid",
            maxCarryOver: "Max Carry Over",
            maxConsecutive: "Max Consecutive",
            actions: "Actions",
          },
          action: {
            add: "Add Leave Type",
            edit: "Edit",
            delete: "Delete",
          },
          form: {
            typeName: "Type Name",
            paid: "Paid",
            labelTh: "Label (TH)",
            labelEn: "Label (EN)",
            maxCarryOver: "Max Carry Over (Days)",
            maxConsecutive: "Max Consecutive Days",
            cancelEdit: "Cancel",
            editTitle: "Edit Leave Type",
            addTitle: "Add Leave Type",
            subtitle: "Add / Edit Leave Type and apply immediately",
            add: "Add",
            update: "update",
            close: "close",

            // validation text
            requiredLabel: "Both Thai and English labels are required.",
            invalidNumber: "Values must be zero or greater.",
          },

          // confirm popups
          confirm: {
            addTitle: "Confirm Add Leave Type",
            addMessage: "Are you sure you want to create this leave type?",
            updateTitle: "Confirm Update Leave Type",
            updateMessage: "Are you sure you want to update this leave type?",
            deleteTitle: "Confirm Delete Leave Type",
            deleteMessage: 'Are you sure you want to delete "{{name}}" ?',
          },

          // success messages
          success: {
            created: "Leave type has been created successfully.",
            updated: "Leave type has been updated successfully.",
            deleted: "Leave type has been deleted successfully.",
          },
        },
        sweetAlert: {
  reject: {
    title: "Reject Leave Request",
    label: "Reason for rejection",
    placeholder: "Please enter rejection reason...",
    confirm: "Reject",
    required: "Rejection reason is required",
  },
},
dateGridPicker: {
  title: "Select date",

  all: "ALL",
  allOn: "ALL ON",
  allOff: "ALL OFF",

  year: "YEAR",
  month: "MONTH",
  day: "DAY",

  reset: "RESET",
  cancel: "CANCEL",
  done: "DONE",
}

      },
    },

    /* ===================== TH ===================== */
    th: {
      translation: {
        /* -------- Dashboard -------- */
        dashboard: {
          title: "แดชบอร์ด",
          attendance: "เช็คชื่อ",
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

          yes: "ใช่",
          no: "ไม่ใช่",
          save: "บันทึก",
          delete: "ลบ",
          cancel: "ยกเลิก",
          days: "วัน",
          unlimited: "ไม่จำกัด",

          page: "หน้า",
          showing: "แสดง",
          of: "จาก",

          prev: "ก่อนหน้า",
          next: "ถัดไป",

          // Alerts / Validation
          missingInfo: "ข้อมูลไม่ครบ",
          invalidValue: "ค่าที่กรอกไม่ถูกต้อง",
          saveFailed: "บันทึกไม่สำเร็จ",
          deleteFailed: "ลบไม่สำเร็จ",
          systemError: "เกิดข้อผิดพลาดของระบบ",
        },

        /* -------- QuotaCard -------- */
        quota: {
          noData: "ไม่พบข้อมูลโควต้าการลาในช่วงเวลานี้",
          carryOver: "ทบมา",
          used: "ใช้ไป",
          specialUsage: "การใช้วันลาพิเศษ",
          days: "วัน",
          usedTotal: "ใช้ไป {{used}} / ทั้งหมด {{total}}",
          carriedDetail: "({{base}} สิทธิพื้นฐาน + {{carry}} ทบมา)",
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

          cancellationRequests: "คำขอยกเลิก",
          newrequest: "คำขอใหม่",

          selectionEmptyTitle: "ยังไม่ได้เลือกรายการ",
          selectionEmptyText: "กรุณาเลือกรายการอย่างน้อย 1 รายการ",

          confirmTitle: "ยืนยันการ{{action}}",
          confirmText: "คุณต้องการ{{action}} {{count}} รายการ ใช่หรือไม่",

          processed: "ดำเนินการเรียบร้อย {{count}} รายการ",
          actionFailed: "ดำเนินการไม่สำเร็จ",

          actionText: {
            approve: "อนุมัติ",
            special: "อนุมัติพิเศษ",
            reject: "ปฏิเสธ",
          },

          tabs: {
            new: "คำขอใหม่",
            cancel: "คำขอยกเลิก",
          },
        },

        /* -------- Special Holidays -------- */
        specialHoliday: {
          title: "วันหยุดพิเศษ",
          subtitle: "เพิ่ม / แก้ไขวันหยุด และมีผลทันที",

          form: {
            holidayName: "ชื่อวันหยุด",
            startDate: "วันที่เริ่ม",
            endDate: "วันที่สิ้นสุด",
            duration: "ระยะเวลา",
            day: "วัน",
            days: "วัน",
            add: "เพิ่ม",
            update: "อัปเดต",
            cancelEdit: "ยกเลิกการแก้ไข",
            close: "ปิด",
          },

          table: {
            title: "ประวัติวันหยุดพิเศษ",
            subtitle: "วัน-เดือน-ปี (จำนวนวัน), ชื่อ, แก้ไข, ลบ",
            date: "วันที่",
            name: "ชื่อวันหยุด",
            actions: "การจัดการ",
            empty: "ยังไม่มีวันหยุดพิเศษ",
          },

          pagination: {
            page: "หน้า",
            showing: "แสดง",
            of: "จาก",
            prev: "ก่อนหน้า",
            next: "ถัดไป",
          },

          action: {
            addHoliday: "เพิ่มวันหยุด",
            edit: "แก้ไข",
            delete: "ลบ",
          },
        },

        /* -------- Leave Type -------- */
        leaveType: {
          table: {
            title: "ประเภทการลา",
            subtitle: "จัดการประเภทการลา การจ่ายเงิน และข้อจำกัด",
            name: "ประเภทการลา",
            paid: "ได้รับค่าจ้าง",
            maxCarryOver: "ทบต่อปีหน้าได้สูงสุด",
            maxConsecutive: "ลาติดต่อกันสูงสุด",
            actions: "การจัดการ",
          },
          action: {
            add: "เพิ่มประเภทการลา",
            edit: "แก้ไข",
            delete: "ลบ",
          },
          form: {
            typeName: "ชื่อประเภทการลา",
            paid: "ได้รับค่าจ้าง",
            labelTh: "ชื่อ (ภาษาไทย)",
            labelEn: "ชื่อ (ภาษาอังกฤษ)",
            maxCarryOver: "ทบต่อไปปีหน้าได้ศูงสุด (วัน)",
            maxConsecutive: "ลาติดต่อกันสูงสุด (วัน)",
            cancelEdit: "ยกเลิกการแก้ไข",
            editTitle: "แก้ไขประเภทวันลา",
            addTitle: "เพิ่มประเภทวันลา",
            subtitle: "เพิ่ม / แก้ไข ประเภทการลา และมีผลทันทีy",
            add: "เพิ่ม",
            update: "อัปเดต",
            close: "ปิด",

            // validation text
            requiredLabel: "ต้องกรอกชื่อภาษาไทยและภาษาอังกฤษ",
            invalidNumber: "ค่าตัวเลขต้องมากกว่าหรือเท่ากับ 0",
          },

          // confirm popups
          confirm: {
            addTitle: "ยืนยันการเพิ่มประเภทการลา",
            addMessage: "คุณต้องการเพิ่มประเภทการลานี้ใช่หรือไม่",
            updateTitle: "ยืนยันการแก้ไขประเภทการลา",
            updateMessage: "คุณต้องการบันทึกการแก้ไขใช่หรือไม่",
            deleteTitle: "ยืนยันการลบประเภทการลา",
            deleteMessage: 'คุณต้องการลบ "{{name}}" ใช่หรือไม่',
          },

          // success messages
          success: {
            created: "เพิ่มประเภทการลาเรียบร้อยแล้ว",
            updated: "อัปเดตประเภทการลาเรียบร้อยแล้ว",
            deleted: "ลบประเภทการลาเรียบร้อยแล้ว",
          },
        },
        sweetAlert: {
          reject: {
            title: "ปฏิเสธคำขอลา",
            label: "เหตุผลในการปฏิเสธ",
            placeholder: "กรุณาระบุเหตุผลในการปฏิเสธ...",
            confirm: "ปฏิเสธ",
            required: "กรุณาระบุเหตุผล",
          },
        },
        dateGridPicker: {
  title: "เลือกวันที่",

  all: "ทั้งหมด",
  allOn: "เลือกทั้งหมด",
  allOff: "ไม่เลือกทั้งหมด",

  year: "ปี",
  month: "เดือน",
  day: "วัน",

  reset: "รีเซ็ต",
  cancel: "ยกเลิก",
  done: "ตกลง",
}

      },
    },
  },
});

export default i18n;
