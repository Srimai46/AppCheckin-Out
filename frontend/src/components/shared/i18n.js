//frontend/src/components/shared/i18n.js
import { add } from "date-fns"; // Note: 'add' is imported but not used in this config, check if needed.
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
          updatecheckOut: "UPDATE CHECK OUT",
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
          today: "Today",
          page: "page",
          showing: "showing",
          of: "of",

          prev: "prev",
          next: "next",
          back: "back",

          close: "Close",

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

        /* -------- History -------- */
        history: {
          attendanceLog: "Attendance Log",
          leaveHistory: "Leave History",
          tabAttendance: "Attendance",
          tabLeave: "Leave",
          date: "Date",
          inOut: "In / Out",
          status: "Status",
          statusIn: "Status In",
          statusOut: "Status Out",
          signedBy: "Signed By",
          type: "Type",
          period: "Period",
          days: "Days",
          note: "Note",
          file: "File",
          noData: "No Data",
          filter: "Filter",
          clear: "Clear",
          selectDate: "Select Date",

          // Status Badges
          late: "Late",
          onTime: "On Time",
          absent: "Absent",
          leave: "Leave",
          early: "Early Leave",
          normal: "Normal",
          noCheckout: "No Check-out",
          notCheckedOutYet: "NOT CHECKED OUT YET",

          // Alerts
          deleteTitle: "Delete leave request?",
          deleteText:
            "Are you sure you want to delete this request?<br/><b>{{type}}</b>",
          deleteButton: "Delete",
          requestCancelButton: "Request Cancel",
        },

        /* -------- Leave Approval -------- */
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

        /* -------- SweetAlert -------- */
        sweetAlert: {
          reject: {
            title: "Reject Leave Request",
            label: "Reason for rejection",
            placeholder: "Please enter rejection reason...",
            confirm: "Reject",
            required: "Rejection reason is required",
          },
        },

        /* -------- Date Grid Picker -------- */
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
        },

        /* -------- Leave Request -------- */
        leaveRequest: {
          type: "Leave Type",
          none: "None",

          fullDay: "Full Day",
          halfMorning: "Half Day (Morning)",
          halfAfternoon: "Half Day (Afternoon)",

          errors: {
            missingType: "Please select a leave type.",
            missingDates: "Please specify both start and end dates.",
            invalidDate: "End date must be after the start date.",
          },

          blockedTitle: "Leave Request Blocked",
          blockedMessage:
            "You can’t request leave on holidays or non-working days.",

          submissionFailed: "Submission Failed",

          headerTitle: "Leave Request",
          headerSubtitle: "Employee Leave Management System",

          step1: "1. Select Leave Type",
          step2: "2. Select Dates & Duration",
          step3: "3. Reason",
          step4: "4. Attachment (Optional)",

          start: "Start",
          end: "End",

          chooseFile: "Choose File",
          removeFile: "Remove File",
          noFileSelected: "No file selected",

          attachNote:
            "You may attach supporting documents (e.g., medical certificate).",

          placeholderReason: "Please provide details...",

          summaryTitle: "Leave Request Summary",
          summaryReview: "Please review the details before confirming.",
          summary: {
            type: "Type",
            period: "Period",
            duration: "Duration",
            attachment: "Attachment",
            reason: "Reason",
          },

          confirmTitle: "Confirm Leave Request",
          confirmText: "Do you want to submit this leave request?",
          confirmButton: "Submit Request",

          successTitle: "Request Submitted",
          successMessage: "Your leave request has been submitted.",

          cancel: "Cancel",
          submitting: "Submitting request...",
          submit: "Submit Leave Request",
        },

        /* -------- Attendance Dashboard -------- */
        attendanceDashboard: {
          title: "Attendance",
          viewing: "Viewing data for: ",
          noData: "No attendance data available.",
          selectMonthHint: "Select a specific month to view calendar.",
          allYear: "ALL {{year}}",

          workingDays: "Working Days",
          presentExpected: "Present / Expected",
          late: "Late Arrivals",
          early: "Early Leaves",
          leave: "Approved Leaves",
          absent: "Absences",
          daysTaken: "Days Taken",
          unexcused: "Unexcused Days",
          minutes: "mins",

          present: "Present",
          attendanceRatio: "Attendance Ratio",
          leaveTypes: "Leave Types",

          subtitle: "Attendance overview",
          filterAll: "ALL {{year}}",
          clear: "Clear",
          selectPeriod: "Select Period",
          loading: "Loading Stats...",
          noDataFound: "No attendance data found.",
          yearlyView: "Yearly View",
          calendar: "{{month}} Calendar",

          stat: {
            workingDays: "Working Days",
            presentExpected: "Present / Expected",
            late: "Late",
            earlyLeave: "Early Leave",
            leaves: "Leaves",
            absences: "Absences",
            approved: "Approved",
            unexcused: "Unexcused",
            minutes: "mins",
          },

          ratio: "Attendance Ratio",

          legend: {
            holiday: "Holiday",
            absent: "Absent",
            late: "Late",
            leave: "Leave",
            early: "Early Leave",
          },

          calendarHint: "Select a specific month to view calendar.",

          events: {
            absent: "Absent",
            late: "Late",
            early: "Early",
          },

          weekdays: {
            sun: "Sun",
            mon: "Mon",
            tue: "Tue",
            wed: "Wed",
            thu: "Thu",
            fri: "Fri",
            sat: "Sat",
          },
        },

        /* -------- Year End Configuration -------- */
        yearEndConfig: {
          title: "Year End Configuration",
          subtitle: "Configure carry-over, quotas, and global policies.",

          carryOverTitle: "Leave Type Carry Over",
          carryOverHint: "Maximum carry over days to next year (per employee)",

          quotaTitle: "Configure Quotas for {{year}}",
          quotaHint: "Base leave quota per employee",

          maxConsecutiveTitle: "Global Policy: Max Consecutive Holidays",
          unlimitedHint: "0 = Unlimited",

          targetYear: "Target Year",

          process: "Confirm & Process",
          processing: "Processing...",

          warning:
            "This action will overwrite quotas for all employees and lock previous data.",
        },

        /* -------- Employee Detail -------- */
        employeeDetail: {
          loading: "LOADING PROFILE...",
          working: "Working",
          resigned: "Resigned",
          joined: "Joined",
          manageInfo: "Manage Info",
          leaveBalance: "Leave Balance",
          employeeInfo: "Employee Information",
          fullAccess: "Full Access",
          standardAccess: "Standard Access",
          roleNote:
            "Note: Changing the role will affect system access permissions.",
          newPassword: "New Password",
          passwordOptional: "(Leave blank to keep current password)",
          passwordMin: "At least 6 characters",
          confirmPassword: "Confirm Password",
          confirmPasswordPlaceholder: "Enter the same new password",
          terminate: "Terminate",
          reinstate: "Reinstate",
          adjustQuota: "Adjust Quota",
          fetchFailed: "Could not retrieve employee data.",
          quotaUpdated: "Quota updated successfully.",
          quotaFailed: "Failed to update quota.",
          passwordMismatch: "The passwords do not match.",
          infoUpdated: "Information updated.",
        },
        /* -------- Employee list -------- */
        employeeList: {
          title: "Employee Directory",
          addNew: "Add New Employee",
          leavePolicy: "Leave Policy",

          activeTab: "Active",
          resignedTab: "Resigned",

          allRoles: "All Roles",
          roleWorker: "Worker",
          roleHR: "HR",

          searchPlaceholder: "Search by name, email or ID",

          colId: "ID",
          colName: "Name",
          colEmail: "Email",
          colRole: "Role",
          colStatus: "Status",

          statusWorking: "Working",
          statusResigned: "Resigned",

          noEmployees: "No employees found",

          page: "Page",
          prev: "Prev",
          next: "Next",

          colExport: "Export",
          exportEmployee: "Export employee",

          aria: {
            closeRoleDropdown: "Close role dropdown",
          },

          pagination: {
            label: "Page {{page}} / {{totalPages}}",
          },

          exportAll: {
            button: "Export All",
            buttonTitle: "Export All",
            title: "Export All",

            workbook: {
              title: "(1) Export Workbook (.xlsx) — Multiple sheets",
              desc: "For selecting multiple employees (xlsx, 1 sheet per employee)",
            },
            employeesList: {
              title: "(2) Export employee list",
              desc: "For exporting employee list (csv)",
            },
            note: "* Note: Multiple sheets require xlsx (CSV cannot contain multiple sheets).",
          },
        },

        employeeCreate: {
          title: "Employee Information",

          firstName: "Name",
          lastName: "Surname",
          email: "Email",
          emailPlaceholder: "Please enter email",

          role: "Role",
          workerAccess: "Standard Access",
          hrAccess: "Full Access",
          roleNote: "Note: Changing role affects system permissions.",

          joinDate: "Join Date",

          password: "Password",
          passwordHint: "Minimum 6 characters",

          confirmTitle: "Confirm Registration",
          confirmButton: "Register",
          cancel: "Cancel",
          submit: "Register",
          processing: "Processing...",

          roleWorker: "Worker",
          roleHR: "HR",
          selected: "Selected",

          confirmReviewTitle: "Please review the information below",
          successText: "Added new employee successfully.",

          success: "Success",
          failed: "Failed",
        },
        /* -------- working days -------- */
        workingDays: {
          title: "Working Days",
          subtitle: "Select working days and save policy",

          loading: "Loading working days policy...",

          currently: "Currently:",

          saveBtn: "Save",
          savingBtn: "Saving...",
          loadingBtn: "Loading...",

          mon: "Mon",
          tue: "Tue",
          wed: "Wed",
          thu: "Thu",
          fri: "Fri",
          sat: "Sat",
          sun: "Sun",
        },
        /* -------- worktimeby role -------- */
        workTimeByRole: {
          title: "Work Time (By Role)",
          subtitle: "Set check-in / check-out time for each role",

          roleHR: "HR",
          roleWorker: "Worker",

          checkIn: "Check-in Time",
          checkOut: "Check-out Time",

          current: "Current:",

          saveBtn: "Save Work Time",
          savingBtn: "Saving...",
        },
        /* -------- YearEnd History -------- */
        yearEndHistory: {
          title: "Processing History",

          year: "Year",
          lockStatus: "Lock Status",
          processedAt: "Processed At",
          action: "Action",

          closed: "Closed",
          open: "Open",

          unlock: "Unlock This Year",

          empty: "No processing history available.",
        },
        /* -------- YearEnd Policy -------- */
        yearEndPolicy: {
          title: "Holiday Policy & Special Holidays",
          subtitle: "Configure working days and manage special holidays.",
        },
        /* -------- YearEnd Process -------- */
        yearEndProcess: {
          title: "Year-End Processing & Quota Assignment",
          subtitle:
            "Carry over leave balances and assign new yearly quotas in one step.",
        },
        /* -------- Team Calendar -------- */
        teamCalendar: {
          title: "Team Calendar",
          subtitle: "View team leaves and special holidays",

          actions: {
            todayOverview: "Today’s Overview ({{count}})",
            today: "Today",
            prevMonth: "Previous month",
            nextMonth: "Next month",
            openDay: "View details",
            close: "Close",
            refresh: "Refresh",
            clear: "Clear",
          },

          filters: {
            leaveTypesLabel: "Leave Types",
            allTypes: "All",

            // ✅ used by LeaveTypeFilters (labelKey)
            leaveTypes: {
              sick: "Sick Leave",
              vacation: "Vacation Leave",
              personal: "Personal Leave",
            },

            roleLabel: "Role",
            allRoles: "All",
            searchPlaceholder: "Search name / email...",
          },

          tabs: {
            pending: "Pending",
            approved: "Approved",
            rejected: "Rejected",
          },

          week: {
            sun: "Sun",
            mon: "Mon",
            tue: "Tue",
            wed: "Wed",
            thu: "Thu",
            fri: "Fri",
            sat: "Sat",
          },

          hints: {
            lateRule:
              "* Late rule: after {{time}}, if not checked-in it will be counted as “Late”.",
          },

          loading: {
            calendar: "Loading calendar...",
            modal: "Loading details...",
            attendance: "Loading attendance...",
          },

          grid: {
            loading: "Loading...",
            moreTypes: "+{{count}} types",
          },

          status: {
            pending: "Pending",
            approved: "Approved",
            rejected: "Rejected",
            cancelled: "Cancelled",
            withdrawn: "Withdrawn",
          },

          // ✅ TeamAttendancePanel uses this block
          attendance: {
            title: "Team Check-in / Check-out (Today)",
            subtitle:
              "Total {{total}} • Checked-in {{checkedIn}} • Late {{late}} • Checked-out {{checkedOut}}",

            cards: {
              checkedIn: "Checked In",
              late: "Late",
              checkedOut: "Checked Out",
            },

            searchPlaceholder: "Search name, email, ID...",

            table: {
              employee: "Employee",
              role: "Role",
              in: "In",
              out: "Out",
              statusIn: "Status In",
              statusOut: "Status Out",
              actions: "Actions",
            },

            loading: "Loading attendance...",
            empty: {
              activeNone: "No active employee attendance data",
              noMatch: "No matching employees",
            },

            unknown: "Unknown",

            buttons: {
              saving: "Saving...",
              checkIn: "Check In",
              checkOut: "Check Out",
            },

            statusIn: {
              onTime: "On Time",
              late: "Late",
              leave: "Leave",
              waiting: "Waiting",
              normal: "Normal",
            },

            statusOut: {
              none: "-",
              normal: "Normal",
              earlyLeave: "Early Leave",
              noCheckout: "No Check-out",
              leave: "Leave",
            },

            pagination: {
              label:
                "Page {{page}} / {{totalPages}} • Showing {{start}}-{{end}} of {{total}}",
            },
          },

          // ✅ DailyDetailsModal uses this block
          modal: {
            title: "Daily Details",

            pills: {
              checkedIn: "Checked In",
              late: "Late",
              absent: "Absent",
              onLeave: "On Leave",
            },

            nav: {
              prevDay: "Previous day",
              nextDay: "Next day",
              goToday: "Go to today",
            },

            tabs: {
              pending: "Pending Approvals",
              approved: "Approved",
              rejected: "Rejected",
            },

            role: {
              all: "All Roles",
              worker: "Worker",
              hr: "HR",
            },

            searchPlaceholder: "Search name, email, ID...",

            table: {
              employee: "Employee",
              type: "Type",
              noteReason: "Note / Reason",
              duration: "Duration",
              evidence: "Evidence",
              action: "Action",
              approvedBy: "Approved By",
              rejectedBy: "Rejected By",
            },

            loading: "SYNCHRONIZING DATA...",
            noData: "No Data",
            noFile: "No File",
            ref: "Ref: #{{id}}",

            tooltips: {
              viewAttachment: "View Attachment",
              approve: "Approve",
              special: "Special Approval",
              reject: "Reject",
            },

            actions: {
              approve: "Approved",
              special: "Special",
              reject: "Rejected",

              approveFull: "Normal Approve",
              specialFull: "Special Approval (Non-deductible)",
              rejectFull: "Reject",
            },

            confirm: {
              title: "Confirm {{action}}",
              text: "Process request of <b>{{name}}</b> as <b>{{action}}</b>?",
            },

            toast: {
              processedOne: "Processed 1 request.",
              actionFailedTitle: "Action Failed",
              unknownError: "Unknown error",
            },

            hrNameHint:
              "* Approved/Rejected tab will show HR name if backend provides approvedBy/rejectedBy.",

            specialReasonPrefix: "Special Case Approval",
            noReason: "No reason",

            reasonTitle: "Reason: {{reason}}",
            noteTitle: "Note: {{note}}",
          },
        },

        /* -------- Notification Bell -------- */
        notificationBell: {
          title: "Notifications",
          readAll: "Read everything",
          empty: "No new notifications",
          view: "View",
          tooltip: {
            openEmployee: "Open employee details",
            markRead: "Mark as read",
          },
          aria: {
            toggle: "Toggle notifications",
          },
        },

        // -------- Employee Export --------
        employeeExport: {
          title: "Export CSV (Employee)",
          exportType: {
            label: "Export type",
            attendance: "Attendance",
            leaveRequests: "Leave Requests",
          },
          period: {
            label: "Period",
            daily: "Daily",
            monthly: "Monthly",
            yearly: "Yearly",
            quarter: "Quarter",
            customRange: "Custom range",
            selectDate: "Select date",
            selectMonth: "Select month",
            selectYear: "Select year",
          },
          quarter: {
            year: "Year",
            quarter: "Quarter",
            q1: "Q1 (Jan–Mar)",
            q2: "Q2 (Apr–Jun)",
            q3: "Q3 (Jul–Sep)",
            q4: "Q4 (Oct–Dec)",
          },
          custom: {
            dateFrom: "Date from",
            dateTo: "Date to",
            pickDate: "Pick date",
          },
          range: {
            label: "Range:",
          },
          buttons: {
            export: "Export",
          },
          common: {
            all: "All",
          },
          picker: {
            selectDate: "Select date",
            selectMonth: "Select month",
            selectYear: "Select year",
            dateFrom: "Date from",
            dateTo: "Date to",
          },
          errors: {
            noEmployee: "Employee not found.",
            customIncomplete:
              "Please select both start and end dates for Custom range.",
            endpoint404:
              "Export failed: Backend endpoint not found (404). Please check backend API routes and update paths in this file.",
            exportFailed: "Export failed",
          },
        },

        // -------- Employees All Export --------
        employeesAllExport: {
          title: "Export Employees (All)",
          rowsToExport: "Rows to export:",
          previewRows: "Preview rows:",
          buttons: {
            exportCsv: "Export CSV",
          },
          filters: {
            label: "Filters",
            activeTab: "Active tab",
            resignedTab: "Resigned tab",
            role: "Role",
            status: "Status",
            keyword: "Keyword",
            keywordPlaceholder: "Search by name, email, role, ID...",
          },
          options: {
            all: "All",
            worker: "Worker",
            hr: "HR",
          },
          status: {
            active: "Active",
            inactive: "Inactive",
          },
          columns: {
            label: "Columns",
            employeeId: "Employee ID",
            firstName: "First name",
            lastName: "Last name",
            email: "Email",
            role: "Role",
            status: "Status (active/inactive)",
            joiningDate: "Joining date",
            tip: "Tip: Turn off columns you don't need to reduce file size.",
          },
        },

        // -------- XLSX Workbook Export --------
        xlsxWorkbook: {
          title: "Export Workbook (XLSX)",
          employeesCount: "Employees:",
          workbookType: {
            label: "Workbook type",
            perEmployee: "Per Employee (many sheets)",
            employeesList: "Employees List (one sheet)",
          },
          dataType: {
            label: "Data type",
            attendance: "Attendance",
            leave: "Leave Requests",
          },
          period: {
            label: "Period",
            daily: "Daily",
            monthly: "Monthly",
            yearly: "Yearly",
            quarter: "Quarter",
            custom: "Custom range",
          },
          fields: {
            selectDate: "Select date",
            selectMonth: "Select month",
            selectYear: "Select year",
            year: "Year",
            quarter: "Quarter",
            dateFrom: "Date from",
            dateTo: "Date to",
          },
          placeholders: {
            pickDate: "Pick a date",
            pickMonth: "Pick a month",
            pickYear: "Pick a year",
            pickStart: "Pick start date",
            pickEnd: "Pick end date",
          },
          rangeLabel: "Range:",
          buttons: {
            exportXlsx: "Export XLSX",
          },
          quarters: {
            q1: "Q1 (Jan–Mar)",
            q2: "Q2 (Apr–Jun)",
            q3: "Q3 (Jul–Sep)",
            q4: "Q4 (Oct–Dec)",
          },
          picker: {
            select: "Select",
            selectDate: "Select date",
            selectMonth: "Select month",
            selectYear: "Select year",
            dateFrom: "Date from",
            dateTo: "Date to",
          },
          errors: {
            noEmployees: "No employees to export.",
            pickDaily: "Please select a date (Daily).",
            pickMonthly: "Please select a month (Monthly).",
            pickCustom: "Please select both start and end date (Custom).",
            exportFailed: "Export workbook failed.",
          },
        },

        /* -------- Audit Log Export -------- */
        auditLogExport: {
          title: "Export CSV Filters",
          period: {
            label: "Period",
            daily: "Daily",
            monthly: "Monthly",
            yearly: "Yearly",
            quarter: "Quarter",
            customRange: "Custom range",
            selectDate: "Select date",
            selectMonth: "Select month",
            selectYear: "Select year",
          },
          quarter: {
            year: "Year",
            quarter: "Quarter",
            q1: "Q1 (Jan–Mar)",
            q2: "Q2 (Apr–Jun)",
            q3: "Q3 (Jul–Sep)",
            q4: "Q4 (Oct–Dec)",
          },
          custom: {
            dateFrom: "Date from",
            dateTo: "Date to",
          },
          range: {
            label: "Range:",
            to: "→",
          },
          filters: {
            model: "Model",
            performedBy: "Performed by",
            keyword: "Keyword (details)",
            recordId: "Record ID (optional)",
            actions: "Actions (multi-select)",
          },
          actions: {
            clearActions: "Clear actions",
            noActions: "No actions loaded yet",
          },
          preview: {
            rowsToExport: "Rows to export:",
          },
          buttons: {
            export: "Export",
          },
          common: {
            all: "All",
            reset: "Reset",
          },
          placeholders: {
            date: "YYYY-MM-DD",
            month: "YYYY-MM",
            year: "YYYY",
            keyword: 'e.g. "Late", "Approved", "withdraw"...',
            recordId: "e.g. 6 or 10",
          },
          picker: {
            selectDate: "Select date",
            selectMonth: "Select month",
            selectYear: "Select year",
            dateFrom: "Date from",
            dateTo: "Date to",
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
          attendance: "เช็คชื่อ",
          welcome: "ยินดีต้อนรับ {{firstName}} {{lastName}}",
          selectYear: "เลือกปี",
          year: "ปี",

          checkIn: "เช็กอิน",
          checkOut: "เช็กเอาต์",
          updatecheckOut: "อัปเดตเวลาออก",
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
          yearEnd: "ตั้งค่าระบบ",
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
          confirm: "ยืนยัน",
          cancel: "ยกเลิก",
          days: "วัน",
          unlimited: "ไม่จำกัด",
          today: "วันนี้",
          page: "หน้า",
          showing: "แสดง",
          of: "จาก",

          prev: "ก่อนหน้า",
          next: "ถัดไป",
          back: "กลับ",

          close: "ปิด",

          // Alerts / Validation
          missingInfo: "ข้อมูลไม่ครบถ้วน",
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
          carriedDetail: "({{base}} สิทธิปีนี้ + {{carry}} ทบมา)",
        },

        /* -------- History -------- */
        history: {
          attendanceLog: "ประวัติการลงเวลา",
          leaveHistory: "ประวัติการลา",
          tabAttendance: "การลงเวลา",
          tabLeave: "การลา",
          date: "วันที่",
          inOut: "เข้า / ออก",
          status: "สถานะ",
          statusIn: "สถานะเข้า",
          statusOut: "สถานะออก",
          signedBy: "ดำเนินการโดย",
          type: "ประเภท",
          period: "ช่วงเวลา",
          days: "จำนวนวัน",
          note: "หมายเหตุ",
          file: "ไฟล์แนบ",
          noData: "ไม่พบข้อมูล",
          filter: "ตัวกรอง",
          clear: "ล้างค่า",
          selectDate: "เลือกวันที่",

          late: "สาย",
          onTime: "ตรงเวลา",
          absent: "ขาดงาน",
          leave: "ลา",
          early: "ออกก่อน",
          normal: "ปกติ",
          noCheckout: "ไม่ลงชื่อออก",
          notCheckedOutYet: "ยังไม่ลงชื่อออก",

          deleteTitle: "ลบรายการลา?",
          deleteText: "คุณแน่ใจหรือไม่ที่จะลบรายการนี้?<br/><b>{{type}}</b>",
          deleteButton: "ลบรายการ",
          requestCancelButton: "ขอยกเลิก",
        },

        /* -------- Leave Approval -------- */
        leaveApproval: {
          title: "รายการรอดำเนินการ",
          selected: "เลือกแล้ว {{count}} รายการ",
          bulkApprove: "อนุมัติที่เลือก",
          bulkSpecial: "อนุมัติพิเศษที่เลือก",
          bulkReject: "ปฏิเสธที่เลือก",

          table: {
            employee: "พนักงาน",
            type: "ประเภท",
            reason: "หมายเหตุ / เหตุผล",
            duration: "ระยะเวลา",
            evidence: "หลักฐาน",
            action: "ดำเนินการ",
          },

          loading: "กำลังซิงโครไนซ์ข้อมูล...",
          noData: "ไม่มีรายการรอดำเนินการ",
          ref: "อ้างอิง: #{{id}}",
          days: "วัน",
          noFile: "ไม่มีไฟล์",

          actions: {
            approve: "อนุมัติแล้ว",
            special: "อนุมัติพิเศษ",
            reject: "ปฏิเสธแล้ว",
          },

          tooltips: {
            viewAttachment: "ดูไฟล์แนบ",
            approve: "อนุมัติ",
            special: "อนุมัติเป็นกรณีพิเศษ",
            reject: "ปฏิเสธ",
          },

          labels: {
            reason: "เหตุผล",
            cancelReason: "เหตุผลที่ยกเลิก",
            note: "หมายเหตุ",
          },

          cancellationRequests: "รายการขอยกเลิก",
          newrequest: "คำขอใหม่",

          selectionEmptyTitle: "ไม่ได้เลือกรายการ",
          selectionEmptyText: "กรุณาเลือกอย่างน้อยหนึ่งรายการ",

          confirmTitle: "ยืนยันการ{{action}}",
          confirmText:
            "คุณแน่ใจหรือไม่ว่าต้องการ{{action}}จำนวน {{count}} รายการ?",

          processed: "ดำเนินการเรียบร้อยแล้ว {{count}} รายการ",
          actionFailed: "การดำเนินการล้มเหลว",

          actionText: {
            approve: "อนุมัติ",
            special: "อนุมัติพิเศษ",
            reject: "ปฏิเสธ",
          },

          tabs: {
            new: "คำขอใหม่",
            cancel: "คำขอที่ยกเลิก",
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
            maxCarryOver: "ทบต่อไปปีหน้าได้สูงสุด (วัน)",
            maxConsecutive: "ลาติดต่อกันสูงสุด (วัน)",
            cancelEdit: "ยกเลิกการแก้ไข",
            editTitle: "แก้ไขประเภทวันลา",
            addTitle: "เพิ่มประเภทวันลา",
            subtitle: "เพิ่ม / แก้ไข ประเภทการลา และมีผลทันที",
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

        /* -------- SweetAlert -------- */
        sweetAlert: {
          reject: {
            title: "ปฏิเสธคำขอลา",
            label: "เหตุผลในการปฏิเสธ",
            placeholder: "กรุณาระบุเหตุผลในการปฏิเสธ...",
            confirm: "ปฏิเสธ",
            required: "กรุณาระบุเหตุผล",
          },
        },

        /* -------- Date Grid Picker -------- */
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
        },

        /* -------- Leave Request -------- */
        leaveRequest: {
          type: "ประเภทการลา",
          none: "ไม่มี",

          fullDay: "เต็มวัน",
          halfMorning: "ครึ่งวัน (เช้า)",
          halfAfternoon: "ครึ่งวัน (บ่าย)",

          errors: {
            missingType: "กรุณาเลือกประเภทการลา",
            missingDates: "กรุณาระบุวันที่เริ่มและวันที่สิ้นสุด",
            invalidDate: "วันที่สิ้นสุดต้องมากกว่าวันที่เริ่ม",
          },

          blockedTitle: "ไม่สามารถทำรายการได้",
          blockedMessage: "ไม่สามารถขอลาในวันหยุดหรือวันที่ไม่ใช่วันทำงาน",

          submissionFailed: "ส่งคำขอไม่สำเร็จ",

          headerTitle: "ยื่นคำขอลา",
          headerSubtitle: "ระบบจัดการการลาของพนักงาน",

          step1: "1. เลือกประเภทการลา",
          step2: "2. เลือกวันที่และระยะเวลา",
          step3: "3. เหตุผล",
          step4: "4. ไฟล์แนบ (ถ้ามี)",

          start: "เริ่มต้น",
          end: "สิ้นสุด",

          chooseFile: "เลือกไฟล์",
          removeFile: "ลบไฟล์",
          noFileSelected: "ยังไม่ได้เลือกไฟล์",

          attachNote: "คุณสามารถแนบเอกสารประกอบได้ (เช่น ใบรับรองแพทย์)",

          placeholderReason: "กรุณาระบุรายละเอียด...",

          // ... (Previous leaveRequest translations)
          summaryTitle: "สรุปคำขอการลา",
          summaryReview: "กรุณาตรวจสอบรายละเอียดก่อนยืนยัน",
          summary: {
            type: "ประเภท",
            period: "ช่วงเวลา",
            duration: "ระยะเวลา",
            attachment: "ไฟล์แนบ",
            reason: "เหตุผล",
          },
          confirmTitle: "ยืนยันคำขอการลา",
          confirmText: "คุณต้องการส่งคำขอการลานี้ใช่หรือไม่?",
          confirmButton: "ส่งคำขอ",
          successTitle: "ส่งคำขอสำเร็จ",
          successMessage: "คำขอการลาของคุณถูกส่งเรียบร้อยแล้ว",
          cancel: "ยกเลิก",
          submitting: "กำลังส่งคำขอ...",
          submit: "ส่งคำขอการลา",
        },

        attendanceDashboard: {
          title: "การเข้างาน",
          viewing: "กำลังดูข้อมูลของ:",
          noData: "ไม่มีข้อมูลการเข้างาน",
          selectMonthHint: "เลือกเดือนเพื่อดูปฏิทิน",
          allYear: "ทั้งปี {{year}}",
          workingDays: "วันทำงาน",
          presentExpected: "มาทำงาน / ทั้งหมด",
          late: "การมาสาย",
          early: "การออกก่อนเวลา",
          leave: "การลาที่อนุมัติแล้ว",
          absent: "การขาดงาน",
          daysTaken: "จำนวนวันที่ใช้",
          unexcused: "ขาดงานโดยไม่แจ้ง",
          minutes: "นาที",
          present: "มาทำงาน",
          attendanceRatio: "อัตราการเข้างาน",
          leaveTypes: "ประเภทการลา",
          subtitle: "ภาพรวมการเข้างาน",
          filterAll: "ทั้งหมดของปี {{year}}",
          clear: "ล้างข้อมูล",
          selectPeriod: "เลือกช่วงเวลา",
          loading: "กำลังโหลดสถิติ...",
          noDataFound: "ไม่พบข้อมูลการเข้างาน",
          yearlyView: "มุมมองรายปี",
          calendar: "ปฏิทินเดือน {{month}}",
          stat: {
            workingDays: "วันทำงาน",
            presentExpected: "มาทำงาน / ทั้งหมด",
            late: "สาย",
            earlyLeave: "ออกก่อนเวลา",
            leaves: "ลา",
            absences: "ขาดงาน",
            approved: "อนุมัติแล้ว",
            unexcused: "ไม่แจ้ง",
            minutes: "นาที",
          },
          legend: {
            holiday: "วันหยุด",
            absent: "ขาดงาน",
            late: "สาย",
            leave: "ลา",
            early: "ออกก่อนเวลา",
          },
          weekdays: {
            sun: "อา.",
            mon: "จ.",
            tue: "อ.",
            wed: "พ.",
            thu: "พฤ.",
            fri: "ศ.",
            sat: "ส.",
          },
        },

        yearEndConfig: {
          title: "การตั้งค่าประมวลผลสิ้นปี",
          subtitle: "ตั้งค่าการยกยอด, โควต้า และนโยบายส่วนกลาง",
          carryOverTitle: "การยกยอดประเภทการลา",
          carryOverHint: "จำนวนวันที่ยกยอดไปปีหน้าได้สูงสุด (ต่อพนักงาน)",
          quotaTitle: "ตั้งค่าโควต้าสำหรับปี {{year}}",
          quotaHint: "โควต้าการลาพื้นฐานต่อพนักงาน",
          maxConsecutiveTitle: "นโยบาย: จำนวนวันหยุดต่อเนื่องสูงสุด",
          unlimitedHint: "0 = ไม่จำกัด",
          targetYear: "ปีที่ดำเนินการ",
          process: "ยืนยันและประมวลผล",
          processing: "กำลังประมวลผล...",
          warning:
            "การดำเนินการนี้จะเขียนทับโควต้าของพนักงานทุกคนและล็อคข้อมูลของปีที่ผ่านมา",
        },

        employeeDetail: {
          loading: "กำลังโหลดข้อมูลพนักงาน...",
          working: "กำลังทำงาน",
          resigned: "ลาออกแล้ว",
          joined: "วันที่เข้าทำงาน",
          manageInfo: "จัดการข้อมูล",
          leaveBalance: "ยอดลาคงเหลือ",
          employeeInfo: "ข้อมูลพนักงาน",
          fullAccess: "สิทธิ์การเข้าถึงทั้งหมด (Full Access)",
          standardAccess: "สิทธิ์การเข้าถึงทั่วไป (Standard Access)",
          roleNote:
            "หมายเหตุ: การเปลี่ยนบทบาทจะส่งผลต่อสิทธิ์การเข้าใช้งานระบบ",
          newPassword: "รหัสผ่านใหม่",
          passwordOptional: "(เว้นว่างไว้หากไม่ต้องการเปลี่ยน)",
          passwordMin: "อย่างน้อย 6 ตัวอักษร",
          confirmPassword: "ยืนยันรหัสผ่าน",
          confirmPasswordPlaceholder: "กรอกรหัสผ่านใหม่อีกครั้ง",
          terminate: "สิ้นสุดการจ้างงาน",
          reinstate: "กลับเข้าทำงาน",
          adjustQuota: "ปรับโควต้า",
          fetchFailed: "ไม่สามารถเรียกข้อมูลพนักงานได้",
          quotaUpdated: "อัปเดตโควต้าสำเร็จ",
          quotaFailed: "อัปเดตโควต้าล้มเหลว",
          passwordMismatch: "รหัสผ่านไม่ตรงกัน",
          infoUpdated: "อัปเดตข้อมูลเรียบร้อยแล้ว",
        },

        employeeList: {
          title: "รายชื่อพนักงาน",
          addNew: "เพิ่มพนักงานใหม่",
          leavePolicy: "นโยบายการลา",
          activeTab: "พนักงานปัจจุบัน",
          resignedTab: "พนักงานที่ลาออก",
          allRoles: "ทุกบทบาท",
          roleWorker: "พนักงานทั่วไป",
          roleHR: "HR",
          searchPlaceholder: "ค้นหาด้วยชื่อ, อีเมล หรือ รหัส",
          colId: "รหัส",
          colName: "ชื่อ",
          colEmail: "อีเมล",
          colRole: "บทบาท",
          colStatus: "สถานะ",
          statusWorking: "กำลังทำงาน",
          statusResigned: "ลาออกแล้ว",
          noEmployees: "ไม่พบข้อมูลพนักงาน",
          page: "หน้า",
          prev: "ก่อนหน้า",
          next: "ถัดไป",
          colExport: "ส่งออก",
          exportEmployee: "ส่งออกข้อมูลพนักงาน",
          aria: { closeRoleDropdown: "ปิดรายการเลือกบทบาท" },
          pagination: { label: "หน้า {{page}} / {{totalPages}}" },
          exportAll: {
            button: "ส่งออกทั้งหมด",
            buttonTitle: "ส่งออกข้อมูลพนักงานทั้งหมด",
            title: "ส่งออกทั้งหมด",
            workbook: {
              title: "(1) ส่งออกไฟล์ Workbook (.xlsx) — แยกชีท",
              desc: "สำหรับเลือกพนักงานหลายคน (1 พนักงานต่อ 1 ชีท)",
            },
            employeesList: {
              title: "(2) ส่งออกรายชื่อพนักงาน",
              desc: "สำหรับส่งออกเฉพาะรายชื่อพนักงาน (csv)",
            },
            note: "* หมายเหตุ: การแยกหลายชีทต้องใช้ไฟล์ xlsx เท่านั้น (CSV ไม่สามารถมีหลายชีทได้)",
          },
        },

        employeeCreate: {
          title: "ข้อมูลพนักงาน",
          firstName: "ชื่อ",
          lastName: "นามสกุล",
          email: "อีเมล",
          emailPlaceholder: "กรุณากรอกอีเมล",
          role: "บทบาท",
          workerAccess: "สิทธิ์ทั่วไป",
          hrAccess: "สิทธิ์ทั้งหมด",
          roleNote: "หมายเหตุ: การเปลี่ยนบทบาทส่งผลต่อสิทธิ์การใช้งานระบบ",
          joinDate: "วันที่เริ่มงาน",
          password: "รหัสผ่าน",
          passwordHint: "ขั้นต่ำ 6 ตัวอักษร",
          confirmTitle: "ยืนยันการลงทะเบียน",
          confirmButton: "ลงทะเบียน",
          cancel: "ยกเลิก",
          submit: "ลงทะเบียนพนักงาน",
          processing: "กำลังดำเนินการ...",
          roleWorker: "พนักงานทั่วไป",
          roleHR: "HR",
          selected: "เลือกแล้ว",
          confirmReviewTitle: "กรุณาตรวจสอบข้อมูลด้านล่าง",
          successText: "เพิ่มพนักงานใหม่สำเร็จ",
          success: "สำเร็จ",
          failed: "ล้มเหลว",
        },

        workingDays: {
          title: "วันทำงาน",
          subtitle: "เลือกวันทำงานและบันทึกนโยบาย",
          loading: "กำลังโหลดนโยบายวันทำงาน...",
          currently: "ปัจจุบัน:",
          saveBtn: "บันทึก",
          savingBtn: "กำลังบันทึก...",
          loadingBtn: "กำลังโหลด...",
          mon: "จ.",
          tue: "อ.",
          wed: "พ.",
          thu: "พฤ.",
          fri: "ศ.",
          sat: "ส.",
          sun: "อา.",
        },

        workTimeByRole: {
          title: "เวลาทำงาน (ตามบทบาท)",
          subtitle: "ตั้งเวลาเช็คอิน / เช็คเอาท์ สำหรับแต่ละบทบาท",
          roleHR: "HR",
          roleWorker: "พนักงานทั่วไป",
          checkIn: "เวลาเข้างาน",
          checkOut: "เวลาเลิกงาน",
          current: "ปัจจุบัน:",
          saveBtn: "บันทึกเวลาทำงาน",
          savingBtn: "กำลังบันทึก...",
        },

        yearEndHistory: {
          title: "ประวัติการประมวลผล",
          year: "ปี",
          lockStatus: "สถานะการล็อค",
          processedAt: "ประมวลผลเมื่อ",
          action: "การกระทำ",
          closed: "ปิดงวดแล้ว",
          open: "ยังไม่ปิดงวด",
          unlock: "ปลดล็อคปีนี้",
          empty: "ไม่มีประวัติการประมวลผล",
        },

        yearEndPolicy: {
          title: "นโยบายวันหยุดและวันหยุดพิเศษ",
          subtitle: "กำหนดวันทำงานและจัดการวันหยุดพิเศษ",
        },

        yearEndProcess: {
          title: "การประมวลผลสิ้นปีและกำหนดโควต้า",
          subtitle: "ยกยอดวันลาคงเหลือและกำหนดโควต้าปีใหม่ในขั้นตอนเดียว",
        },

        teamCalendar: {
          title: "ปฏิทินทีม",
          subtitle: "ดูการลาของทีมและวันหยุดพิเศษ",
          actions: {
            todayOverview: "ภาพรวมวันนี้ ({{count}})",
            today: "วันนี้",
            prevMonth: "เดือนก่อนหน้า",
            nextMonth: "เดือนถัดไป",
            openDay: "ดูรายละเอียด",
            close: "ปิด",
            refresh: "รีเฟรช",
            clear: "ล้าง",
          },
          filters: {
            leaveTypesLabel: "ประเภทการลา",
            allTypes: "ทั้งหมด",
            leaveTypes: {
              sick: "ลาป่วย",
              vacation: "ลาพักร้อน",
              personal: "ลากิจ",
            },
            roleLabel: "บทบาท",
            allRoles: "ทุกบทบาท",
            searchPlaceholder: "ค้นหาชื่อ / อีเมล...",
          },
          tabs: {
            pending: "รออนุมัติ",
            approved: "อนุมัติแล้ว",
            rejected: "ปฏิเสธแล้ว",
          },
          week: {
            sun: "อา.",
            mon: "จ.",
            tue: "อ.",
            wed: "พ.",
            thu: "พฤ.",
            fri: "ศ.",
            sat: "ส.",
          },
          hints: {
            lateRule:
              "* กฎการสาย: หลังเวลา {{time}} หากยังไม่เช็คอินจะถือว่า “สาย”",
          },
          loading: {
            calendar: "กำลังโหลดปฏิทิน...",
            modal: "กำลังโหลดรายละเอียด...",
            attendance: "กำลังโหลดข้อมูลการเข้างาน...",
          },
          grid: { loading: "กำลังโหลด...", moreTypes: "+อีก {{count}} ประเภท" },
          status: {
            pending: "รออนุมัติ",
            approved: "อนุมัติแล้ว",
            rejected: "ปฏิเสธแล้ว",
            cancelled: "ยกเลิกแล้ว",
            withdrawn: "ถอนคำขอแล้ว",
          },
          attendance: {
            title: "การเช็คอิน / เช็คเอาท์ ของทีม (วันนี้)",
            subtitle:
              "ทั้งหมด {{total}} • เช็คอินแล้ว {{checkedIn}} • สาย {{late}} • เช็คเอาท์แล้ว {{checkedOut}}",
            cards: {
              checkedIn: "เช็คอินแล้ว",
              late: "สาย",
              checkedOut: "เช็คเอาท์แล้ว",
            },
            searchPlaceholder: "ค้นหาชื่อ, อีเมล, รหัสพนักงาน...",
            table: {
              employee: "พนักงาน",
              role: "บทบาท",
              in: "เข้า",
              out: "ออก",
              statusIn: "สถานะเข้า",
              statusOut: "สถานะออก",
              actions: "การกระทำ",
            },
            loading: "กำลังโหลดข้อมูลการเข้างาน...",
            empty: {
              activeNone: "ไม่มีข้อมูลการเข้างานของพนักงาน",
              noMatch: "ไม่พบพนักงานที่ค้นหา",
            },
            unknown: "ไม่ระบุ",
            buttons: {
              saving: "กำลังบันทึก...",
              checkIn: "เช็คอิน",
              checkOut: "เช็คเอาท์",
            },
            statusIn: {
              onTime: "ตรงเวลา",
              late: "สาย",
              leave: "ลา",
              waiting: "รอเช็คอิน",
              normal: "ปกติ",
            },
            statusOut: {
              none: "-",
              normal: "ปกติ",
              earlyLeave: "ออกก่อนเวลา",
              noCheckout: "ไม่เช็คเอาท์",
              leave: "ลา",
            },
            pagination: {
              label:
                "หน้า {{page}} / {{totalPages}} • แสดง {{start}}-{{end}} จาก {{total}}",
            },
          },
          modal: {
            title: "รายละเอียดรายวัน",
            pills: {
              checkedIn: "เช็คอินแล้ว",
              late: "สาย",
              absent: "ขาดงาน",
              onLeave: "ลา",
            },
            nav: {
              prevDay: "วันก่อนหน้า",
              nextDay: "วันถัดไป",
              goToday: "ไปที่วันนี้",
            },
            tabs: {
              pending: "รอการอนุมัติ",
              approved: "อนุมัติแล้ว",
              rejected: "ปฏิเสธแล้ว",
            },
            role: { all: "ทุกบทบาท", worker: "พนักงานทั่วไป", hr: "HR" },
            searchPlaceholder: "ค้นหาชื่อ, อีเมล, รหัส...",
            table: {
              employee: "พนักงาน",
              type: "ประเภท",
              noteReason: "หมายเหตุ / เหตุผล",
              duration: "ระยะเวลา",
              evidence: "หลักฐาน",
              action: "การกระทำ",
              approvedBy: "อนุมัติโดย",
              rejectedBy: "ปฏิเสธโดย",
            },
            loading: "กำลังซิงค์ข้อมูล...",
            noData: "ไม่มีข้อมูล",
            noFile: "ไม่มีไฟล์",
            ref: "อ้างอิง: #{{id}}",
            tooltips: {
              viewAttachment: "ดูไฟล์แนบ",
              approve: "อนุมัติ",
              special: "อนุมัติกรณีพิเศษ",
              reject: "ปฏิเสธ",
            },
            actions: {
              approve: "อนุมัติแล้ว",
              special: "พิเศษ",
              reject: "ปฏิเสธแล้ว",
              approveFull: "อนุมัติปกติ",
              specialFull: "อนุมัติพิเศษ (ไม่หักวันลา)",
              rejectFull: "ปฏิเสธ",
            },
            confirm: {
              title: "ยืนยัน {{action}}",
              text: "ต้องการดำเนินการคำขอของ <b>{{name}}</b> เป็น <b>{{action}}</b> ใช่หรือไม่?",
            },
            toast: {
              processedOne: "ดำเนินการ 1 คำขอสำเร็จ",
              actionFailedTitle: "ดำเนินการล้มเหลว",
              unknownError: "เกิดข้อผิดพลาดไม่ทราบสาเหตุ",
            },
            hrNameHint:
              "* แท็บที่อนุมัติ/ปฏิเสธแล้วจะแสดงชื่อ HR หากข้อมูลจากระบบรองรับ",
            specialReasonPrefix: "การอนุมัติกรณีพิเศษ",
            noReason: "ไม่มีเหตุผล",
            reasonTitle: "เหตุผล: {{reason}}",
            noteTitle: "หมายเหตุ: {{note}}",
          },
        },

        notificationBell: {
          title: "การแจ้งเตือน",
          readAll: "อ่านทั้งหมด",
          empty: "ไม่มีการแจ้งเตือนใหม่",
          view: "ดู",
          tooltip: {
            openEmployee: "ดูรายละเอียดพนักงาน",
            markRead: "ทำเครื่องหมายว่าอ่านแล้ว",
          },
          aria: { toggle: "เปิด/ปิด การแจ้งเตือน" },
        },

        employeeExport: {
          title: "ส่งออก CSV (พนักงาน)",
          exportType: {
            label: "ประเภทการส่งออก",
            attendance: "การเข้างาน",
            leaveRequests: "คำขอการลา",
          },
          period: {
            label: "ช่วงเวลา",
            daily: "รายวัน",
            monthly: "รายเดือน",
            yearly: "รายปี",
            quarter: "รายไตรมาส",
            customRange: "กำหนดเอง",
            selectDate: "เลือกวันที่",
            selectMonth: "เลือกเดือน",
            selectYear: "เลือกปี",
          },
          quarter: {
            year: "ปี",
            quarter: "ไตรมาส",
            q1: "Q1 (ม.ค.–มี.ค.)",
            q2: "Q2 (เม.ย.–มิ.ย.)",
            q3: "Q3 (ก.ค.–ก.ย.)",
            q4: "Q4 (ต.ค.–ธ.ค.)",
          },
          custom: {
            dateFrom: "จากวันที่",
            dateTo: "ถึงวันที่",
            pickDate: "เลือกวันที่",
          },
          range: { label: "ช่วง:" },
          buttons: { export: "ส่งออก" },
          common: { all: "ทั้งหมด" },
          picker: {
            selectDate: "เลือกวันที่",
            selectMonth: "เลือกเดือน",
            selectYear: "เลือกปี",
            dateFrom: "จากวันที่",
            dateTo: "ถึงวันที่",
          },
          errors: {
            noEmployee: "ไม่พบพนักงาน",
            customIncomplete:
              "กรุณาเลือกทั้งวันที่เริ่มและสิ้นสุดสำหรับช่วงเวลาที่กำหนดเอง",
            endpoint404: "ส่งออกล้มเหลว: ไม่พบ Endpoint ในระบบ (404)",
            exportFailed: "การส่งออกล้มเหลว",
          },
        },

        employeesAllExport: {
          title: "ส่งออกข้อมูลพนักงาน (ทั้งหมด)",
          rowsToExport: "จำนวนแถวที่ส่งออก:",
          previewRows: "ตัวอย่างแถว:",
          buttons: { exportCsv: "ส่งออก CSV" },
          filters: {
            label: "ตัวกรอง",
            activeTab: "แท็บพนักงานปัจจุบัน",
            resignedTab: "แท็บพนักงานลาออก",
            role: "บทบาท",
            status: "สถานะ",
            keyword: "คำค้นหา",
            keywordPlaceholder: "ค้นหาจากชื่อ, อีเมล, บทบาท, รหัส...",
          },
          options: { all: "ทั้งหมด", worker: "พนักงานทั่วไป", hr: "HR" },
          status: { active: "เปิดใช้งาน", inactive: "ไม่ได้ใช้งาน" },
          columns: {
            label: "คอลัมน์",
            employeeId: "รหัสพนักงาน",
            firstName: "ชื่อ",
            lastName: "นามสกุล",
            email: "อีเมล",
            role: "บทบาท",
            status: "สถานะ",
            joiningDate: "วันที่เริ่มงาน",
            tip: "คำแนะนำ: ปิดคอลัมน์ที่ไม่ต้องการเพื่อลดขนาดไฟล์",
          },
        },

        xlsxWorkbook: {
          title: "ส่งออกไฟล์ Workbook (XLSX)",
          employeesCount: "จำนวนพนักงาน:",
          workbookType: {
            label: "รูปแบบไฟล์",
            perEmployee: "รายพนักงาน (แยกหลายชีท)",
            employeesList: "รายชื่อพนักงาน (ชีทเดียว)",
          },
          dataType: {
            label: "ประเภทข้อมูล",
            attendance: "การเข้างาน",
            leave: "คำขอการลา",
          },
          period: {
            label: "ช่วงเวลา",
            daily: "รายวัน",
            monthly: "รายเดือน",
            yearly: "รายปี",
            quarter: "รายไตรมาส",
            custom: "กำหนดเอง",
          },
          fields: {
            selectDate: "เลือกวันที่",
            selectMonth: "เลือกเดือน",
            selectYear: "เลือกปี",
            year: "ปี",
            quarter: "ไตรมาส",
            dateFrom: "เริ่มจากวันที่",
          },
        },
      },
    },
  },
});

export default i18n;
