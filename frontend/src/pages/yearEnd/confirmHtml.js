import { escapeHtml, ymdToDDMMYYYY } from "./utils";

export const buildWorkingDaysConfirmHtml = (workingDays = []) => {
  const order = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const label = { MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat", SUN: "Sun" };
  const selected = (workingDays || []).slice().sort((a, b) => order.indexOf(a) - order.indexOf(b));

  return `
    <div style="text-align:left; line-height:1.7;">
      <div style="font-weight:900; margin-bottom:8px;">Confirm Working Days</div>
      <div style="border:1px solid rgba(0,0,0,.08); border-radius:14px; padding:10px 12px; background:#f9fafb;">
        <div style="font-weight:900; font-size:12px;">
          ${escapeHtml(selected.map((d) => label[d] || d).join(", ") || "-")}
        </div>
      </div>
    </div>
  `.trim();
};

export const buildWorkTimeConfirmHtml = (workTimeByRole) => {
  const roles = [
    { k: "HR", label: "HR" },
    { k: "WORKER", label: "Worker" },
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
      <div style="font-weight:900; margin-bottom:8px;">Confirm Work Time (By Role)</div>
      <div style="border:1px solid rgba(0,0,0,.08); border-radius:14px; padding:10px 12px; background:#f9fafb;">
        ${rows.join("")}
      </div>
    </div>
  `.trim();
};

export const buildMaxConsecutiveConfirmHtml = (maxConsecutiveHolidayDays) => `
  <div style="text-align:left; line-height:1.7;">
    <div style="font-weight:900; margin-bottom:8px;">Confirm Max Consecutive Holidays</div>
    <div style="border:1px solid rgba(0,0,0,.08); border-radius:14px; padding:10px 12px; background:#f9fafb;">
      <div style="display:flex; justify-content:space-between; gap:12px;">
        <div style="font-weight:900; font-size:12px;">Max consecutive days</div>
        <div style="font-weight:900; font-size:12px; color:#111827;">
          ${escapeHtml(String(maxConsecutiveHolidayDays))} day(s)
        </div>
      </div>
    </div>
  </div>
`.trim();

export const buildCarryOverConfirmHtml = (carryOverLimits = {}) => {
  const co = carryOverLimits || {};
  const rows = Object.keys(co).map((k) => {
    const v = Number(co[k] ?? 0);
    return `
      <div style="display:flex; justify-content:space-between; gap:12px; padding:8px 0; border-bottom:1px solid rgba(0,0,0,.06);">
        <div style="font-weight:900; letter-spacing:.06em; font-size:12px;">${escapeHtml(k)}</div>
        <div style="font-weight:900; font-size:12px; color:#111827;">
          ${escapeHtml(String(v))} day(s)
        </div>
      </div>
    `;
  });

  return `
    <div style="text-align:left; line-height:1.7;">
      <div style="font-weight:900; margin-bottom:8px;">Confirm Carry Over Limits</div>
      <div style="font-size:12px; opacity:.85; margin-bottom:10px;">
        You are about to save these carry over limits (per employee).
      </div>
      <div style="border:1px solid rgba(0,0,0,.08); border-radius:14px; padding:10px 12px; background:#f9fafb;">
        ${rows.join("")}
      </div>
    </div>
  `.trim();
};

export const buildHolidayUpsertConfirmHtml = ({ name, start, end, total, mode }) => {
  const dateText =
    start === end
      ? `${ymdToDDMMYYYY(start)} (${total} day)`
      : `${ymdToDDMMYYYY(start)} to ${ymdToDDMMYYYY(end)} (${total} days)`;

  return `
    <div style="text-align:left; line-height:1.7;">
      <div style="font-weight:900; margin-bottom:8px;">Confirm ${escapeHtml(mode)}</div>
      <div style="border:1px solid rgba(0,0,0,.08); border-radius:14px; padding:10px 12px; background:#f9fafb;">
        <div style="display:flex; justify-content:space-between; gap:12px; padding:6px 0;">
          <div style="font-weight:900; font-size:12px;">Holiday</div>
          <div style="font-weight:900; font-size:12px; color:#111827;">${escapeHtml(name)}</div>
        </div>
        <div style="display:flex; justify-content:space-between; gap:12px; padding:6px 0;">
          <div style="font-weight:900; font-size:12px;">Date</div>
          <div style="font-weight:900; font-size:12px; color:#111827;">${escapeHtml(dateText)}</div>
        </div>
      </div>
    </div>
  `.trim();
};

export const buildHolidayDeleteConfirmHtml = ({ name, start, end, total }) => {
  const dateText =
    start === end
      ? `${ymdToDDMMYYYY(start)} (${total} day)`
      : `${ymdToDDMMYYYY(start)} to ${ymdToDDMMYYYY(end)} (${total} days)`;

  return `
    <div style="text-align:left; line-height:1.7;">
      <div style="font-weight:900; margin-bottom:8px;">Confirm Delete Holiday</div>
      <div style="border:1px solid rgba(0,0,0,.08); border-radius:14px; padding:10px 12px; background:#fff7ed;">
        <div style="font-weight:900; font-size:12px; margin-bottom:6px;">
          ${escapeHtml(name || "Holiday")}
        </div>
        <div style="font-size:12px; font-weight:800; color:#111827;">
          ${escapeHtml(dateText)}
        </div>
      </div>
      <div style="margin-top:8px; font-size:12px; opacity:.8;">
        This action cannot be undone.
      </div>
    </div>
  `.trim();
};
