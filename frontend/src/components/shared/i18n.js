//frontend/src/components/shared/i18n.js
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

          loadingTypes: "Loading types...",

          startDate: "Start date",
          endDate: "End date",
          pickStartDate: "Select start date",
          pickEndDate: "Select end date",

          browse: "Browse",

          errors: {
            missingType: "Please select a leave type.",
            missingDates: "Please specify both start and end dates.",
            invalidDate: "End date must be after the start date.",

            loadTypesFailed: "Failed to load leave types.",

            endBeforeStart: "End date must be on/after {{min}}."
          },

          blockedTitle: "Leave Request Blocked",
          blockedMessage: "You can’t request leave on holidays or non-working days.",

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

          attachNote: "You may attach supporting documents (e.g., medical certificate).",

          placeholderReason: "Please provide details...",

          summaryTitle: "Leave Request Summary",
          summaryReview: "Please review the details before confirming.",
          summary: {
            type: "Type",
            period: "Period",
            duration: "Duration",
            attachment: "Attachment",
            reason: "Reason"
          },

          confirmTitle: "Confirm Leave Request",
          confirmText: "Do you want to submit this leave request?",
          confirmButton: "Submit Request",

          successTitle: "Request Submitted",
          successMessage: "Your leave request has been submitted.",

          cancel: "Cancel",
          submitting: "Submitting request...",
          submit: "Submit Leave Request"
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
          pickJoinDate: "Select joining date",

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

          loadingTypes: "กำลังโหลดประเภทการลา...",

          startDate: "วันที่เริ่ม",
          endDate: "วันที่สิ้นสุด",
          pickStartDate: "เลือกวันที่เริ่ม",
          pickEndDate: "เลือกวันที่สิ้นสุด",

          browse: "เลือกไฟล์",

          errors: {
            missingType: "กรุณาเลือกประเภทการลา",
            missingDates: "กรุณาระบุวันที่เริ่มและวันที่สิ้นสุด",
            invalidDate: "วันที่สิ้นสุดต้องมากกว่าวันที่เริ่ม",

            loadTypesFailed: "ไม่สามารถโหลดประเภทการลาได้",
            endBeforeStart: "วันที่สิ้นสุดต้องไม่ก่อน {{min}}"
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

          summaryTitle: "สรุปคำขอการลา",
          summaryReview: "กรุณาตรวจสอบรายละเอียดก่อนยืนยัน",
          summary: {
            type: "ประเภท",
            period: "ช่วงเวลา",
            duration: "ระยะเวลา",
            attachment: "ไฟล์แนบ",
            reason: "เหตุผล"
          },

          confirmTitle: "ยืนยันคำขอการลา",
          confirmText: "คุณต้องการส่งคำขอการลานี้ใช่หรือไม่?",
          confirmButton: "ส่งคำขอ",
          successTitle: "ส่งคำขอสำเร็จ",
          successMessage: "คำขอการลาของคุณถูกส่งเรียบร้อยแล้ว",

          cancel: "ยกเลิก",
          submitting: "กำลังส่งคำขอ...",
          submit: "ส่งคำขอการลา"
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
          pickJoinDate: "เลือกวันที่เริ่มงาน",

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

    /* ===================== EN ===================== */
    ja: {
      translation: {
        /* -------- Dashboard -------- */
        dashboard: {
          title: "ダッシュボード",
          attendance: "勤怠", // kintai 
          welcome: "ようこそ、{{firstName}} {{lastName}} さん",
          selectYear: "年を選択", // toshi wo sentaku
          year: "年",

          checkIn: "出勤", // Shukkin
          checkOut: "退勤", // taikin
          updatecheckOut: "退勤を更新", // Taikin wo koushin
          leave: "休暇",

          attendanceConfirmTitle: "打刻の確認",
          attendanceConfirmText: "{{action}} してもよろしいですか？",
          loadFail: "ダッシュボードデータの読み込みに失敗しました。",
        },

         /* -------- Layout / Sidebar -------- */
        layout: {
          mainMenu: "メインメニュー",
          hrManagement: "人事管理",
          approveLeave: "休暇申請承認",
          employees: "従業員一覧",
          calendar: "カレンダー",
          yearEnd: "設定",
          logout: "ログアウト",
        },
        /* -------- Common -------- */
        common: {
          loading: "読み込み中...",
          success: "成功",
          error: "エラー",

          yes: "はい",
          no: "いいえ",
          save: "保存",
          delete: "削除",
          confirm: "確認",
          cancel: "キャンセル",
          days: "日",
          unlimited: "無制限",
          today: "今日",
          page: "ページ",
          showing: "表示中",
          of: "／",

          prev: "前へ",
          next: "次へ",
          back: "戻る",

          close: "閉じる",

          // Alerts / Validation
          missingInfo: "必須項目が不足しています",
          invalidValue: "無効な値です",
          saveFailed: "保存に失敗しました",
          deleteFailed: "削除に失敗しました",
          systemError: "システムエラーが発生しました",
        },

        /* -------- QuotaCard -------- */
        quota: {
          noData: "この期間の休暇クォーターデータが見つかりません",
          carryOver: "繰越分",
          used: "消化済み",
          specialUsage: "特別休暇の使用",
          days: "日",
          usedTotal: "使用 {{used}} / 合計 {{total}}",
          carriedDetail: "（基本 {{base}} + 繰り越し {{carry}}）",
        },

        /* -------- History -------- */
        history: {
          attendanceLog: "勤怠履歴",
          leaveHistory: "休暇履歴",
          tabAttendance: "勤怠",
          tabLeave: "休暇",
          date: "日付",
          inOut: "出退勤",
          status: "状態",
          statusIn: "出勤状態",
          statusOut: "退勤状態",
          signedBy: "承認者",
          type: "種類",
          period: "期間",
          days: "日数",
          note: "備考",
          file: "ファイル",
          noData: "データなし",
          filter: "フィルター",
          clear: "クリア",
          selectDate: "日付を選択",

          // Status Badges
          late: "遅刻",
          onTime: "時間通り",
          absent: "欠勤",
          leave: "休暇",
          early: "早退",
          normal: "通常",
          noCheckout: "退勤登録",
          notCheckedOutYet: "勤務中",

          // Alerts
          deleteTitle: "休暇申請を削除しますか？",
          deleteText: "この申請を削除してもよろしいですか？<br/><b>{{type}}</b>",
          deleteButton: "削除",
          requestCancelButton: "キャンセル申請",
        },
        /* -------- Leave Approval -------- */
        leaveApproval: {
          title: "承認待ち",
          selected: "{{count}} 件選択",
          bulkApprove: "一括承認",
          bulkSpecial: "一括特別承認",
          bulkReject: "一括却下",

          table: {
            employee: "従業員",
            type: "種類",
            reason: "申請理由",
            duration: "期間",
            evidence: "添付書類",
            action: "操作",
          },

          loading: "データ同期中...",
          noData: "保留中のタスクはありません",
          ref: "参照: #{{id}}",
          days: "日",
          noFile: "ファイルなし",

          actions: {
            approve: "承認",
            special: "特別",
            reject: "却下",
          },

          tooltips: {
            viewAttachment: "添付を表示",
            approve: "承認",
            special: "特別承認",
            reject: "却下",
          },

          labels: {
            reason: "理由",
            cancelReason: "キャンセル理由",
            note: "メモ",
          },

          cancellationRequests: "キャンセル申請",
          newrequest: "新規申請",

          selectionEmptyTitle: "未選択",
          selectionEmptyText: "少なくとも 1 件選択してください。",

          confirmTitle: "{{action}} の確認",
          confirmText: "{{count}} 件の申請を {{action}} してもよろしいですか？",

          processed: "{{count}} 件の申請を処理しました。",
          actionFailed: "操作に失敗しました",

          actionText: {
            approve: "承認",
            special: "特別承認",
            reject: "却下",
          },

          tabs: {
            new: "新規申請",
            cancel: "キャンセル申請",
          },
        },

        /* -------- Special Holidays -------- */
        specialHoliday: {
          title: "特別休日",
          subtitle: "休日を追加／編集してすぐに適用",

          form: {
            holidayName: "休日名",
            startDate: "開始日",
            endDate: "終了日",
            duration: "日数",
            day: "日",
            days: "日",
            add: "追加",
            update: "更新",
            cancelEdit: "編集をキャンセル",
            close: "閉じる",
          },

          table: {
            title: "特別休日一覧",
            subtitle: "YYYY/MM/DD（合計日数）、名前、編集、削除",
            date: "日付",
            name: "休日名",
            actions: "操作",
            empty: "特別休日はまだありません。",
          },

          pagination: {
            page: "ページ",
            showing: "表示中",
            of: "／",
            prev: "前へ",
            next: "次へ",
          },

          action: {
            addHoliday: "休日を追加",
            edit: "編集",
            delete: "削除",
          },
        },
        /* -------- Leave Type -------- */
        leaveType: {
          table: {
            title: "休暇タイプ",
            subtitle: "休暇タイプ、有給設定、上限を管理",
            name: "休暇タイプ",
            paid: "有給",
            maxCarryOver: "繰り越し上限",
            maxConsecutive: "連続上限",
            actions: "操作",
          },
          action: {
            add: "休暇タイプを追加",
            edit: "編集",
            delete: "削除",
          },
          form: {
            typeName: "タイプ名",
            paid: "有給",
            labelTh: "ラベル（TH）",
            labelEn: "ラベル（EN）",
            maxCarryOver: "繰り越し上限（日）",
            maxConsecutive: "連続上限（日）",
            cancelEdit: "キャンセル",
            editTitle: "休暇タイプを編集",
            addTitle: "休暇タイプを追加",
            subtitle: "休暇タイプを追加／編集してすぐに適用",
            add: "追加",
            update: "更新",
            close: "閉じる",

            // validation text
            requiredLabel: "タイ語と英語のラベルは両方必要です。",
            invalidNumber: "値は 0 以上である必要があります。",
          },

          // confirm popups
          confirm: {
            addTitle: "休暇タイプ追加の確認",
            addMessage: "この休暇タイプを作成してもよろしいですか？",
            updateTitle: "休暇タイプ更新の確認",
            updateMessage: "この休暇タイプを更新してもよろしいですか？",
            deleteTitle: "休暇タイプ削除の確認",
            deleteMessage: "「{{name}}」を削除してもよろしいですか？",
          },

          // success messages
          success: {
            created: "休暇タイプを作成しました。",
            updated: "休暇タイプを更新しました。",
            deleted: "休暇タイプを削除しました。",
          },
        },

        /* -------- SweetAlert -------- */
        sweetAlert: {
          reject: {
            title: "休暇申請を却下",
            label: "却下理由",
            placeholder: "却下理由を入力してください...",
            confirm: "却下",
            required: "却下理由は必須です",
          },
        },

        /* -------- Date Grid Picker -------- */
        dateGridPicker: {
          title: "日付を選択",
          all: "すべて",
          allOn: "全選択",
          allOff: "全解除",
          year: "年",
          month: "月",
          day: "日",
          reset: "リセット",
          cancel: "キャンセル",
          done: "決定",
        },

       /* -------- Leave Request -------- */
        leaveRequest: {
          type: "休暇タイプ",
          none: "なし",

          fullDay: "終日",
          halfMorning: "半日（午前）",
          halfAfternoon: "半日（午後）",

          errors: {
            missingType: "休暇タイプを選択してください。",
            missingDates: "開始日と終了日を両方指定してください。",
            invalidDate: "終了日は開始日より後である必要があります。",
          },

          blockedTitle: "申請エラー",
          blockedMessage: "休日または非稼働日に休暇申請はできません。",

          submissionFailed: "送信に失敗しました",

          headerTitle: "休暇申請",
          headerSubtitle: "従業員休暇管理システム",

          step1: "1. 休暇タイプを選択",
          step2: "2. 日付と時間帯を選択",
          step3: "3. 申請理由",
          step4: "4. 添付（任意）",

          start: "開始日",
          end: "終了日",

          chooseFile: "ファイルを選択",
          removeFile: "ファイルを削除",
          noFileSelected: "ファイルが選択されていません",

          attachNote: "証明書類（例：診断書）を添付できます。",

          placeholderReason: "詳細を入力してください...",

          summaryTitle: "休暇申請の概要",
          summaryReview: "送信前に内容を確認してください。",
          summary: {
            type: "種類",
            period: "期間",
            duration: "時間帯",
            attachment: "添付書類",
            reason: "理由",
          },

          confirmTitle: "休暇申請の確認",
          confirmText: "この休暇申請を送信しますか？",
          confirmButton: "申請を送信",

          successTitle: "申請を送信しました",
          successMessage: "休暇申請を送信しました。",

          cancel: "キャンセル",
          submitting: "申請を送信中...",
          submit: "休暇申請を送信",
        },

        /* -------- Attendance Dashboard -------- */
        attendanceDashboard: {
          title: "勤怠",
          viewing: "表示中: ",
          noData: "勤怠データがありません。",
          selectMonthHint: "カレンダー表示には月を選択してください。",
          allYear: "{{year}}年（すべて）",

          workingDays: "稼働日数",
          presentExpected: "出勤／予定",
          late: "遅刻回数",
          early: "早退回数",
          leave: "承認済み休暇",
          absent: "欠勤",
          daysTaken: "取得日数",
          unexcused: "無断欠勤日数",
          minutes: "分",

          present: "出勤",
          attendanceRatio: "出勤率",
          leaveTypes: "休暇タイプ",

          subtitle: "勤怠概要",
          filterAll: "{{year}}年（すべて）",
          clear: "クリア",
          selectPeriod: "期間を選択",
          loading: "統計を読み込み中...",
          noDataFound: "勤怠データが見つかりません。",
          yearlyView: "年間表示",
          calendar: "{{month}} のカレンダー",

          stat: {
            workingDays: "稼働日数",
            presentExpected: "出勤／予定",
            late: "遅刻",
            earlyLeave: "早退",
            leaves: "休暇",
            absences: "欠勤",
            approved: "承認済み",
            unexcused: "無断",
            minutes: "分",
          },

          ratio: "出勤率",

          legend: {
            holiday: "休日",
            absent: "欠勤",
            late: "遅刻",
            leave: "休暇",
            early: "早退",
          },

          calendarHint: "カレンダー表示には月を選択してください。",

          events: {
            absent: "欠勤",
            late: "遅刻",
            early: "早退",
          },

          weekdays: {
            sun: "日",
            mon: "月",
            tue: "火",
            wed: "水",
            thu: "木",
            fri: "金",
            sat: "土",
          },
        },


       /* -------- Year End Configuration -------- */
        yearEndConfig: {
          title: "年次処理",
          subtitle: "繰り越し、付与日数、全体ルールを設定します。",

          carryOverTitle: "休暇タイプの繰り越し",
          carryOverHint: "翌年への最大繰り越し日数（従業員ごと）",

          quotaTitle: "{{year}}年のクォータ設定",
          quotaHint: "従業員あたりの基本休暇クォータ",

          maxConsecutiveTitle: "全体ルール：連続取得の上限",
          unlimitedHint: "0 = 無制限",

          targetYear: "対象年",

          process: "処理実行",
          processing: "処理中...",

          warning: "この操作は全従業員のデータを上書きし、過去データをロックします。",
        },

        /* -------- Employee Detail -------- */
       employeeDetail: {
          loading: "プロフィールを読み込み中...",
          working: "在職",
          resigned: "退職",
          joined: "入社日",
          manageInfo: "情報管理",
          leaveBalance: "休暇残高",    
          employeeInfo: "従業員情報",
          fullAccess: "フルアクセス",    
          standardAccess: "標準アクセス", 
          roleNote: "注意：役割の変更はシステム権限に影響します。",
          newPassword: "新しいパスワード",
          passwordOptional: "（空欄の場合は変更しません）",
          passwordMin: "6 文字以上",
          confirmPassword: "パスワード（確認用）", 
          confirmPasswordPlaceholder: "同じ新しいパスワードを入力",
          
          terminate: "退職処理",        
          reinstate: "復職処理",        
          
          adjustQuota: "クォータ調整",
          fetchFailed: "従業員データを取得できませんでした。",
          quotaUpdated: "クォータを更新しました。",
          quotaFailed: "クォータの更新に失敗しました。",
          passwordMismatch: "パスワードが一致しません。",
          infoUpdated: "情報を更新しました。",
        },

        /* -------- Employee list -------- */
        employeeList: {
          title: "従業員一覧",
          addNew: "従業員を追加",
          leavePolicy: "休暇ポリシー",

          activeTab: "在職",
          resignedTab: "退職",

          allRoles: "全ての役割",
          roleWorker: "従業員",
          roleHR: "HR",

          searchPlaceholder: "名前、メール、ID で検索",

          colId: "ID",
          colName: "氏名",
          colEmail: "メール",
          colRole: "役割",
          colStatus: "状態",

          statusWorking: "在職",
          statusResigned: "退職",

          noEmployees: "従業員が見つかりません",

          page: "ページ",
          prev: "前へ",
          next: "次へ",

          colExport: "エクスポート",
          exportEmployee: "従業員をエクスポート",

          aria: {
            closeRoleDropdown: "役割ドロップダウンを閉じる",
          },

          pagination: {
            label: "ページ {{page}} / {{totalPages}}",
          },

          exportAll: {
            button: "一括エクスポート",
            buttonTitle: "一括エクスポート",
            title: "一括エクスポート",

            workbook: {
              title: "（1）ワークブックをエクスポート（.xlsx）— 複数シート",
              desc: "複数従業員を選択（xlsx、従業員ごとに 1 シート）",
            },
            employeesList: {
              title: "（2）従業員リストをエクスポート",
              desc: "従業員リストをエクスポート（csv）",
            },
            note: "※ 複数シートは xlsx が必要です（CSV は複数シート不可）。",
          },
        },

        employeeCreate: {
          title: "従業員情報",

          firstName: "名",
          lastName: "姓",
          email: "メール",
          emailPlaceholder: "メールを入力してください",

          role: "役割",
          workerAccess: "標準アクセス",
          hrAccess: "フルアクセス",
          roleNote: "注意：役割の変更は権限に影響します。",

          joinDate: "入社日",
          pickJoinDate: "入社日を選択",

          password: "パスワード",
          passwordHint: "6 文字以上",

          confirmTitle: "登録の確認",
          confirmButton: "登録",
          cancel: "キャンセル",
          submit: "登録",
          processing: "処理中...",

          roleWorker: "従業員",
          roleHR: "HR",
          selected: "選択中",

          confirmReviewTitle: "以下の内容を確認してください",
          successText: "新しい従業員を追加しました。",

          success: "成功",
          failed: "失敗",
        },

        /* -------- working days -------- */
        workingDays: {
          title: "稼働日",
          subtitle: "稼働日を選択してポリシーを保存",

          loading: "稼働日ポリシーを読み込み中...",

          currently: "現在：",

          saveBtn: "保存",
          savingBtn: "保存中...",
          loadingBtn: "読み込み中...",

          mon: "月",
          tue: "火",
          wed: "水",
          thu: "木",
          fri: "金",
          sat: "土",
          sun: "日",
        },

        /* -------- worktimeby role -------- */
        workTimeByRole: {
          title: "勤務時間（役割別）",
          subtitle: "役割ごとの出勤／退勤時間を設定",

          roleHR: "HR",
          roleWorker: "従業員",

          checkIn: "出勤時刻",
          checkOut: "退勤時刻",

          current: "現在：",

          saveBtn: "勤務時間を保存",
          savingBtn: "保存中...",
        },

        /* -------- YearEnd History -------- */
        yearEndHistory: {
          title: "処理履歴",

          year: "年",
          lockStatus: "ロック状態",
          processedAt: "処理日時",
          action: "操作",

          closed: "クローズ",
          open: "オープン",

          unlock: "この年を解除",

          empty: "処理履歴がありません。",
        },

        /* -------- YearEnd Policy -------- */
        yearEndPolicy: {
          title: "休日ポリシー & 特別休日",
          subtitle: "稼働日を設定し、特別休日を管理します。",
        },

        /* -------- YearEnd Process -------- */
        yearEndProcess: {
          title: "年末処理 & クォータ付与",
          subtitle: "休暇残高の繰り越しと年間クォータ付与を一括で実行します。",
        },

        /* -------- Team Calendar -------- */
        teamCalendar: {
          title: "チームカレンダー",
          subtitle: "チームの休暇と特別休日を表示",

          actions: {
            todayOverview: "今日の概要（{{count}}）",
            today: "今日",
            prevMonth: "前の月",
            nextMonth: "次の月",
            openDay: "詳細を見る",
            close: "閉じる",
            refresh: "更新",
            clear: "クリア",
          },

          filters: {
            leaveTypesLabel: "休暇タイプ",
            allTypes: "すべて",

            leaveTypes: {
              sick: "病気休暇",
              vacation: "年次休暇",
              personal: "私用休暇",
            },

            roleLabel: "役割",
            allRoles: "すべて",
            searchPlaceholder: "名前／メールで検索...",
          },

          tabs: {
            pending: "保留",
            approved: "承認済み",
            rejected: "却下",
          },

          week: {
            sun: "日",
            mon: "月",
            tue: "火",
            wed: "水",
            thu: "木",
            fri: "金",
            sat: "土",
          },

          hints: {
            lateRule:
              "* 遅刻ルール：{{time}} 以降に出勤していない場合「遅刻」としてカウントされます。",
          },

          loading: {
            calendar: "カレンダーを読み込み中...",
            modal: "詳細を読み込み中...",
            attendance: "勤怠を読み込み中...",
          },

          grid: {
            loading: "読み込み中...",
            moreTypes: "+{{count}} 件",
          },

          status: {
            pending: "保留",
            approved: "承認済み",
            rejected: "却下",
            cancelled: "キャンセル",
            withdrawn: "取り下げ",
          },

          attendance: {
            title: "チーム出勤／退勤（今日）",
            subtitle:
              "合計 {{total}} • 出勤 {{checkedIn}} • 遅刻 {{late}} • 退勤 {{checkedOut}}",

            cards: {
              checkedIn: "出勤",
              late: "遅刻",
              checkedOut: "退勤",
            },

            searchPlaceholder: "名前、メール、ID で検索...",

            table: {
              employee: "従業員",
              role: "役割",
              in: "出勤",
              out: "退勤",
              statusIn: "出勤状態",
              statusOut: "退勤状態",
              actions: "操作",
            },

            loading: "勤怠を読み込み中...",
            empty: {
              activeNone: "在職者の勤怠データがありません",
              noMatch: "一致する従業員がいません",
            },

            unknown: "不明",

            buttons: {
              saving: "保存中...",
              checkIn: "出勤",
              checkOut: "退勤",
            },

            statusIn: {
              onTime: "時間通り",
              late: "遅刻",
              leave: "休暇",
              waiting: "待機",
              normal: "正常",
            },

            statusOut: {
              none: "-",
              normal: "正常",
              earlyLeave: "早退",
              noCheckout: "退勤なし",
              leave: "休暇",
            },

            pagination: {
              label:
                "ページ {{page}} / {{totalPages}} • {{start}}-{{end}} 件（全 {{total}} 件）",
            },
          },

          modal: {
            title: "日次詳細",

            pills: {
              checkedIn: "出勤",
              late: "遅刻",
              absent: "欠勤",
              onLeave: "休暇中",
            },

            nav: {
              prevDay: "前日",
              nextDay: "翌日",
              goToday: "今日へ",
            },

            tabs: {
              pending: "承認待ち",
              approved: "承認済み",
              rejected: "却下",
            },

            role: {
              all: "すべて",
              worker: "従業員",
              hr: "HR",
            },

            searchPlaceholder: "名前、メール、ID で検索...",

            table: {
              employee: "従業員",
              type: "種類",
              noteReason: "メモ／理由",
              duration: "期間",
              evidence: "証拠",
              action: "操作",
              approvedBy: "承認者",
              rejectedBy: "却下者",
            },

            loading: "データ同期中...",
            noData: "データなし",
            noFile: "ファイルなし",
            ref: "参照: #{{id}}",

            tooltips: {
              viewAttachment: "添付を表示",
              approve: "承認",
              special: "特別承認",
              reject: "却下",
            },

            actions: {
              approve: "承認",
              special: "特別",
              reject: "却下",

              approveFull: "通常承認",
              specialFull: "特別承認（控除なし）",
              rejectFull: "却下",
            },

            confirm: {
              title: "{{action}} の確認",
              text: "<b>{{name}}</b> の申請を <b>{{action}}</b> として処理しますか？",
            },

            toast: {
              processedOne: "1 件処理しました。",
              actionFailedTitle: "処理に失敗しました",
              unknownError: "不明なエラー",
            },

            hrNameHint:
              "* 承認／却下タブには、backend が approvedBy / rejectedBy を返す場合 HR 名が表示されます。",

            specialReasonPrefix: "特別承認",
            noReason: "理由なし",

            reasonTitle: "理由: {{reason}}",
            noteTitle: "メモ: {{note}}",
          },
        },

        /* -------- Notification Bell -------- */
        notificationBell: {
          title: "通知",
          readAll: "すべて既読にする",
          empty: "新しい通知はありません",
          view: "表示",
          tooltip: {
            openEmployee: "従業員詳細を開く",
            markRead: "既読にする",
          },
          aria: {
            toggle: "通知の切り替え",
          },
        },

        // -------- Employee Export --------
        employeeExport: {
          title: "CSV エクスポート（従業員）",
          exportType: {
            label: "エクスポート種別",
            attendance: "勤怠",
            leaveRequests: "休暇申請",
          },
          period: {
            label: "期間",
            daily: "日次",
            monthly: "月次",
            yearly: "年次",
            quarter: "四半期",
            customRange: "カスタム範囲",
            selectDate: "日付を選択",
            selectMonth: "月を選択",
            selectYear: "年を選択",
          },
          quarter: {
            year: "年",
            quarter: "四半期",
            q1: "Q1（1月〜3月）",
            q2: "Q2（4月〜6月）",
            q3: "Q3（7月〜9月）",
            q4: "Q4（10月〜12月）",
          },
          custom: {
            dateFrom: "開始日",
            dateTo: "終了日",
            pickDate: "日付を選択",
          },
          range: {
            label: "範囲:",
          },
          buttons: {
            export: "エクスポート",
          },
          common: {
            all: "すべて",
          },
          picker: {
            selectDate: "日付を選択",
            selectMonth: "月を選択",
            selectYear: "年を選択",
            dateFrom: "開始日",
            dateTo: "終了日",
          },
          errors: {
            noEmployee: "従業員が見つかりません。",
            customIncomplete: "カスタム範囲では開始日と終了日を両方選択してください。",
            endpoint404:
              "エクスポート失敗：Backend のエンドポイントが見つかりません（404）。Backend の API ルートを確認し、このファイルの paths を更新してください。",
            exportFailed: "エクスポートに失敗しました",
          },
        },

        // -------- Employees All Export --------
        employeesAllExport: {
          title: "従業員をエクスポート（全員）",
          rowsToExport: "エクスポート行数:",
          previewRows: "プレビュー行数:",
          buttons: {
            exportCsv: "CSV エクスポート",
          },
          filters: {
            label: "フィルター",
            activeTab: "在職タブ",
            resignedTab: "退職タブ",
            role: "役割",
            status: "状態",
            keyword: "キーワード",
            keywordPlaceholder: "名前、メール、役割、ID で検索...",
          },
          options: {
            all: "すべて",
            worker: "従業員",
            hr: "HR",
          },
          status: {
            active: "在職",
            inactive: "退職",
          },
          columns: {
            label: "列",
            employeeId: "従業員ID",
            firstName: "名",
            lastName: "姓",
            email: "メール",
            role: "役割",
            status: "状態（在職／退職）",
            joiningDate: "入社日",
            tip: "ヒント：不要な列をオフにすると、エクスポートファイルのサイズを減らせます。",
          },
        },

        // -------- XLSX Workbook Export --------
        xlsxWorkbook: {
          title: "ワークブックをエクスポート（XLSX）",
          employeesCount: "従業員数:",
          workbookType: {
            label: "ワークブック種別",
            perEmployee: "従業員ごと（複数シート）",
            employeesList: "従業員リスト（1シート）",
          },
          dataType: {
            label: "データ種別",
            attendance: "勤怠",
            leave: "休暇申請",
          },
          period: {
            label: "期間",
            daily: "日次",
            monthly: "月次",
            yearly: "年次",
            quarter: "四半期",
            custom: "カスタム範囲",
          },
          fields: {
            selectDate: "日付を選択",
            selectMonth: "月を選択",
            selectYear: "年を選択",
            year: "年",
            quarter: "四半期",
            dateFrom: "開始日",
            dateTo: "終了日",
          },
          placeholders: {
            pickDate: "日付を選択",
            pickMonth: "月を選択",
            pickYear: "年を選択",
            pickStart: "開始日を選択",
            pickEnd: "終了日を選択",
          },
          rangeLabel: "範囲:",
          buttons: {
            exportXlsx: "XLSX エクスポート",
          },
          quarters: {
            q1: "Q1（1月〜3月）",
            q2: "Q2（4月〜6月）",
            q3: "Q3（7月〜9月）",
            q4: "Q4（10月〜12月）",
          },
          picker: {
            select: "選択",
            selectDate: "日付を選択",
            selectMonth: "月を選択",
            selectYear: "年を選択",
            dateFrom: "開始日",
            dateTo: "終了日",
          },
          errors: {
            noEmployees: "エクスポート対象の従業員がいません。",
            pickDaily: "日付（日次）を選択してください。",
            pickMonthly: "月（月次）を選択してください。",
            pickCustom: "開始日と終了日（カスタム）を両方選択してください。",
            exportFailed: "ワークブックのエクスポートに失敗しました。",
          },
        },

        /* -------- Audit Log Export -------- */
        auditLogExport: {
          title: "CSV エクスポートフィルター",
          period: {
            label: "期間",
            daily: "日次",
            monthly: "月次",
            yearly: "年次",
            quarter: "四半期",
            customRange: "カスタム範囲",
            selectDate: "日付を選択",
            selectMonth: "月を選択",
            selectYear: "年を選択",
          },
          quarter: {
            year: "年",
            quarter: "四半期",
            q1: "Q1（1月〜3月）",
            q2: "Q2（4月〜6月）",
            q3: "Q3（7月〜9月）",
            q4: "Q4（10月〜12月）",
          },
          custom: {
            dateFrom: "開始日",
            dateTo: "終了日",
          },
          range: {
            label: "範囲:",
            to: "→",
          },
          filters: {
            model: "モデル",
            performedBy: "実行者",
            keyword: "キーワード（詳細）",
            recordId: "レコードID（任意）",
            actions: "操作（複数選択）",
          },
          actions: {
            clearActions: "操作をクリア",
            noActions: "操作がまだ読み込まれていません",
          },
          preview: {
            rowsToExport: "エクスポート行数:",
          },
          buttons: {
            export: "エクスポート",
          },
          common: {
            all: "すべて",
            reset: "リセット",
          },
          placeholders: {
            date: "YYYY-MM-DD",
            month: "YYYY-MM",
            year: "YYYY",
            keyword: '例: "遅刻", "承認", "withdraw"...',
            recordId: "例: 6 または 10",
          },
          picker: {
            selectDate: "日付を選択",
            selectMonth: "月を選択",
            selectYear: "年を選択",
            dateFrom: "開始日",
            dateTo: "終了日",
          },
        },
      },
    },
  },
});

export default i18n;
