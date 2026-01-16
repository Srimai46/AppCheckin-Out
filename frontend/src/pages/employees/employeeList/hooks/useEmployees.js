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

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const createEmployee = useCallback(
    async (formData) => {
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
            - ${t("employeeCreate.role")}: ${formData.role || "-"}<br/>
            - ${t("employeeCreate.joinDate")}: ${formData.joiningDate || "-"}<br/>
          </div>
        </div>
        `,
        t("employeeCreate.confirmButton")
      );
      if (!confirmed) return false;

      try {
        setIsCreating(true);

        await api.post("/employees", {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          role: formData.role,
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
    [t]
  );

  return {
    employees,
    loading,
    fetchEmployees,
    createEmployee,
    isCreating,
  };
}
