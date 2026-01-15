export default {
  leaveApproval: {
    // Titles
    title: "Leave Approval",
    subtitle: "Review and manage employee leave requests",

    // Bulk actions
    selected: "{{count}} Selected",
    bulkApprove: "Bulk Approve",
    bulkSpecial: "Bulk Special",
    bulkReject: "Reject",

    // Table
    table: {
      employee: "Employee",
      type: "Type",
      reason: "Note / Reason",
      duration: "Duration",
      evidence: "Evidence",
      action: "Action",
    },

    // General fields
    employee: "Employee",
    type: "Leave Type",
    duration: "Duration",
    reason: "Reason",
    file: "Attachment",
    status: "Status",
    date: "Date",
    days: "Days",
    noFile: "No File",
    ref: "Ref: #{{id}}",

    // Loading / Empty
    loading: "SYNCHRONIZING DATA...",
    noData: "No Pending Tasks",

    // Actions
    approve: "Approve",
    reject: "Reject",
    cancel: "Cancel",

    actions: {
      approve: "Approved",
      special: "Special",
      reject: "Rejected",
    },

    // Tooltips
    tooltips: {
      viewAttachment: "View Attachment",
      approve: "Approve",
      special: "Special Approval",
      reject: "Reject",
    },

    // Labels
    labels: {
      reason: "Reason",
      cancelReason: "Cancel Reason",
      note: "Note",
    },

    // Tabs
    tabs: {
      new: "New Requests",
      cancel: "Cancellation Requests",
    },

    cancellationRequests: "Cancellation Requests",
    newrequest: "New Request",

    // Selection validation
    selectionEmptyTitle: "No Selection",
    selectionEmptyText: "Please select at least one request.",

    // Confirm dialogs
    confirmTitle: "Confirm {{action}}",
    confirmText:
      "Are you sure you want to {{action}} {{count}} request(s)?",

    confirmApproveTitle: "Approve Leave Request",
    confirmApproveText: "Are you sure you want to approve this request?",

    confirmRejectTitle: "Reject Leave Request",
    confirmRejectText: "Please provide a reason for rejection.",

    // Results
    processed: "{{count}} request(s) processed successfully.",
    actionFailed: "Action failed",
    successApproved: "Leave request approved.",
    successRejected: "Leave request rejected.",
    failed: "Operation failed.",

    // Action text for dynamic confirm
    actionText: {
      approve: "approve",
      special: "special approve",
      reject: "reject",
    },
  },
};
