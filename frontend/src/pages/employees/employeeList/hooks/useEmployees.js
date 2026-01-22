// frontend/src/pages/employees/employeeList/hooks/useEmployees.js
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../../../../api/axios";
import { alertError, alertSuccess, alertConfirm } from "../../../../utils/sweetAlert";

export default function useEmployees() {
  const { t } = useTranslation();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isCreating, setIsCreating] = useState(false);

  // ✅ Keep options here so Confirm can show role/department names
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/employees");
      const list = Array.isArray(res?.data)
        ? res.data
        : res?.data?.employees || res?.data?.data || [];
      setEmployees(list);
    } catch (err) {
      alertError(
        t("employeeCreate.failed"),
        err?.response?.data?.message ||
          t("employeeCreate.fetchErrorFallback", {
            defaultValue: "An error occurred while retrieving the information.",
          })
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  // ✅ Load dropdown options (roles/departments) for confirm display + fallback map
  const fetchOptions = useCallback(async () => {
    try {
      const [roleRes, deptRes] = await Promise.all([
        api.get("/employees/roles"),
        api.get("/employees/departments"),
      ]);

      setRoles(Array.isArray(roleRes?.data) ? roleRes.data : []);
      setDepartments(Array.isArray(deptRes?.data) ? deptRes.data : []);
    } catch (e) {
      // ไม่ต้อง block flow แค่ทำให้ confirm อาจ fallback เป็น "-"
      setRoles([]);
      setDepartments([]);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchOptions();
  }, [fetchEmployees, fetchOptions]);

  const getRoleName = useCallback(
    (formData) => {
      // รองรับหลาย shape:
      // - roleName (ถ้าคำนวณมาจาก modal แล้ว)
      // - roleId (อิง DB)
      // - role (string เดิม)
      if (formData?.roleName) return formData.roleName;

      const rid = formData?.roleId;
      if (Number.isInteger(rid)) {
        return roles.find((r) => r.id === rid)?.name || "-";
      }

      const roleStr = String(formData?.role ?? "").trim();
      return roleStr || "-";
    },
    [roles]
  );

  const getDepartmentName = useCallback(
    (formData) => {
      if (formData?.departmentName) return formData.departmentName;

      const did = formData?.departmentId;
      if (Number.isInteger(did)) {
        return departments.find((d) => d.id === did)?.name || "-";
      }

      const deptStr = String(formData?.department ?? "").trim();
      return deptStr || "-";
    },
    [departments]
  );

  const createEmployee = useCallback(
    async (formData) => {
      // ✅ Use roleName/departmentName in Confirm
      const roleName = getRoleName(formData);
      const departmentName = getDepartmentName(formData);

      const confirmed = await alertConfirm(
        t("employeeCreate.confirmTitle"),
        `
        <div style="text-align:left; line-height:1.7">
          <div style="font-weight:900; color:#0f172a; margin-bottom:6px">
            ${t("employeeCreate.confirmReviewTitle")}
          </div>
          <div style="color:#64748b; font-weight:800">
            - ${t("employeeCreate.firstName")}: ${formData.firstName || "-"}<br/>
            - ${t("employeeCreate.lastName")}: ${formData.lastName || "-"}<br/>
            - ${t("employeeCreate.email")}: ${formData.email || "-"}<br/>
            - ${t("employeeCreate.role")}: ${roleName || "-"}<br/>
            - ${t("employeeCreate.department")}: ${departmentName || "-"}<br/>
            - ${t("employeeCreate.joinDate")}: ${formData.joiningDate || "-"}<br/>
          </div>
        </div>
        `,
        t("employeeCreate.confirmButton")
      );
      if (!confirmed) return false;

      try {
        setIsCreating(true);

        // ✅ Send ID to BE (best) — BE already supports number or string
        await api.post("/employees", {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          role: Number.isInteger(formData.roleId) ? formData.roleId : formData.role,
          department: Number.isInteger(formData.departmentId)
            ? formData.departmentId
            : formData.department,
          joiningDate: formData.joiningDate,
        });

        await alertSuccess(t("employeeCreate.success"), t("employeeCreate.successText"));
        return true;
      } catch (err) {
        alertError(
          t("employeeCreate.failed"),
          err?.response?.data?.error ||
            err?.response?.data?.message ||
            t("employeeCreate.unexpectedErrorFallback", {
              defaultValue: "An unexpected error occurred. Please try again.",
            })
        );
        return false;
      } finally {
        setIsCreating(false);
      }
    },
    [t, getRoleName, getDepartmentName]
  );

  return {
    employees,
    loading,
    fetchEmployees,
    createEmployee,
    isCreating,
    roles,
    departments,
  };
}
