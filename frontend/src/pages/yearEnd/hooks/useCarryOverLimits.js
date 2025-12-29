import React, { createContext, useContext, useState } from "react";
import { alertConfirm, alertError, alertSuccess } from "../../../utils/sweetAlert";
import { clamp } from "../utils";
import { buildCarryOverConfirmHtml } from "../confirmHtml";

const Ctx = createContext(null);

export function CarryOverLimitsProvider({ children }) {
  const [carryOverLimits, setCarryOverLimits] = useState({
    ANNUAL: 0,
    SICK: 0,
    PERSONAL: 0,
    EMERGENCY: 0,
  });
  const [carrySaving, setCarrySaving] = useState(false);

  const handleCarryOverChange = (type, value) => {
    setCarryOverLimits((prev) => ({
      ...prev,
      [type]: clamp(Number(value || 0), 0, 365),
    }));
  };

  const saveCarryOverLimits = async () => {
    if (carrySaving) return;

    for (const k of Object.keys(carryOverLimits)) {
      const v = Number(carryOverLimits[k]);
      if (Number.isNaN(v) || v < 0 || v > 365) {
        alertError("Invalid Carry Over", `${k} must be between 0 and 365.`);
        return;
      }
    }

    const ok = await alertConfirm(
      "Save Custom Holidays Carry Over?",
      buildCarryOverConfirmHtml(carryOverLimits),
      "Save"
    );
    if (!ok) return;

    setCarrySaving(true);
    try {
      await new Promise((r) => setTimeout(r, 250));
      await alertSuccess("Saved", "Carry Over limits saved.");
    } catch (e) {
      console.error(e);
      alertError("Save Failed", "Unable to save carry over limits.");
    } finally {
      setCarrySaving(false);
    }
  };

  const value = { carryOverLimits, handleCarryOverChange, carrySaving, saveCarryOverLimits };

  // ✅ NO JSX in .js
  return React.createElement(Ctx.Provider, { value }, children);
}

export function useCarryOverLimits() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useCarryOverLimits must be used within CarryOverLimitsProvider");
  }
  return ctx;
}
