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
  const { t } = useTranslation();

  const pad2 = (n) => String(n).padStart(2, "0");

  const parseValue = (v) => {
    const now = new Date();
    const fallback = {
      mode: allowAll ? "all" : "date",
      y: String(now.getFullYear()),
      m: "01",
      d: "01",
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

  // ⭐ รวม state ทั้งหมดเป็น object เดียว
  const [state, setState] = useState(() => parseValue(value));
  const initialRef = useRef(state);

  const { mode, y: yy, m: mm, d: dd } = state;

  useEffect(() => {
    if (!open) return;
    const p = parseValue(value);
    initialRef.current = p;

    // ⭐ setState ครั้งเดียว → ไม่มี ESLint warning
    setState({
      mode: p.mode,
      y: p.y,
      m: p.m,
      d: p.d,
    });
  }, [open, value]);

  const yearOptions = useMemo(() => {
    const nowY = new Date().getFullYear();
    const start = nowY - 10;
    const end = nowY + 2;
    const arr = [];
    for (let y = end; y >= start; y--) arr.push(String(y));
    return arr;
  }, []);

  const monthFormatter = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(undefined, { month: "short" });
    } catch {
      return new Intl.DateTimeFormat("en", { month: "short" });
    }
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

  const days = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => pad2(i + 1));
  }, [daysInMonth]);

  useEffect(() => {
    const n = Number(dd);
    if (n > daysInMonth) {
      setState((prev) => ({ ...prev, d: pad2(daysInMonth) }));
    }
  }, [daysInMonth]);

  const yearScrollRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const el = yearScrollRef.current;
    if (!el) return;
    const btn = el.querySelector(`[data-year="${yy}"]`);
    if (btn) {
      const top = btn.offsetTop - el.clientHeight / 2 + btn.clientHeight / 2;
      el.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
  }, [open, yy]);

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
    setState({
      mode: p.mode,
      y: p.y,
      m: p.m,
      d: p.d,
    });
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") onClose?.();
    if (e.key === "Enter") commit();
  };

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

          <div className="dgp-preview">
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
                {mode === "all"
                  ? t("dateGridPicker.allOn")
                  : t("dateGridPicker.allOff")}
              </button>
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
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          mode: "date",
                          y,
                        }))
                      }
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
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          mode: "date",
                          m: m.value,
                        }))
                      }
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
              <div className="dgp-grid-wrap dgp-scroll">
                <div className="dgp-grid dgp-grid-4">
                  {days.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`dgp-chip ${d === dd ? "is-active" : ""}`}
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          mode: "date",
                          d,
                        }))
                      }
                    >
                      {d}
                    </button>
                  ))}
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
