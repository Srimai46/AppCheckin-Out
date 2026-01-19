// yearEnd/components/ColorPickerButton.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Pipette } from "lucide-react";

const DEFAULT_COLOR = "#6366F1";

const normalizeHex = (value, fallback = DEFAULT_COLOR) => {
  if (!value || typeof value !== "string") return fallback;
  const v = value.trim();
  const isHex = /^#([0-9a-fA-F]{6})$/.test(v);
  return isHex ? v.toUpperCase() : fallback;
};

const isValidHex = (value) => {
  if (!value || typeof value !== "string") return false;
  return /^#([0-9a-fA-F]{6})$/.test(value.trim());
};

export default function ColorPickerButton({
  value,
  onChange,
  label,
  disabled = false,
}) {
  const inputRef = useRef(null);

  // source-of-truth color (valid hex)
  const hex = useMemo(() => normalizeHex(value, DEFAULT_COLOR), [value]);

  // text input state (can be invalid while typing)
  const [text, setText] = useState(hex);
  const [touched, setTouched] = useState(false);

  // keep text synced when parent value changes
  useEffect(() => {
    setText(hex);
    setTouched(false);
  }, [hex]);

  const textTrim = text.trim();
  const textLooksValid = isValidHex(textTrim);

  const applyText = () => {
    if (!onChange) return;
    if (textLooksValid) {
      onChange(textTrim.toUpperCase());
      setTouched(false);
    }
  };

  const revertText = () => {
    setText(hex);
    setTouched(false);
  };

  return (
    <div className="flex items-center gap-3">
      {/* preview box */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={`h-11 w-11 rounded-2xl border border-gray-200 overflow-hidden
          transition-all active:scale-95
          ${disabled ? "opacity-60 cursor-not-allowed" : "hover:shadow-sm"}`}
        title={hex}
        aria-label={label || "Pick color"}
      >
        <span className="block h-full w-full" style={{ backgroundColor: hex }} />
      </button>

      {/* open picker */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={`h-11 px-5 rounded-2xl border border-gray-200 bg-white
          text-slate-700 font-black text-[11px] uppercase tracking-widest
          inline-flex items-center gap-2 transition-all active:scale-95
          ${disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50"}`}
      >
        <Pipette size={16} />
        {label || "Pick"}
      </button>

      {/* hex input */}
      <div className="flex flex-col gap-1">
        <input
          value={text}
          disabled={disabled}
          onChange={(e) => {
            setText(e.target.value);
            setTouched(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyText();
            if (e.key === "Escape") revertText();
          }}
          onBlur={() => {
            // if user typed invalid code -> revert
            if (!textLooksValid) revertText();
            else applyText();
          }}
          placeholder="#RRGGBB"
          className={`h-11 w-[120px] px-4 rounded-2xl border bg-white
            font-black text-[12px] text-slate-800 outline-none transition-all
            focus:ring-2 focus:ring-indigo-100
            ${
              touched && !textLooksValid
                ? "border-rose-300 ring-2 ring-rose-100"
                : "border-gray-200"
            }`}
          aria-label="Hex color"
        />
      </div>

      {/* hidden native picker */}
      <input
        ref={inputRef}
        type="color"
        value={hex}
        onChange={(e) => {
          const next = normalizeHex(e.target.value, DEFAULT_COLOR);
          onChange?.(next);
          // keep text in sync immediately
          setText(next);
          setTouched(false);
        }}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
