export default {
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
};
