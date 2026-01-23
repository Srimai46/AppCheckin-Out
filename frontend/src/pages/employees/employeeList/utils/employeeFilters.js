// frontend/src/pages/employees/employeeList/utils/employeeFilters.js

const norm = (v) => String(v ?? "").trim().toLowerCase();

const pickDeptName = (e) => {
  const raw = e?.department?.name ?? e?.departmentName ?? e?.department ?? "";
  const d = String(raw ?? "").trim();
  return d || "Unassigned";
};

const pickRoleName = (e) => {
  const raw = e?.role?.name ?? e?.roleName ?? e?.role ?? "";
  return String(raw ?? "").trim();
};

// counts ใช้กับหน้า list ได้
export const buildCounts = (employees = []) => {
  let active = 0;
  let inactive = 0;

  (employees || []).forEach((e) => {
    // ปรับตาม schema จริงของคุณได้: isActive / status / resignationDate
    const isActive = e?.isActive !== false; // default true
    if (isActive) active += 1;
    else inactive += 1;
  });

  return { active, inactive };
};

// filter แบบ AND 
export const filterEmployees = (employees = [], filters = {}) => {
  const {
    activeTab = "active",
    departmentFilter = "all",
    roleFilter = "all",
    statusFilter = "all",
    search = "",
  } = filters;

  const q = norm(search);

  return (employees || []).filter((e) => {
    const isActive = e?.isActive !== false;

    // tab
    if (activeTab === "active" && !isActive) return false;
    if (activeTab === "inactive" && isActive) return false;

    // statusFilter
    if (statusFilter === "active" && !isActive) return false;
    if (statusFilter === "inactive" && isActive) return false;

    // department
    if (departmentFilter !== "all") {
      const dept = pickDeptName(e);
      if (norm(dept) !== norm(departmentFilter)) return false;
    }

    // role
    if (roleFilter !== "all") {
      const role = pickRoleName(e);
      if (norm(role) !== norm(roleFilter)) return false;
    }

    // search
    if (q) {
      const hay = norm(
        [
          e?.firstName,
          e?.lastName,
          e?.email,
          pickDeptName(e),
          pickRoleName(e),
        ]
          .filter(Boolean)
          .join(" ")
      );
      if (!hay.includes(q)) return false;
    }

    return true;
  });
};

// ✅ paginate
export const paginate = (items = [], page = 1, pageSize = 10) => {
  const safePageSize = Math.max(1, Number(pageSize) || 10);
  const totalItems = (items || []).length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));

  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const start = (safePage - 1) * safePageSize;
  const end = start + safePageSize;

  return {
    totalPages,
    pageItems: (items || []).slice(start, end),
  };
};
