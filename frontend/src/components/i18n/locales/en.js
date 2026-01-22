export default {
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
      updatecheckOutsweetalert: "Update Check-out?",
      updatecheckOutsweetalertconfirm: "You already checked out. Do you want to update (re-check out)?",
      alertcheckinfirst: "Please check-in first.",
      alertcheckedinalready: "You have already checked in for today.",
      checkedsuccess:"Check-in successful",


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

      daysShort: "day(s)",

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
      waitingForHr: "Waiting for HR",

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
        pickStartDate: "Select start date",
        pickEndDate: "Select end date",
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

      confirm: {
        addTitle: "Confirm Add?",
        updateTitle: "Confirm Update?",
        deleteTitle: "Delete this holiday?",
      },
      toast: {
        added: "Holidays added.",
        updated: "Holiday updated.",
        deleted: "Holiday removed.",
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
        color: "Color",
      },

      action: {
        add: "Add Leave Type",
        edit: "Edit",
        delete: "Delete",
        color: "Color",
      },

      form: {
        typeName: "Type Name",
        paid: "Paid",
        labelTh: "Label (TH)",
        labelEn: "Label (EN)",
        labelJa: "Label (JP)",
        maxCarryOver: "Max Carry Over (Days)",
        maxConsecutive: "Max Consecutive Days",
        cancelEdit: "Cancel",
        editTitle: "Edit Leave Type",
        addTitle: "Add Leave Type",
        subtitle: "Add / Edit Leave Type and apply immediately",
        add: "Add",
        update: "update",
        close: "close",
        color: "Color",

        requiredLabel: "Please fill in all required fields.",
        invalidNumber: "Values must be zero or greater.",
      },

      color: {
        title: "Leave type color",
        subtitle: "Choose a color for this leave type",
        current: "Current color",
        pick: "Pick color",
        presets: "Presets",
        save: "Save",
        confirmTitle: "Confirm color change",
        confirmMessage: 'Change color for "{{name}}"?',
        saved: "Color updated successfully.",
      },

      confirm: {
        addTitle: "Confirm Add Leave Type",
        addMessage: "Are you sure you want to create this leave type?",
        updateTitle: "Confirm Update Leave Type",
        updateMessage: "Are you sure you want to update this leave type?",
        deleteTitle: "Confirm Delete Leave Type",
        deleteMessage: 'Are you sure you want to delete "{{name}}" ?',
      },

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
        requestcancelleave:"Request Cancel Leave",
        reasonforcancellation:"Reason for cancellation",
        placeholdercancellation:"Please enter cancellation reason...",
        leaveRequest: "Request",
        cancelreasonrequired: "Cancellation reason is required",

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
        endBeforeStart: "End date must be on/after {{min}}.",
      },

      blockedTitle: "Leave Request Blocked",
      blockedMessage:
        "You can’t request leave on holidays or non-working days.",

      submissionFailed: "Submission Failed",
      sumbitfailedtext:"Cannot request leave on holidays/non-working days",

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

      ratio: "อัตราการเข้างาน",

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
      carryOverHint:
        "Maximum carry over days to next year (per employee)",

      quotaTitle: "Configure Quotas for {{year}}",
      quotaHint: "Base leave quota per employee",

      maxConsecutiveTitle: "Global Policy: Max Consecutive Holidays",
      unlimitedHint: "0 = Unlimited",

      targetYear: "Target Year",
      yearLabel: "Year {{year}}",

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

      allDepartments: "All Depts",
      departmentUnassigned: "Unassigned",

      searchPlaceholder: "Search by name, email or ID",

      colId: "ID",
      colName: "Name",
      colEmail: "Email",
      colDepartment: "Department",
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

    /* -------- Employee Create -------- */
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

    /* -------- Working Days -------- */
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

      confirmTitle: "Save Working Days?",
      confirmSubtitle: "Confirm Working Days",
      savedText: "Working days updated.",
    },

    /* -------- Work Time by Role -------- */
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

      confirmTitle: "Save Work Time?",
      savedText: "Work time saved.",
    },

    /* -------- Max Consecutive -------- */
    maxConsecutive: {
      title: "Max Consecutive Holidays",
      subtitle: "Maximum consecutive holiday days allowed per request",

      confirmTitle: "Save Max Consecutive?",
      savedText: "Updated.",
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

      buttons: {
        add: "Add",
        update: "Update",
      },

      confirm: {
        saveWorkingDaysTitle: "Save working days?",
        saveWorkTimeTitle: "Save work time?",
        saveMaxConsecutiveTitle: "Save max consecutive holidays?",
        addHolidayTitle: "Confirm add?",
        updateHolidayTitle: "Confirm update?",
        deleteHolidayTitle: "Delete this holiday?",
      },

      success: {
        workingDaysSaved: "Working days updated.",
        workTimeSaved: "Work time saved.",
        maxConsecutiveSaved: "Updated.",
        holidayAdded: "Holidays added.",
        holidayUpdated: "Holiday updated.",
        holidayDeleted: "Holiday removed.",
      },

      errors: {
        loadWorkingDaysFailed: "Failed to load working days. {{msg}}",
        pickAtLeastOneDay: "Select at least 1 day.",
        invalidTime: "Invalid time: {{role}}",
        invalidRange: "Invalid time range: {{role}}",
        invalidLimit: "Invalid limit.",
        missingHolidayName: "Enter at least 1 language.",
        missingDate: "Missing date.",
        invalidRangeGeneric: "Invalid range.",
      },
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

      // Daily Details Modal
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
          text:
            "Process request of <b>{{name}}</b> as <b>{{action}}</b>?",
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

      exportCsv: {
        openButton: "Export CSV",
        title: "Export CSV",

        scope: {
          label: "Data scope",
          options: {
            month: "Monthly",
            year: "Yearly",
            all: "All",
          },
        },

        fields: {
          month: "Month",
          year: "Year",
        },

        loading: "Loading...",
        typesLoadFailed: "Failed to load leave types",

        leaveTypes: {
          label: "Leave Types",
          allTypes: "All types",
          selectedCount: "Selected {{count}} types",
          dropdownTitle: "Select types",
          selectAll: "Select all",
          clear: "Clear",
        },

        found: "Found",
        items: "items",

        download: "Download CSV",

        pickerTitle: {
          month: "Select month",
          year: "Select year",
        },
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

    /* -------- Employee Export -------- */
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

    /* -------- Employees All Export -------- */
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
        tip:
          "Tip: Turn off columns you don't need to reduce file size.",
      },
    },

    /* -------- XLSX Workbook Export -------- */
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
        pickCustom:
          "Please select both start and end date (Custom).",
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

    /* -------- Holiday Policy Errors -------- */
    holidayPolicy: {
      success: {
        savedTitle: "Saved",
        updatedTitle: "Updated",
        addedTitle: "Added",
        deletedTitle: "Deleted",
      },
      
      errors: {
        loadFailedTitle: "Load Failed",
        saveFailedTitle: "Save Failed",
        invalidTitle: "Invalid",
        selectAtLeastOneDay: "Select at least 1 day.",
        invalidTimeTitle: "Invalid Time",
        invalidRangeTitle: "Invalid Range",
        invalidLimitTitle: "Invalid Limit",
        missingNameTitle: "Missing Name",
        enterAtLeastOneLanguage: "Enter at least 1 language.",
        missingDateTitle: "Missing Date",
        invalidRangeOnlyTitle: "Invalid Range",
      },
    },

    /* -------- Confirm Html (SweetAlert confirm bodies) -------- */
    confirmHtml: {
      common: {
        to: "to",
        daySingular: "day",
        dayPlural: "day(s)",
      },

      workingDays: {
        subtitle: "Confirm Working Days",
      },

      workTime: {
        title: "Confirm Work Time (By Role)",
      },

      maxConsecutive: {
        title: "Confirm Max Consecutive Holidays",
        label: "Max consecutive days",
      },

      carryOver: {
        title: "Confirm Carry Over Limits",
        hint: "You are about to save these carry over limits (per employee).",
      },

      holiday: {
        fallbackName: "Holiday",
        fields: {
          holiday: "Holiday",
          date: "Date",
        },
        mode: {
          add: "Add",
          update: "Update",
        },
      },

      holidayUpsert: {
        title: "Confirm {{mode}}",
      },

      holidayDelete: {
        title: "Confirm Delete Holiday",
        hint: "This action cannot be undone.",
      },
    },
  },
};
