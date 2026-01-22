import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { getAllLeaves } from "../../../api/leaveService";

const normalizeLeaveItem = (item) => {
  const d = new Date(item?.startDate);
  const dateKey = !Number.isNaN(d.getTime())
    ? format(d, "yyyy-MM-dd")
    : String(item?.startDate || "");

  const employeeId = item?.employeeId ?? item?.employee?.id ?? null;

  const name =
    item?.name ||
    item?.employee?.fullName ||
    `${item?.employee?.firstName || ""} ${item?.employee?.lastName || ""}`.trim() ||
    "-";

  const typeName =
    item?.typeName ||
    item?.leaveType?.typeName ||
    item?.leaveTypeName ||
    item?.type ||
    "-";

  return {
    id: item?.id ?? null,
    employeeId,
    employee: item?.employee,

    name,

    type: item?.type || typeName,
    typeName,

    status: item?.status ?? null,

    date: d,
    dateKey,

    startDate: item?.startDate ?? null,
    endDate: item?.endDate ?? null,

    reason: item?.reason ?? null,
    note: item?.note ?? null,

    totalDaysRequested:
      item?.totalDaysRequested ?? item?.totalDays ?? item?.days ?? null,

    attachmentUrl: item?.attachmentUrl ?? item?.evidenceUrl ?? item?.fileUrl ?? null,

    departmentName:
      item?.departmentName ||
      item?.employee?.department?.name ||
      item?.department?.name ||
      null,

    email: item?.email || item?.employee?.email || null,

    actedByHrId: item?.actedByHrId ?? item?.approvedByHrId ?? null,
    actedByHrName: item?.actedByHrName ?? null,
    
    approvedBy:
      item?.approvedBy ??
      (item?.status === "Approved" ? item?.actedByHrName : null) ??
      null,

    rejectedBy:
      item?.rejectedBy ??
      (item?.status === "Rejected" ? item?.actedByHrName : null) ??
      null,
  };
};

export default function useLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const refetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllLeaves();
      const list = Array.isArray(data) ? data : [];
      setLeaves(list.map(normalizeLeaveItem));
    } catch (e) {
      console.error("useLeaves: fetch error", e);
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetchLeaves();
  }, [refetchLeaves]);

  return { leaves, loading, refetchLeaves, setLeaves };
}
