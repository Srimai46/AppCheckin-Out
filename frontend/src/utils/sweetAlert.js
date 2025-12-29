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
    input: "textarea",
    inputLabel: "Reason for rejection",
    inputPlaceholder: "Please enter rejection reason...",
    inputAttributes: {
      rows: 4,
      style: "resize:none",
    },
    showCancelButton: true,
    confirmButtonText: "Reject",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#ef4444",
    inputValidator: (value) => {
      if (!value || !value.trim()) {
        return "Rejection reason is required";
      }
    },
  });

  if (!isConfirmed) return null;
  return value.trim();
};
