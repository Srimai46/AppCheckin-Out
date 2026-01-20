//frontend/src/components/shared/DateGridPicker.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "../../styles/DateGridPicker.css";
import { useTranslation } from "react-i18next";

export default function DateGridPicker({
  open,
  value,
  onChange,
  onClose,
  title,
  allowAll = true,
  granularity = "day",
}) {
  const { t, i18n } = useTranslation();

  const pad2 = (n) => String(n).padStart(2, "0");

  // =========================
  // ✅ Locale helpers
  // =========================
  const locale = useMemo(() => {
    const lang = (i18n.language || "en").toLowerCase();
    if (lang.startsWith("th")) return "th-TH";
    if (lang.startsWith("ja")) return "ja-JP";
    return "en-US";
  }, [i18n.language]);

  const weekdayLongFormatter = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(locale, { weekday: "long" });
    } catch {
      return new Intl.DateTimeFormat("en-US", { weekday: "long" });
    }
  }, [locale]);

  const monthFormatter = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(locale, { month: "short" });
    } catch {
      return new Intl.DateTimeFormat("en-US", { month: "short" });
    }
  }, [locale]);

  const getWeekdayLong = (y, m, d) => {
    const yyNum = Number(y);
    const mmNum = Number(m);
    const ddNum = Number(d);
    if (!yyNum || !mmNum || !ddNum) return "";
    const date = new Date(yyNum, mmNum - 1, ddNum);
    if (Number.isNaN(date.getTime())) return "";
    return weekdayLongFormatter.format(date);
  };

  // ✅ Week header like screenshot (Su Mo Tu ...)
  const weekHeaders = useMemo(() => {
    const lang = (i18n.language || "en").toLowerCase();
    if (lang.startsWith("th")) return ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
    if (lang.startsWith("ja")) return ["日", "月", "火", "水", "木", "金", "土"];
    return ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  }, [i18n.language]);

  // =========================
  // Parse/State
  // =========================
  const parseValue = (v) => {
    const now = new Date();
    const fallback = {
      mode: allowAll ? "all" : "date",
      y: String(now.getFullYear()),
      m: pad2(now.getMonth() + 1),
      d: pad2(now.getDate()),
    };

    if (!v) return fallback;

    const s = String(v).trim();

    let m = s.match(/^(\d{4})$/);
    if (m) return { mode: "date", y: m[1], m: "01", d: "01" };

    m = s.match(/^(\d{4})-(\d{2})$/);
    if (m) return { mode: "date", y: m[1], m: m[2], d: "01" };

    m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return { mode: "date", y: m[1], m: m[2], d: m[3] };

    return fallback;
  };

  const [state, setState] = useState(() => parseValue(value));
  const initialRef = useRef(state);

  const { mode, y: yy, m: mm, d: dd } = state;

  useEffect(() => {
    if (!open) return;
    const p = parseValue(value);
    initialRef.current = p;
    setState({ mode: p.mode, y: p.y, m: p.m, d: p.d });
  }, [open, value]);

  // =========================
  // Options
  // =========================
  const yearOptions = useMemo(() => {
    const nowY = new Date().getFullYear();
    const start = nowY - 10;
    const end = nowY + 2;
    const arr = [];
    for (let y = end; y >= start; y--) arr.push(String(y));
    return arr;
  }, []);

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      value: pad2(i + 1),
      label: monthFormatter.format(new Date(2026, i, 1)),
    }));
  }, [monthFormatter]);

  const daysInMonth = useMemo(() => {
    const y = Number(yy);
    const m = Number(mm);
    if (!y || !m) return 31;
    return new Date(y, m, 0).getDate();
  }, [yy, mm]);

  useEffect(() => {
    const n = Number(dd);
    if (n > daysInMonth) setState((prev) => ({ ...prev, d: pad2(daysInMonth) }));
  }, [daysInMonth]);

  // =========================
  // ✅ Calendar cells (6 weeks x 7 days)
  // =========================
  const calendarCells = useMemo(() => {
    const y = Number(yy);
    const m = Number(mm);
    if (!y || !m) return [];

    const first = new Date(y, m - 1, 1);
    const firstDow = first.getDay(); // 0=Sun
    const dim = new Date(y, m, 0).getDate(); // days in current month
    const prevDim = new Date(y, m - 1, 0).getDate(); // days in prev month

    const cells = [];
    for (let i = 0; i < 42; i++) {
      const dayNum = i - firstDow + 1;
      if (dayNum <= 0) {
        // prev month
        const d = prevDim + dayNum;
        const prevDate = new Date(y, m - 2, d);
        cells.push({
          y: String(prevDate.getFullYear()),
          m: pad2(prevDate.getMonth() + 1),
          d: pad2(prevDate.getDate()),
          inMonth: false,
        });
      } else if (dayNum > dim) {
        // next month
        const d = dayNum - dim;
        const nextDate = new Date(y, m, d);
        cells.push({
          y: String(nextDate.getFullYear()),
          m: pad2(nextDate.getMonth() + 1),
          d: pad2(nextDate.getDate()),
          inMonth: false,
        });
      } else {
        // current month
        cells.push({
          y: String(y),
          m: pad2(m),
          d: pad2(dayNum),
          inMonth: true,
        });
      }
    }
    return cells;
  }, [yy, mm]);

  // =========================
  // Year auto scroll (เดิม)
  // =========================
  const yearScrollRef = useRef(null);
  const didAutoScrollRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    didAutoScrollRef.current = false;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (didAutoScrollRef.current) return;

    const el = yearScrollRef.current;
    if (!el) return;

    const btn = el.querySelector(`[data-year="${yy}"]`);
    if (!btn) return;

    const elRect = el.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();

    const isAbove = btnRect.top < elRect.top;
    const isBelow = btnRect.bottom > elRect.bottom;

    if (isAbove || isBelow) {
      const top = btn.offsetTop - el.clientHeight / 2 + btn.clientHeight / 2;
      el.scrollTo({ top: Math.max(0, top), behavior: "auto" });
    }

    didAutoScrollRef.current = true;
  }, [open, yy]);

  // =========================
  // Actions
  // =========================
  const commit = () => {
    if (allowAll && mode === "all") {
      onChange?.(null);
      onClose?.();
      return;
    }

    if (granularity === "year") {
      onChange?.(`${yy}`);
      onClose?.();
      return;
    }

    if (granularity === "month") {
      onChange?.(`${yy}-${mm}`);
      onClose?.();
      return;
    }

    onChange?.(`${yy}-${mm}-${dd}`);
    onClose?.();
  };

  const reset = () => {
    const p = initialRef.current;
    setState({ mode: p.mode, y: p.y, m: p.m, d: p.d });
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") onClose?.();
    if (e.key === "Enter") commit();
  };

  const weekdayLong = useMemo(() => {
    if (allowAll && mode === "all") return "";
    if (granularity !== "day") return "";
    return getWeekdayLong(yy, mm, dd);
  }, [allowAll, mode, granularity, yy, mm, dd, weekdayLongFormatter]);

  const previewText = useMemo(() => {
    if (allowAll && mode === "all") return t("dateGridPicker.all");
    if (granularity === "year") return `${yy}`;
    if (granularity === "month") return `${mm}/${yy}`;
    return `${dd}/${mm}/${yy}`;
  }, [allowAll, mode, granularity, yy, mm, dd, t]);

  const showYear = true;
  const showMonth = granularity !== "year";
  const showDay = granularity === "day";

  if (!open) return null;

  return (
    <div className="dgp-backdrop" onMouseDown={onClose}>
      <div
        className="dgp-modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        tabIndex={-1}
      >
        <div className="dgp-head">
          <div className="dgp-title">{title || t("dateGridPicker.title")}</div>

          <div className="dgp-preview" style={{ flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span className={`dgp-preview-pill ${allowAll && mode === "all" ? "is-all" : ""}`}>
                {previewText}
              </span>

              {allowAll && (
                <button
                  type="button"
                  className={`dgp-all-toggle ${mode === "all" ? "is-on" : ""}`}
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      mode: prev.mode === "all" ? "date" : "all",
                    }))
                  }
                  title={t("dateGridPicker.all")}
                >
                  {mode === "all" ? t("dateGridPicker.allOn") : t("dateGridPicker.allOff")}
                </button>
              )}
            </div>

            {granularity === "day" && !(allowAll && mode === "all") && (
              <div className="dgp-weekday-preview">{weekdayLong}</div>
            )}
          </div>
        </div>

        <div
          className="dgp-panels"
          style={{
            gridTemplateColumns:
              showYear && showMonth && showDay
                ? "1fr 1fr 1fr"
                : showYear && showMonth
                ? "1fr 1fr"
                : "1fr",
          }}
        >
          {showYear && (
            <div className="dgp-panel">
              <div className="dgp-label">{t("dateGridPicker.year")}</div>
              <div className="dgp-grid-wrap dgp-scroll" ref={yearScrollRef}>
                <div className="dgp-grid dgp-grid-3">
                  {yearOptions.map((y) => (
                    <button
                      key={y}
                      type="button"
                      data-year={y}
                      className={`dgp-chip ${y === yy ? "is-active" : ""}`}
                      onClick={() => setState((prev) => ({ ...prev, mode: "date", y }))}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {showMonth && (
            <div className="dgp-panel">
              <div className="dgp-label">{t("dateGridPicker.month")}</div>
              <div className="dgp-grid-wrap">
                <div className="dgp-grid dgp-grid-3">
                  {months.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      className={`dgp-chip ${m.value === mm ? "is-active" : ""}`}
                      onClick={() => setState((prev) => ({ ...prev, mode: "date", m: m.value }))}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {showDay && (
            <div className="dgp-panel">
              <div className="dgp-label">{t("dateGridPicker.day")}</div>

              {/* ✅ Calendar View */}
              <div className="dgp-grid-wrap">
                <div className="dgp-cal">
                  <div className="dgp-weekdays">
                    {weekHeaders.map((h) => (
                      <div key={h} className="dgp-weekday">
                        {h}
                      </div>
                    ))}
                  </div>

                  <div className="dgp-cal-grid" role="grid" aria-label="Calendar">
                    {calendarCells.map((c, idx) => {
                      const isSelected = c.y === yy && c.m === mm && c.d === dd;
                      const cls = [
                        "dgp-cal-cell",
                        c.inMonth ? "in-month" : "out-month",
                        isSelected ? "is-selected" : "",
                      ]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <button
                          key={`${c.y}-${c.m}-${c.d}-${idx}`}
                          type="button"
                          className={cls}
                          onClick={() =>
                            setState((prev) => ({
                              ...prev,
                              mode: "date",
                              y: c.y,
                              m: c.m,
                              d: c.d,
                            }))
                          }
                          title={`${c.d}/${c.m}/${c.y} (${getWeekdayLong(c.y, c.m, c.d)})`}
                        >
                          {Number(c.d)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="dgp-actions">
          <button type="button" className="dgp-btn ghost" onClick={reset}>
            {t("dateGridPicker.reset")}
          </button>

          <div className="dgp-actions-right">
            <button type="button" className="dgp-btn ghost" onClick={onClose}>
              {t("dateGridPicker.cancel")}
            </button>
            <button type="button" className="dgp-btn primary" onClick={commit}>
              {t("dateGridPicker.done")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
