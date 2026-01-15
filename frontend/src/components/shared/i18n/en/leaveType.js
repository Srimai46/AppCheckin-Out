export default {
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

      requiredLabel: "Both Thai and English labels are required.",
      invalidNumber: "Values must be zero or greater.",
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
};
