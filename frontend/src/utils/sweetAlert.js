import Swal from "sweetalert2";

export const alertConfirm = async (title, html, confirmText = "ยืนยัน") => {
  const res = await Swal.fire({
    icon: "question",
    title,
    html,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: "ยกเลิก",
    focusCancel: true,
    buttonsStyling: true,
    reverseButtons: true,
  });
  return res.isConfirmed;
};

export const alertSuccess = async (title, text = "") => {
  return Swal.fire({ icon: "success", title, text });
};

export const alertError = async (title, text = "") => {
  return Swal.fire({ icon: "error", title, text });
};