export const SHIFT_START = "09:00"; // fallback เท่านั้น (กรณีไม่มี config)
export const SHIFT_END = "18:00";
export const PAGE_SIZE = 10;

export const WEEK_HEADERS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const LEAVE_TYPE_FILTERS = [
  { key: "sick", color: "bg-violet-400", label: "Sick" },
  { key: "personal", color: "bg-sky-400", label: "Personal" },
  { key: "annual", color: "bg-emerald-400", label: "Annual" },
  { key: "emergency", color: "bg-yellow-400", label: "Emergency" },
  { key: "special", color: "bg-rose-400", label: "Special" },
];