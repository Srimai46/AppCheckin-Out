import Swal from "sweetalert2";

export const alertConfirm = async (title, html, confirmText = "Confirm") => {
  const res = await Swal.fire({
    icon: "question",
    title,
    html,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: "Cancel",
    reverseButtons: true,
    focusCancel: true,
    buttonsStyling: false,
    customClass: {
      popup: "swal-pill-popup",
      title: "swal-pill-title",
      htmlContainer: "swal-pill-html",
      confirmButton: "swal-pill-confirm",
      cancelButton: "swal-pill-cancel",
    },
  });

  return res.isConfirmed;
};

export const alertSuccess = async (title, text = "") => {
  return Swal.fire({
    icon: "success",
    title,
    text,
    buttonsStyling: false,
    customClass: {
      popup: "swal-pill-popup",
      title: "swal-pill-title",
      confirmButton: "swal-pill-confirm",
    },
  });
};

export const alertError = async (title, text = "") => {
  return Swal.fire({
    icon: "warning",
    title,
    text,
    buttonsStyling: false,
    customClass: {
      popup: "swal-pill-popup",
      title: "swal-pill-title",
      confirmButton: "swal-pill-danger",
    },
  });
};

// ===== Reject Reason Popup =====
export const alertRejectReason = async () => {
  const { value, isConfirmed } = await Swal.fire({
    title: "Reject Leave Request",
    html: `
      <div class="swal-reject-wrapper">
        <label class="swal-reject-label">Reason for rejection</label>
        <textarea id="swal-reject-textarea" class="swal-reject-textarea"
          placeholder="Please enter rejection reason..."></textarea>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Reject",
    cancelButtonText: "Cancel",
    reverseButtons: true,
    buttonsStyling: false,
    customClass: {
      popup: "swal-pill-popup",
      title: "swal-pill-title",
      confirmButton: "swal-pill-danger",
      cancelButton: "swal-pill-cancel",
    },
    preConfirm: () => {
      const v = document.getElementById("swal-reject-textarea").value.trim();
      if (!v) {
        Swal.showValidationMessage("Rejection reason is required");
        return false;
      }
      return v;
    },
  });

  if (!isConfirmed) return null;
  return value;
};

// ===== Request Cancel Reason Popup =====
export const alertCancelReason = async () => {
  const { value, isConfirmed } = await Swal.fire({
    title: "Request Cancel Leave",
    html: `
      <div class="swal-reject-wrapper">
        <label class="swal-reject-label">Reason for cancellation</label>
        <textarea id="swal-cancel-textarea" class="swal-reject-textarea"
          placeholder="Please enter cancellation reason..."></textarea>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Request",
    cancelButtonText: "Cancel",
    reverseButtons: true,
    buttonsStyling: false,
    customClass: {
      popup: "swal-pill-popup",
      title: "swal-pill-title",
      confirmButton: "swal-pill-confirm", // ถ้าอยากให้เป็นแดงใช้ swal-pill-danger
      cancelButton: "swal-pill-cancel",
    },
    preConfirm: () => {
      const v = document.getElementById("swal-cancel-textarea").value.trim();
      if (!v) {
        Swal.showValidationMessage("Cancellation reason is required");
        return false;
      }
      return v;
    },
  });

  if (!isConfirmed) return null;
  return value;
};

// ✅ Policy/Validation style error (holiday / non-working days)
export const alertPolicyBlocked = async ({
  title = "Request Not Allowed",
  message = "You cannot request leave on holidays or non-working days.",
  details = [], // array of strings OR single string
  primary = null, // e.g. "2026-01-10"
} = {}) => {
  const detailItems = Array.isArray(details) ? details : [details].filter(Boolean);

  const detailsHtml =
    detailItems.length > 0
      ? `
        <div class="swal-policy-details">
          <div class="swal-policy-details-title">Details</div>
          <ul class="swal-policy-list">
            ${detailItems.map((t) => `<li>${t}</li>`).join("")}
          </ul>
        </div>
      `
      : "";

  const badgeHtml = primary
    ? `<div class="swal-policy-badge">${primary}</div>`
    : "";

  return Swal.fire({
    icon: "warning",
    title,
    html: `
      <div class="swal-policy-wrap">
        ${badgeHtml}
        <div class="swal-policy-msg">${message}</div>
        ${detailsHtml}
        <div class="swal-policy-hint">Please choose working days only.</div>
      </div>
    `,
    confirmButtonText: "OK",
    buttonsStyling: false,
    customClass: {
      popup: "swal-pill-popup swal-policy-popup",
      title: "swal-pill-title",
      htmlContainer: "swal-pill-html swal-policy-html",
      confirmButton: "swal-pill-danger swal-policy-ok",
    },
  });
};
