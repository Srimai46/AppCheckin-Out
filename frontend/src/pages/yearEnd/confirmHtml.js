import { escapeHtml, ymdToDDMMYYYY } from "./utils";
import i18n from "../../components/i18n/i18n";

// ============================
// helpers (i18n-safe)
// ============================
const t = (k, opt) => {
  try {
    return i18n.t(k, opt);
  } catch {
    return k;
  }
};

// รองรับ name เป็น string หรือเป็น object { th, en, ja }
const pickLabel = (val, fallback = "-") => {
  if (val == null) return fallback;

  if (typeof val === "string") return val;

  if (typeof val === "object") {
    const lang = (i18n.language || "en").toLowerCase();
    return val?.[lang] || val?.th || val?.en || val?.ja || fallback;
  }

  return String(val);
};

const pluralDayText = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return t("confirmHtml.common.dayPlural");

  if ((i18n.language || "en").startsWith("en")) {
    return num === 1 ? t("confirmHtml.common.daySingular") : t("confirmHtml.common.dayPlural");
  }
  return t("confirmHtml.common.dayPlural");
};

const buildRangeText = (start, end, total) => {
  const startText = ymdToDDMMYYYY(start);
  const endText = ymdToDDMMYYYY(end);

  const totalText = `${escapeHtml(String(total))} ${escapeHtml(pluralDayText(total))}`;

  if (start === end) return `${escapeHtml(startText)} (${totalText})`;
  return `${escapeHtml(startText)} ${escapeHtml(t("confirmHtml.common.to"))} ${escapeHtml(endText)} (${totalText})`;
};

// ============================
// 1) Working Days Confirm
// ============================
export const buildWorkingDaysConfirmHtml = (workingDays = []) => {
  const order = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  const labelKey = {
    MON: "workingDays.mon",
    TUE: "workingDays.tue",
    WED: "workingDays.wed",
    THU: "workingDays.thu",
    FRI: "workingDays.fri",
    SAT: "workingDays.sat",
    SUN: "workingDays.sun",
  };

  const selected = (workingDays || [])
    .map((x) => String(x || "").toUpperCase())
    .slice()
    .sort((a, b) => order.indexOf(a) - order.indexOf(b));

  const daysText = selected
    .map((d) => (labelKey[d] ? t(labelKey[d]) : d))
    .join(", ");

  return `
    <div style="text-align:left; line-height:1.7;">
      <div style="font-weight:900; margin-bottom:8px;">
        ${escapeHtml(t("confirmHtml.workingDays.subtitle"))}
      </div>
      <div style="border:1px solid rgba(0,0,0,.08); border-radius:14px; padding:10px 12px; background:#f9fafb;">
        <div style="font-weight:900; font-size:12px;">
          ${escapeHtml(daysText || "-")}
        </div>
      </div>
    </div>
  `.trim();
};

// ============================
// 2) Work Time Confirm
// ============================
export const buildWorkTimeConfirmHtml = (workTimeByRole) => {
  const roles = [
    { k: "HR", label: t("workTimeByRole.roleHR") },
    { k: "WORKER", label: t("workTimeByRole.roleWorker") },
  ];

  const rows = roles.map((r) => {
    const start = workTimeByRole?.[r.k]?.start || "-";
    const end = workTimeByRole?.[r.k]?.end || "-";
    return `
      <div style="display:flex; justify-content:space-between; gap:12px; padding:8px 0; border-bottom:1px solid rgba(0,0,0,.06);">
        <div style="font-weight:900; letter-spacing:.06em; font-size:12px;">${escapeHtml(r.label)}</div>
        <div style="font-weight:900; font-size:12px; color:#111827;">
          ${escapeHtml(String(start))} - ${escapeHtml(String(end))}
        </div>
      </div>
    `;
  });

  return `
    <div style="text-align:left; line-height:1.7;">
      <div style="font-weight:900; margin-bottom:8px;">
        ${escapeHtml(t("confirmHtml.workTime.title"))}
      </div>
      <div style="border:1px solid rgba(0,0,0,.08); border-radius:14px; padding:10px 12px; background:#f9fafb;">
        ${rows.join("")}
      </div>
    </div>
  `.trim();
};

// ============================
// 3) Max Consecutive Confirm
// ============================
export const buildMaxConsecutiveConfirmHtml = (maxConsecutiveHolidayDays) => `
  <div style="text-align:left; line-height:1.7;">
    <div style="font-weight:900; margin-bottom:8px;">
      ${escapeHtml(t("confirmHtml.maxConsecutive.title"))}
    </div>

    <div style="border:1px solid rgba(0,0,0,.08); border-radius:14px; padding:10px 12px; background:#f9fafb;">
      <div style="display:flex; justify-content:space-between; gap:12px;">
        <div style="font-weight:900; font-size:12px;">
          ${escapeHtml(t("confirmHtml.maxConsecutive.label"))}
        </div>
        <div style="font-weight:900; font-size:12px; color:#111827;">
          ${escapeHtml(String(maxConsecutiveHolidayDays))} ${escapeHtml(pluralDayText(maxConsecutiveHolidayDays))}
        </div>
      </div>
    </div>
  </div>
`.trim();

// ============================
// 4) Carry Over Confirm
// ============================
export const buildCarryOverConfirmHtml = (carryOverLimits = {}) => {
  const co = carryOverLimits || {};
  const rows = Object.keys(co).map((k) => {
    const v = Number(co[k] ?? 0);
    return `
      <div style="display:flex; justify-content:space-between; gap:12px; padding:8px 0; border-bottom:1px solid rgba(0,0,0,.06);">
        <div style="font-weight:900; letter-spacing:.06em; font-size:12px;">${escapeHtml(String(k))}</div>
        <div style="font-weight:900; font-size:12px; color:#111827;">
          ${escapeHtml(String(v))} ${escapeHtml(pluralDayText(v))}
        </div>
      </div>
    `;
  });

  return `
    <div style="text-align:left; line-height:1.7;">
      <div style="font-weight:900; margin-bottom:8px;">
        ${escapeHtml(t("confirmHtml.carryOver.title"))}
      </div>

      <div style="font-size:12px; opacity:.85; margin-bottom:10px;">
        ${escapeHtml(t("confirmHtml.carryOver.hint"))}
      </div>

      <div style="border:1px solid rgba(0,0,0,.08); border-radius:14px; padding:10px 12px; background:#f9fafb;">
        ${rows.join("")}
      </div>
    </div>
  `.trim();
};

// ============================
// 5) Holiday Upsert Confirm
// ============================
export const buildHolidayUpsertConfirmHtml = ({ name, start, end, total, mode }) => {
  const dateText = buildRangeText(start, end, total);
  const holidayName = pickLabel(name, t("confirmHtml.holiday.fallbackName"));

  const modeText =
    String(mode || "").toLowerCase() === "update"
      ? t("confirmHtml.holiday.mode.update")
      : t("confirmHtml.holiday.mode.add");

  return `
    <div style="text-align:left; line-height:1.7;">
      <div style="font-weight:900; margin-bottom:8px;">
        ${escapeHtml(t("confirmHtml.holidayUpsert.title", { mode: modeText }))}
      </div>

      <div style="border:1px solid rgba(0,0,0,.08); border-radius:14px; padding:10px 12px; background:#f9fafb;">
        <div style="display:flex; justify-content:space-between; gap:12px; padding:6px 0;">
          <div style="font-weight:900; font-size:12px;">${escapeHtml(t("confirmHtml.holiday.fields.holiday"))}</div>
          <div style="font-weight:900; font-size:12px; color:#111827;">${escapeHtml(holidayName)}</div>
        </div>
        <div style="display:flex; justify-content:space-between; gap:12px; padding:6px 0;">
          <div style="font-weight:900; font-size:12px;">${escapeHtml(t("confirmHtml.holiday.fields.date"))}</div>
          <div style="font-weight:900; font-size:12px; color:#111827;">${dateText}</div>
        </div>
      </div>
    </div>
  `.trim();
};

// ============================
// 6) Holiday Delete Confirm
// ============================
export const buildHolidayDeleteConfirmHtml = ({ name, start, end, total }) => {
  const dateText = buildRangeText(start, end, total);
  const holidayName = pickLabel(name, t("confirmHtml.holiday.fallbackName"));

  return `
    <div style="text-align:left; line-height:1.7;">
      <div style="font-weight:900; margin-bottom:8px;">
        ${escapeHtml(t("confirmHtml.holidayDelete.title"))}
      </div>

      <div style="border:1px solid rgba(0,0,0,.08); border-radius:14px; padding:10px 12px; background:#fff7ed;">
        <div style="font-weight:900; font-size:12px; margin-bottom:6px;">
          ${escapeHtml(holidayName)}
        </div>
        <div style="font-size:12px; font-weight:800; color:#111827;">
          ${dateText}
        </div>
      </div>

      <div style="margin-top:8px; font-size:12px; opacity:.8;">
        ${escapeHtml(t("confirmHtml.holidayDelete.hint"))}
      </div>
    </div>
  `.trim();
};
