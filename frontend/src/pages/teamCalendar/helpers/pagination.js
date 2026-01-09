// src/pages/teamCalendar/helpers/pagination.js
export const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

export const getPageNumbers = (page, total, maxButtons = 5) => {
  const pages = [];
  if (total <= maxButtons) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }

  let start = Math.max(1, page - 1);
  let end = Math.min(total, start + (maxButtons - 1));
  start = Math.max(1, end - (maxButtons - 1));

  if (start > 1) pages.push(1);
  if (start > 2) pages.push("...");

  for (let i = start; i <= end; i++) pages.push(i);

  if (end < total - 1) pages.push("...");
  if (end < total) pages.push(total);

  return pages;
};
