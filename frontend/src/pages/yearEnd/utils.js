import { differenceInCalendarDays, parseISO } from "date-fns";

export const pad2 = (n) => String(n).padStart(2, "0");
export const toYMD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const safeYMD = (v) => String(v || "").trim().slice(0, 10);

export const ymdToDDMMYYYY = (ymd) => {
  const s = safeYMD(ymd);
  if (!s || s.length !== 10) return "-";
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return "-";
  return `${d}-${m}-${y}`;
};

export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export const escapeHtml = (v = "") =>
  String(v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export const calcTotalDays = (startYMD, endYMD) => {
  const s = safeYMD(startYMD);
  const e = safeYMD(endYMD);
  if (!s || !e) return 0;
  try {
    const sd = parseISO(s);
    const ed = parseISO(e);
    if (Number.isNaN(sd.getTime()) || Number.isNaN(ed.getTime())) return 0;
    const diff = differenceInCalendarDays(ed, sd);
    return diff >= 0 ? diff + 1 : 0;
  } catch {
    return 0;
  }
};

export const isValidTime = (t) => /^\d{2}:\d{2}$/.test(String(t || ""));
