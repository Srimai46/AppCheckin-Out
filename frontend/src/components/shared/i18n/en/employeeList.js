export default {
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
};
