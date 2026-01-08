import React, { useEffect, useMemo, useRef, useState } from "react";
import "../../styles/DateGridPicker.css";

/**
 * DateGridPicker - Grid picker คล้ายตัวอย่าง (scroll + chips + RESET/DONE)
 *
 * Props:
 * - open: boolean
 * - value: string | null
 *    - null => ALL (ถ้า allowAll=true)
 *    - "YYYY" | "YYYY-MM" | "YYYY-MM-DD"
 * - onChange: (val: string | null) => void
 * - onClose: () => void
 * - title?: string
 * - allowAll?: boolean (default true)
 * - granularity?: "year" | "month" | "day" (default "day")
 *    - year  => เลือกแค่ปี (คืนค่า "YYYY")
 *    - month => เลือกปี+เดือน (คืนค่า "YYYY-MM")
 *    - day   => เลือกปี+เดือน+วัน (คืนค่า "YYYY-MM-DD")
 */
export default function DateGridPicker({
  open,
  value,
  onChange,
  onClose,
  title = "Select date",
  allowAll = true,
  granularity = "day",
}) {
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

    // YYYY
    let m = s.match(/^(\d{4})$/);
    if (m) return { mode: "date", y: m[1], m: "01", d: "01" };

    // YYYY-MM
    m = s.match(/^(\d{4})-(\d{2})$/);
    if (m) return { mode: "date", y: m[1], m: m[2], d: "01" };

    // YYYY-MM-DD
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return { mode: "date", y: m[1], m: m[2], d: m[3] };

    return fallback;
  };

  const initialRef = useRef(parseValue(value));

  const [mode, setMode] = useState(parseValue(value).mode); // "all" | "date"
  const [yy, setYy] = useState(parseValue(value).y);
  const [mm, setMm] = useState(parseValue(value).m);
  const [dd, setDd] = useState(parseValue(value).d);

  useEffect(() => {
    if (!open) return;
    const p = parseValue(value);
    initialRef.current = p;
    setMode(p.mode);
    setYy(p.y);
    setMm(p.m);
    setDd(p.d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value]);

  // years list: ย้อนหลัง 10 ปี + ล่วงหน้า 2 ปี (ปรับได้)
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
    if (n > daysInMonth) setDd(pad2(daysInMonth));
  }, [daysInMonth]); // eslint-disable-line

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

    // day (default)
    onChange?.(`${yy}-${mm}-${dd}`);
    onClose?.();
  };

  const reset = () => {
    const p = initialRef.current;
    setMode(p.mode);
    setYy(p.y);
    setMm(p.m);
    setDd(p.d);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") onClose?.();
    if (e.key === "Enter") commit();
  };

  const previewText = useMemo(() => {
    if (allowAll && mode === "all") return "ALL";
    if (granularity === "year") return `${yy}`;
    if (granularity === "month") return `${mm}/${yy}`;
    return `${dd}/${mm}/${yy}`;
  }, [allowAll, mode, granularity, yy, mm, dd]);

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
          <div className="dgp-title">{title}</div>

          <div className="dgp-preview">
            <span className={`dgp-preview-pill ${allowAll && mode === "all" ? "is-all" : ""}`}>
              {previewText}
            </span>

            {allowAll && (
              <button
                type="button"
                className={`dgp-all-toggle ${mode === "all" ? "is-on" : ""}`}
                onClick={() => setMode((m) => (m === "all" ? "date" : "all"))}
                title="Toggle ALL"
              >
                {mode === "all" ? "ALL ON" : "ALL OFF"}
              </button>
            )}
          </div>
        </div>

        <div
          className="dgp-panels"
          style={{
            gridTemplateColumns: showYear && showMonth && showDay
              ? "1fr 1fr 1fr"
              : showYear && showMonth
              ? "1fr 1fr"
              : "1fr",
          }}
        >
          {/* YEAR */}
          {showYear && (
            <div className="dgp-panel">
              <div className="dgp-label">YEAR</div>
              <div className="dgp-grid-wrap dgp-scroll" ref={yearScrollRef}>
                <div className="dgp-grid dgp-grid-3">
                  {yearOptions.map((y) => (
                    <button
                      key={y}
                      type="button"
                      data-year={y}
                      className={`dgp-chip ${y === yy ? "is-active" : ""}`}
                      onClick={() => {
                        setMode("date");
                        setYy(y);
                      }}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MONTH */}
          {showMonth && (
            <div className="dgp-panel">
              <div className="dgp-label">MONTH</div>
              <div className="dgp-grid-wrap">
                <div className="dgp-grid dgp-grid-3">
                  {months.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      className={`dgp-chip ${m.value === mm ? "is-active" : ""}`}
                      onClick={() => {
                        setMode("date");
                        setMm(m.value);
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* DAY */}
          {showDay && (
            <div className="dgp-panel">
              <div className="dgp-label">DAY</div>
              <div className="dgp-grid-wrap dgp-scroll">
                <div className="dgp-grid dgp-grid-4">
                  {days.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`dgp-chip ${d === dd ? "is-active" : ""}`}
                      onClick={() => {
                        setMode("date");
                        setDd(d);
                      }}
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
            RESET
          </button>

          <div className="dgp-actions-right">
            <button type="button" className="dgp-btn ghost" onClick={onClose}>
              CANCEL
            </button>
            <button type="button" className="dgp-btn primary" onClick={commit}>
              DONE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
