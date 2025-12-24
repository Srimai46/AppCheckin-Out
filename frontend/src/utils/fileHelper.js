// src/utils/fileHelper.js
export const buildFileUrl = (pathOrUrl) => {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  const API_BASE = (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");
  const FILE_BASE = API_BASE.replace(/\/api\/?$/, "");

  if (/^[a-zA-Z]:\\/.test(pathOrUrl)) {
    const normalized = pathOrUrl.replace(/\\/g, "/");
    const idx = normalized.toLowerCase().indexOf("/uploads/");
    if (idx !== -1) return `${FILE_BASE || window.location.origin}${normalized.slice(idx)}`;
    return "";
  }

  const p = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${FILE_BASE || window.location.origin}${p}`;
};