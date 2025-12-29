import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { getAllLeaves } from "../../../api/leaveService";

const normalizeLeaveItem = (item) => {
  const d = new Date(item?.startDate);
  const dateKey = !Number.isNaN(d.getTime()) ? format(d, "yyyy-MM-dd") : String(item?.startDate || "");

  return {
    id: item?.id,
    employeeId: item?.employeeId ?? item?.employee?.id,
    employee: item?.employee,
    name:
      item?.name ||
      item?.employee?.fullName ||
      `${item?.employee?.firstName || ""} ${item?.employee?.lastName || ""}`.trim(),
    type: item?.type || item?.leaveType?.typeName || item?.leaveTypeName,
    status: item?.status,
    date: d,
    dateKey,
    startDate: item?.startDate,
    endDate: item?.endDate,
    reason: item?.reason,
    note: item?.note,
    totalDaysRequested: item?.totalDaysRequested ?? item?.totalDays ?? item?.days ?? null,
    attachmentUrl: item?.attachmentUrl ?? item?.evidenceUrl ?? item?.fileUrl ?? null,

    approvedBy:
      item?.approvedBy ||
      item?.approvedByUser ||
      (item?.approvedByName ? { fullName: item.approvedByName } : null),

    rejectedBy:
      item?.rejectedBy ||
      item?.rejectedByUser ||
      (item?.rejectedByName ? { fullName: item.rejectedByName } : null),
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
