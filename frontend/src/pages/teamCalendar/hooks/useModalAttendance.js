import { useCallback, useState } from "react";
import { isSameDay } from "date-fns";
import { getTodayTeamAttendance } from "../../../api/attendanceService";

/**
 * useModalAttendance
 * - ตอนนี้ fallback: ถ้าเลือก "วันนี้" -> ใช้ getTodayTeamAttendance
 * - ถ้าไม่ใช่วันนี้ -> คืน [] (รอคุณมี API by date ค่อยเสียบ)
 */
export default function useModalAttendance() {
  const [modalAttendance, setModalAttendance] = useState([]);
  const [modalAttLoading, setModalAttLoading] = useState(false);

  const fetchModalAttendance = useCallback(async (date) => {
    setModalAttLoading(true);
    try {
      // ✅ ถ้ามี API ตามวัน ให้เสียบตรงนี้แทน
      // const res = await getTeamAttendanceByDate(format(date, "yyyy-MM-dd"));
      // const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      // setModalAttendance(list);

      if (isSameDay(date, new Date())) {
        const res = await getTodayTeamAttendance();
        const list =
          (Array.isArray(res) && res) ||
          (Array.isArray(res?.data) && res.data) ||
          (Array.isArray(res?.data?.data) && res.data.data) ||
          (Array.isArray(res?.employees) && res.employees) ||
          (Array.isArray(res?.data?.employees) && res.data.employees) ||
          [];
        setModalAttendance(list);
      } else {
        setModalAttendance([]);
      }
    } catch (e) {
      console.error("useModalAttendance: fetch error", e);
      setModalAttendance([]);
    } finally {
      setModalAttLoading(false);
    }
  }, []);

  return { modalAttendance, modalAttLoading, fetchModalAttendance };
}
