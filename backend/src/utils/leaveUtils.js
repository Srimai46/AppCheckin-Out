// backend/src/utils/leaveUtils.js

// กำหนดค่า Default ไว้ที่นี่ หรือจะดึงมาจาก Env ก็ได้
const DEFAULT_ANNUAL_CARRY = 5;
const DEFAULT_ANNUAL_TOTAL = 15;

const validateAndApplyQuotaCaps = ({
  typeName,
  totalDays,
  carryOverDays,
  currentUsed = 0,
  hrMaxCarry,
  hrTotalCap,
}) => {
  const t = String(typeName || "").toUpperCase();
  let base = Number(totalDays) || 0;
  let carry = Number(carryOverDays) || 0;
  const used = Number(currentUsed) || 0;

  // 1. ใช้ค่าที่ HR กำหนด (ถ้าไม่ส่งมา ถึงจะใช้ Default ของระบบ)
  const carryLimit = hrMaxCarry ?? (t === "ANNUAL" ? DEFAULT_ANNUAL_CARRY : 0);
  carry = Math.max(0, Math.min(carry, carryLimit));

  // 2. ใช้เพดานรวมที่ HR กำหนดเอง
  const capLimit = hrTotalCap ?? (t === "ANNUAL" ? DEFAULT_ANNUAL_TOTAL : 999);

  if (base + carry > capLimit) {
    // ระบบจะปรับลด base ลงเพื่อให้ (base + carry) ไม่เกินที่ HR ตั้งไว้
    base = Math.max(0, capLimit - carry);
  }

  // 3. ป้องกันวันลาติดลบ
  if (base + carry < used) {
    base = Math.max(used - carry, 0);
  }

  return { finalBase: base, finalCarry: carry };
};

module.exports = {
  validateAndApplyQuotaCaps,
  DEFAULT_ANNUAL_CARRY,
  DEFAULT_ANNUAL_TOTAL
};