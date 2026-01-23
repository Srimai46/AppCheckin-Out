import { useEffect } from "react";

/**
 * useOutsideClick
 * refs: array of refs (e.g. [btnRef, menuRef])
 * onOutside: callback when click outside all refs
 */
export default function useOutsideClick(refs, onOutside) {
  useEffect(() => {
    const handler = (e) => {
      const isInside = (refs || []).some((r) => r?.current && r.current.contains(e.target));
      if (isInside) return;
      onOutside?.(e);
    };

    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [refs, onOutside]);
}
