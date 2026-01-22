// frontend/src/pages/employees/employeeList/utils/employeeFilters.js
export function buildCounts(employees) {
  return employees.reduce(
    (acc, emp) => {
      const isActive = emp.isActive === true || emp.isActive === 1;
      isActive ? acc.active++ : acc.inactive++;
      return acc;
    },
    { active: 0, inactive: 0 }
  );
}

export function filterEmployees(
  employees,
  { activeTab, departmentFilter = "all", roleFilter, statusFilter, search }
) {
  const keyword = String(search || "").toLowerCase().trim();

  return employees.filter((emp) => {
    const isActive = emp.isActive === true || emp.isActive === 1;

    // tab active / inactive
    if (activeTab === "active" && !isActive) return false;
    if (activeTab === "inactive" && isActive) return false;

    // status filter
    if (statusFilter === "active" && !isActive) return false;
    if (statusFilter === "inactive" && isActive) return false;

    // department filter (ว่าง/ไม่มีค่าให้เป็น Unassigned)
    if (departmentFilter !== "all") {
      const dept = String(emp.department || "").trim() || "Unassigned";
      if (dept !== departmentFilter) return false;
    }

    // role filter
    if (roleFilter !== "all" && emp.role !== roleFilter) return false;

    // search
    if (!keyword) return true;

    return (
      emp.firstName?.toLowerCase().includes(keyword) ||
      emp.lastName?.toLowerCase().includes(keyword) ||
      emp.email?.toLowerCase().includes(keyword) ||
      String(emp.id).includes(keyword) ||
      String(emp.department || "")
        .toLowerCase()
        .includes(keyword)
    );
  });
}

export function paginate(items, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageItems = items.slice((safePage - 1) * pageSize, pageSize * safePage);
  return { totalPages, pageItems, page: safePage };
}
