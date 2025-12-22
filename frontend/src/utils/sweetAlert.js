import Swal from "sweetalert2";

export const alertConfirm = async (title, html, confirmText = "ยืนยัน") => {
  const res = await Swal.fire({
    icon: "question",
    title,
    html,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: "ยกเลิก",
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
    icon: "error",
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
