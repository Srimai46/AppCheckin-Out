import Swal from "sweetalert2";

export const openAttachment = async (fileUrl) => {
  if (!fileUrl) return;

  try {
    // 🔍 ตรวจสอบไฟล์จริงจาก server
    const res = await fetch(fileUrl, { method: "GET" });
    const contentType = (res.headers.get("content-type") || "").toLowerCase();

    // =====================
    // 🖼 IMAGE
    // =====================
    if (contentType.startsWith("image/")) {
      Swal.fire({
        imageUrl: fileUrl,
        imageAlt: "Attachment",
        showConfirmButton: false,
        showCloseButton: true,
        background: "#ffffff", // ❗ กันหน้าดำ
      });
      return;
    }

    // =====================
    // 📄 PDF
    // =====================
    if (contentType.includes("application/pdf")) {
      Swal.fire({
        html: `
          <iframe
            src="${fileUrl}#toolbar=0&navpanes=0"
            class="w-full h-[80vh] rounded-xl bg-white"
            frameborder="0">
          </iframe>
        `,
        width: "80%",
        showConfirmButton: false,
        showCloseButton: true,
        background: "#ffffff",
      });
      return;
    }

    // =====================
    // ❌ ไม่ใช่ไฟล์
    // =====================
    Swal.fire({
      icon: "error",
      title: "Unable to Open File",
      text: "The link did not return a PDF or image file.",
    });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "An Error Occurred",
        text: "Unable to load the file from the server.",
    });
  }
};
