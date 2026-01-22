export default {
  translation: {
    /* -------- Dashboard -------- */
    dashboard: {
      title: "แดชบอร์ด",
      attendance: "เช็คชื่อ",
      welcome: "ยินดีต้อนรับ {{firstName}} {{lastName}}",
      selectYear: "เลือกปี",
      year: "ปี",

      checkIn: "เช็กอิน",
      checkOut: "เช็กเอาต์",
      updatecheckOut: "อัปเดตเวลาออก",
      leave: "ลา",

      attendanceConfirmTitle: "ยืนยันการลงเวลา",
      attendanceConfirmText: "คุณต้องการ {{action}} ใช่หรือไม่",
      loadFail: "ไม่สามารถโหลดข้อมูลแดชบอร์ดได้",
      updatecheckOutsweetalert: "อัปเดตเวลาออกหรือไม่",
      updatecheckOutsweetalertconfirm: "คุณได้เช็กเอาต์แล้ว ต้องการอัปเดต (เช็กเอาต์ใหม่) หรือไม่",
      alertcheckinfirst: "กรุณาเช็กอินก่อน",
      alertcheckedinalready: "คุณได้เช็กอินสำหรับวันนี้แล้ว",
      checkedsuccess:"เช็กอินสำเร็จ",

    },

    /* -------- Layout / Sidebar -------- */
    layout: {
      mainMenu: "เมนูหลัก",
      hrManagement: "จัดการฝ่ายบุคคล",
      approveLeave: "อนุมัติการลา",
      employees: "รายชื่อพนักงาน",
      calendar: "ปฏิทิน",
      yearEnd: "ตั้งค่าระบบ",
      logout: "ออกจากระบบ",
      auditLog: "บันทึกการตรวจสอบ",
    },

    /* -------- Common -------- */
    common: {
      loading: "กำลังโหลด...",
      success: "สำเร็จ",
      error: "เกิดข้อผิดพลาด",

      yes: "ใช่",
      no: "ไม่ใช่",
      save: "บันทึก",
      delete: "ลบ",
      confirm: "ยืนยัน",
      cancel: "ยกเลิก",

      days: "วัน",
      unlimited: "ไม่จำกัด",
      today: "วันนี้",
      page: "หน้า",
      showing: "แสดง",
      of: "จาก",

      prev: "ก่อนหน้า",
      next: "ถัดไป",
      back: "กลับ",

      close: "ปิด",

      daysShort: "วัน",

      // Alerts / Validation
      missingInfo: "ข้อมูลไม่ครบถ้วน",
      invalidValue: "ค่าที่กรอกไม่ถูกต้อง",
      saveFailed: "บันทึกไม่สำเร็จ",
      deleteFailed: "ลบไม่สำเร็จ",
      systemError: "เกิดข้อผิดพลาดของระบบ",
    },

    /* -------- QuotaCard -------- */
    quota: {
      noData: "ไม่พบข้อมูลโควต้าการลาในช่วงเวลานี้",
      carryOver: "ทบมา",
      used: "ใช้ไป",
      specialUsage: "การใช้วันลาพิเศษ",
      days: "วัน",
      usedTotal: "ใช้ไป {{used}} / ทั้งหมด {{total}}",
      carriedDetail: "({{base}} สิทธิปีนี้ + {{carry}} ทบมา)",
    },

    /* -------- History -------- */
    history: {
      attendanceLog: "ประวัติการลงเวลา",
      leaveHistory: "ประวัติการลา",
      tabAttendance: "การลงเวลา",
      tabLeave: "การลา",

      date: "วันที่",
      inOut: "เข้า / ออก",
      status: "สถานะ",
      statusIn: "สถานะเข้า",
      statusOut: "สถานะออก",
      signedBy: "ดำเนินการโดย",
      type: "ประเภท",
      period: "ช่วงเวลา",
      days: "จำนวนวัน",
      note: "หมายเหตุ",
      file: "ไฟล์แนบ",

      noData: "ไม่พบข้อมูล",
      filter: "ตัวกรอง",
      clear: "ล้างค่า",
      selectDate: "เลือกวันที่",

      // Status Badges
      late: "สาย",
      onTime: "ตรงเวลา",
      absent: "ขาดงาน",
      leave: "ลา",
      early: "ออกก่อน",
      normal: "ปกติ",
      noCheckout: "ไม่ลงชื่อออก",
      notCheckedOutYet: "ยังไม่ลงชื่อออก",
      waitingForHr: "รอฝ่ายบุคคล",

      deleteTitle: "ลบรายการลา?",
      deleteText: "คุณแน่ใจหรือไม่ที่จะลบรายการนี้?<br/><b>{{type}}</b>",
      deleteButton: "ลบรายการ",
      requestCancelButton: "ขอยกเลิก",
    },

    /* -------- Leave Approval -------- */
    leaveApproval: {
      title: "รายการรอดำเนินการ",
      selected: "เลือกแล้ว {{count}} รายการ",
      bulkApprove: "อนุมัติที่เลือก",
      bulkSpecial: "อนุมัติพิเศษที่เลือก",
      bulkReject: "ปฏิเสธที่เลือก",

      table: {
        employee: "พนักงาน",
        type: "ประเภท",
        reason: "หมายเหตุ / เหตุผล",
        duration: "ระยะเวลา",
        evidence: "หลักฐาน",
        action: "ดำเนินการ",
      },

      loading: "กำลังซิงโครไนซ์ข้อมูล...",
      noData: "ไม่มีรายการรอดำเนินการ",
      ref: "อ้างอิง: #{{id}}",
      days: "วัน",
      noFile: "ไม่มีไฟล์",

      actions: {
        approve: "อนุมัติแล้ว",
        special: "อนุมัติพิเศษ",
        reject: "ปฏิเสธแล้ว",
      },

      tooltips: {
        viewAttachment: "ดูไฟล์แนบ",
        approve: "อนุมัติ",
        special: "อนุมัติเป็นกรณีพิเศษ",
        reject: "ปฏิเสธ",
      },

      labels: {
        reason: "เหตุผล",
        cancelReason: "เหตุผลที่ยกเลิก",
        note: "หมายเหตุ",
      },

      cancellationRequests: "รายการขอยกเลิก",
      newrequest: "คำขอใหม่",

      selectionEmptyTitle: "ไม่ได้เลือกรายการ",
      selectionEmptyText: "กรุณาเลือกอย่างน้อยหนึ่งรายการ",

      confirmTitle: "ยืนยันการ{{action}}",
      confirmText: "คุณแน่ใจหรือไม่ว่าต้องการ{{action}}จำนวน {{count}} รายการ?",

      processed: "ดำเนินการเรียบร้อยแล้ว {{count}} รายการ",
      actionFailed: "การดำเนินการล้มเหลว",

      actionText: {
        approve: "อนุมัติ",
        special: "อนุมัติพิเศษ",
        reject: "ปฏิเสธ",
      },

      tabs: {
        new: "คำขอใหม่",
        cancel: "คำขอที่ยกเลิก",
      },
    },

    /* -------- Special Holidays -------- */
    specialHoliday: {
      title: "วันหยุดพิเศษ",
      subtitle: "เพิ่ม / แก้ไขวันหยุด และมีผลทันที",

      form: {
        holidayName: "ชื่อวันหยุด",
        startDate: "วันที่เริ่ม",
        endDate: "วันที่สิ้นสุด",
        duration: "ระยะเวลา",
        day: "วัน",
        days: "วัน",
        pickStartDate: "เลือกวันที่เริ่ม",
        pickEndDate: "เลือกวันที่สิ้นสุด",
        add: "เพิ่ม",
        update: "อัปเดต",
        cancelEdit: "ยกเลิกการแก้ไข",
        close: "ปิด",
      },

      table: {
        title: "ประวัติวันหยุดพิเศษ",
        subtitle: "วัน-เดือน-ปี (จำนวนวัน), ชื่อ, แก้ไข, ลบ",
        date: "วันที่",
        name: "ชื่อวันหยุด",
        actions: "การจัดการ",
        empty: "ยังไม่มีวันหยุดพิเศษ",
      },

      pagination: {
        page: "หน้า",
        showing: "แสดง",
        of: "จาก",
        prev: "ก่อนหน้า",
        next: "ถัดไป",
      },

      action: {
        addHoliday: "เพิ่มวันหยุด",
        edit: "แก้ไข",
        delete: "ลบ",
      },

      confirm: {
        addTitle: "ยืนยันการเพิ่มหรือไม่?",
        updateTitle: "ยืนยันการแก้ไขหรือไม่?",
        deleteTitle: "ลบวันหยุดนี้หรือไม่?",
      },
      toast: {
        added: "เพิ่มวันหยุดเรียบร้อยแล้ว",
        updated: "อัปเดตวันหยุดเรียบร้อยแล้ว",
        deleted: "ลบวันหยุดเรียบร้อยแล้ว",
      },
    },

    /* -------- Leave Type -------- */
    leaveType: {
      table: {
        title: "ประเภทการลา",
        subtitle: "จัดการประเภทการลา การจ่ายเงิน และข้อจำกัด",
        name: "ประเภทการลา",
        paid: "ได้รับค่าจ้าง",
        maxCarryOver: "ทบต่อปีหน้าได้สูงสุด",
        maxConsecutive: "ลาติดต่อกันสูงสุด",
        actions: "การจัดการ",
        color: "สี",
      },

      action: {
        add: "เพิ่มประเภทการลา",
        edit: "แก้ไข",
        delete: "ลบ",
        color: "เปลี่ยนสี",
      },

      form: {
        typeName: "ชื่อประเภทการลา",
        paid: "ได้รับค่าจ้าง",
        labelTh: "ชื่อ (ภาษาไทย)",
        labelEn: "ชื่อ (ภาษาอังกฤษ)",
        labelJa: "ชื่อ (ภาษาญี่ปุ่น)",
        maxCarryOver: "ทบต่อไปปีหน้าได้สูงสุด (วัน)",
        maxConsecutive: "ลาติดต่อกันสูงสุด (วัน)",
        cancelEdit: "ยกเลิกการแก้ไข",
        editTitle: "แก้ไขประเภทวันลา",
        addTitle: "เพิ่มประเภทวันลา",
        subtitle: "เพิ่ม / แก้ไข ประเภทการลา และมีผลทันที",
        add: "เพิ่ม",
        update: "อัปเดต",
        close: "ปิด",
        color: "สีประเภทวันลา",

        // validation text
        requiredLabel: "กรุณากรอกข้อมูลให้ครบถ้วน",
        invalidNumber: "ค่าตัวเลขต้องมากกว่าหรือเท่ากับ 0",
      },

      color: {
        title: "สีประเภทวันลา",
        subtitle: "เลือกสีสำหรับประเภทวันลานี้",
        current: "สีปัจจุบัน",
        pick: "เลือกสี",
        presets: "สีแนะนำ",
        save: "บันทึก",
        confirmTitle: "ยืนยันการเปลี่ยนสี",
        confirmMessage: 'ต้องการเปลี่ยนสีของ "{{name}}" ใช่หรือไม่?',
        saved: "อัปเดตสีเรียบร้อยแล้ว",
      },

      // confirm popups
      confirm: {
        addTitle: "ยืนยันการเพิ่มประเภทการลา",
        addMessage: "คุณต้องการเพิ่มประเภทการลานี้ใช่หรือไม่",
        updateTitle: "ยืนยันการแก้ไขประเภทการลา",
        updateMessage: "คุณต้องการบันทึกการแก้ไขใช่หรือไม่",
        deleteTitle: "ยืนยันการลบประเภทการลา",
        deleteMessage: 'คุณต้องการลบ "{{name}}" ใช่หรือไม่',
      },

      // success messages
      success: {
        created: "เพิ่มประเภทการลาเรียบร้อยแล้ว",
        updated: "อัปเดตประเภทการลาเรียบร้อยแล้ว",
        deleted: "ลบประเภทการลาเรียบร้อยแล้ว",
      },
    },

    /* -------- SweetAlert -------- */
    sweetAlert: {
      reject: {
        title: "ปฏิเสธคำขอลา",
        label: "เหตุผลในการปฏิเสธ",
        placeholder: "กรุณาระบุเหตุผลในการปฏิเสธ...",
        confirm: "ปฏิเสธ",
        required: "กรุณาระบุเหตุผล",
        requestcancelleave:"ขอยกเลิกการลา",
        reasonforcancellation:"เหตุผลที่ยกเลิก",
        placeholdercancellation:"กรุณาระบุเหตุผลที่ยกเลิก...",
        leaveRequest: "ส่งคำขอ",
        cancelreasonrequired: "กรุณาระบุเหตุผลที่ยกเลิก",
      },
    },

    /* -------- Date Grid Picker -------- */
    dateGridPicker: {
      title: "เลือกวันที่",
      all: "ทั้งหมด",
      allOn: "เลือกทั้งหมด",
      allOff: "ไม่เลือกทั้งหมด",
      year: "ปี",
      month: "เดือน",
      day: "วัน",
      reset: "รีเซ็ต",
      cancel: "ยกเลิก",
      done: "ตกลง",
    },

    /* -------- Leave Request -------- */
    leaveRequest: {
      type: "ประเภทการลา",
      none: "ไม่มี",

      fullDay: "เต็มวัน",
      halfMorning: "ครึ่งวัน (เช้า)",
      halfAfternoon: "ครึ่งวัน (บ่าย)",

      loadingTypes: "กำลังโหลดประเภทการลา...",

      startDate: "วันที่เริ่ม",
      endDate: "วันที่สิ้นสุด",
      pickStartDate: "เลือกวันที่เริ่ม",
      pickEndDate: "เลือกวันที่สิ้นสุด",

      browse: "เลือกไฟล์",

      errors: {
        missingType: "กรุณาเลือกประเภทการลา",
        missingDates: "กรุณาระบุวันที่เริ่มและวันที่สิ้นสุด",
        invalidDate: "วันที่สิ้นสุดต้องมากกว่าวันที่เริ่ม",
        loadTypesFailed: "ไม่สามารถโหลดประเภทการลาได้",
        endBeforeStart: "วันที่สิ้นสุดต้องไม่ก่อน {{min}}",
      },

      blockedTitle: "ไม่สามารถทำรายการได้",
      blockedMessage: "ไม่สามารถขอลาในวันหยุดหรือวันที่ไม่ใช่วันทำงาน",

      submissionFailed: "ส่งคำขอไม่สำเร็จ",
      sumbitfailedtext:"ไม่สามารถขอลาในวันหยุด/วันไม่ทำงาน",

      headerTitle: "ยื่นคำขอลา",
      headerSubtitle: "ระบบจัดการการลาของพนักงาน",

      step1: "1. เลือกประเภทการลา",
      step2: "2. เลือกวันที่และระยะเวลา",
      step3: "3. เหตุผล",
      step4: "4. ไฟล์แนบ (ถ้ามี)",

      start: "เริ่มต้น",
      end: "สิ้นสุด",

      chooseFile: "เลือกไฟล์",
      removeFile: "ลบไฟล์",
      noFileSelected: "ยังไม่ได้เลือกไฟล์",

      attachNote: "คุณสามารถแนบเอกสารประกอบได้ (เช่น ใบรับรองแพทย์)",

      placeholderReason: "กรุณาระบุรายละเอียด...",

      summaryTitle: "สรุปคำขอการลา",
      summaryReview: "กรุณาตรวจสอบรายละเอียดก่อนยืนยัน",
      summary: {
        type: "ประเภท",
        period: "ช่วงเวลา",
        duration: "ระยะเวลา",
        attachment: "ไฟล์แนบ",
        reason: "เหตุผล",
      },

      confirmTitle: "ยืนยันคำขอการลา",
      confirmText: "คุณต้องการส่งคำขอการลานี้ใช่หรือไม่?",
      confirmButton: "ส่งคำขอ",
      successTitle: "ส่งคำขอสำเร็จ",
      successMessage: "คำขอการลาของคุณถูกส่งเรียบร้อยแล้ว",

      cancel: "ยกเลิก",
      submitting: "กำลังส่งคำขอ...",
      submit: "ส่งคำขอการลา",
    },

    /* -------- Attendance Dashboard -------- */
    attendanceDashboard: {
      title: "การเข้างาน",
      viewing: "กำลังดูข้อมูลของ:",
      noData: "ไม่มีข้อมูลการเข้างาน",
      selectMonthHint: "เลือกเดือนเพื่อดูปฏิทิน",
      allYear: "ทั้งปี {{year}}",

      workingDays: "วันทำงาน",
      presentExpected: "มาทำงาน / ทั้งหมด",
      late: "การมาสาย",
      early: "การออกก่อนเวลา",
      leave: "การลาที่อนุมัติแล้ว",
      absent: "การขาดงาน",
      daysTaken: "จำนวนวันที่ใช้",
      unexcused: "ขาดงานโดยไม่แจ้ง",
      minutes: "นาที",

      present: "มาทำงาน",
      attendanceRatio: "อัตราการเข้างาน",
      leaveTypes: "ประเภทการลา",

      subtitle: "ภาพรวมการเข้างาน",
      filterAll: "ทั้งหมดของปี {{year}}",
      clear: "ล้างข้อมูล",
      selectPeriod: "เลือกช่วงเวลา",
      loading: "กำลังโหลดสถิติ...",
      noDataFound: "ไม่พบข้อมูลการเข้างาน",
      yearlyView: "มุมมองรายปี",
      calendar: "ปฏิทินเดือน {{month}}",

      stat: {
        workingDays: "วันทำงาน",
        presentExpected: "มาทำงาน / ทั้งหมด",
        late: "สาย",
        earlyLeave: "ออกก่อนเวลา",
        leaves: "ลา",
        absences: "ขาดงาน",
        approved: "อนุมัติแล้ว",
        unexcused: "ไม่แจ้ง",
        minutes: "นาที",
      },

      ratio: "Attendance Ratio",

      legend: {
        holiday: "วันหยุด",
        absent: "ขาดงาน",
        late: "สาย",
        leave: "ลา",
        early: "ออกก่อนเวลา",
      },

      weekdays: {
        sun: "อา.",
        mon: "จ.",
        tue: "อ.",
        wed: "พ.",
        thu: "พฤ.",
        fri: "ศ.",
        sat: "ส.",
      },
    },

    yearEndConfig: {
      title: "ตั้งค่าปลายปี",
      subtitle: "ตั้งค่าการโอนสิทธิ์คงเหลือ โควตา และนโยบายรวมของระบบ",

      carryOverTitle: "การโอนสิทธิ์คงเหลือของประเภทการลา",
      carryOverHint: "จำนวนวันสูงสุดที่สามารถโอนไปปีถัดไปได้ (ต่อพนักงาน)",

      quotaTitle: "ตั้งค่าโควตาสำหรับปี {{year}}",
      quotaHint: "โควตาพื้นฐานต่อพนักงาน",

      maxConsecutiveTitle: "นโยบายรวม: วันหยุดต่อเนื่องสูงสุด",
      unlimitedHint: "0 = ไม่จำกัด",

      targetYear: "ปีเป้าหมาย",
      yearLabel: "ปี {{year}}",

      process: "ยืนยันและประมวลผล",
      processing: "กำลังประมวลผล...",

      warning:
        "การดำเนินการนี้จะเขียนทับโควตาของพนักงานทั้งหมดและล็อกข้อมูลย้อนหลัง",
    },

    employeeDetail: {
      loading: "กำลังโหลดข้อมูลพนักงาน...",
      working: "กำลังทำงาน",
      resigned: "ลาออกแล้ว",
      joined: "วันที่เข้าทำงาน",
      manageInfo: "จัดการข้อมูล",
      leaveBalance: "ยอดลาคงเหลือ",
      employeeInfo: "ข้อมูลพนักงาน",
      fullAccess: "สิทธิ์การเข้าถึงทั้งหมด (Full Access)",
      standardAccess: "สิทธิ์การเข้าถึงทั่วไป (Standard Access)",
      roleNote: "หมายเหตุ: การเปลี่ยนบทบาทจะส่งผลต่อสิทธิ์การเข้าใช้งานระบบ",
      newPassword: "รหัสผ่านใหม่",
      passwordOptional: "(เว้นว่างไว้หากไม่ต้องการเปลี่ยน)",
      passwordMin: "อย่างน้อย 6 ตัวอักษร",
      confirmPassword: "ยืนยันรหัสผ่าน",
      confirmPasswordPlaceholder: "กรอกรหัสผ่านใหม่อีกครั้ง",
      terminate: "สิ้นสุดการจ้างงาน",
      reinstate: "กลับเข้าทำงาน",
      adjustQuota: "ปรับโควต้า",
      fetchFailed: "ไม่สามารถเรียกข้อมูลพนักงานได้",
      quotaUpdated: "อัปเดตโควต้าสำเร็จ",
      quotaFailed: "อัปเดตโควต้าล้มเหลว",
      passwordMismatch: "รหัสผ่านไม่ตรงกัน",
      infoUpdated: "อัปเดตข้อมูลเรียบร้อยแล้ว",
    },

    employeeList: {
      title: "รายชื่อพนักงาน",
      addNew: "เพิ่มพนักงานใหม่",
      leavePolicy: "นโยบายการลา",

      activeTab: "พนักงานปัจจุบัน",
      resignedTab: "พนักงานที่ลาออก",

      allRoles: "ทุกบทบาท",
      roleWorker: "พนักงานทั่วไป",
      roleHR: "HR",

      allDepartments: "ทุกแผนก",
      departmentUnassigned: "ไม่ระบุแผนก",

      searchPlaceholder: "ค้นหาด้วยชื่อ, อีเมล หรือ รหัส",

      colId: "รหัส",
      colName: "ชื่อ",
      colEmail: "อีเมล",
      colDepartment: "แผนก",
      colRole: "บทบาท",
      colStatus: "สถานะ",
      
      statusWorking: "กำลังทำงาน",
      statusResigned: "ลาออกแล้ว",

      noEmployees: "ไม่พบข้อมูลพนักงาน",

      page: "หน้า",
      prev: "ก่อนหน้า",
      next: "ถัดไป",

      colExport: "ส่งออก",
      exportEmployee: "ส่งออกข้อมูลพนักงาน",

      aria: { closeRoleDropdown: "ปิดรายการเลือกบทบาท" },

      pagination: { label: "หน้า {{page}} / {{totalPages}}" },

      exportAll: {
        button: "ส่งออกทั้งหมด",
        buttonTitle: "ส่งออกข้อมูลพนักงานทั้งหมด",
        title: "ส่งออกทั้งหมด",

        workbook: {
          title: "(1) ส่งออกไฟล์ Workbook (.xlsx) — แยกชีท",
          desc: "สำหรับเลือกพนักงานหลายคน (1 พนักงานต่อ 1 ชีท)",
        },

        employeesList: {
          title: "(2) ส่งออกรายชื่อพนักงาน",
          desc: "สำหรับส่งออกเฉพาะรายชื่อพนักงาน (csv)",
        },

        note: "* หมายเหตุ: การแยกหลายชีทต้องใช้ไฟล์ xlsx เท่านั้น (CSV ไม่สามารถมีหลายชีทได้)",
      },
    },

    employeeCreate: {
      title: "ข้อมูลพนักงาน",

      firstName: "ชื่อ",
      firstNamePlaceholder: "กรุณากรอกชื่อ",
      lastName: "นามสกุล",
      lastNamePlaceholder: "กรุณากรอกนามสกุล",
      email: "อีเมล",
      emailPlaceholder: "กรุณากรอกอีเมล",

      role: "ตำแหน่ง",
      workerAccess: "สิทธิ์มาตรฐาน",
      hrAccess: "สิทธิ์เต็ม",
      roleNote: "หมายเหตุ: การเปลี่ยนตำแหน่งมีผลต่อสิทธิ์การใช้งานในระบบ",

      department: "แผนก",
      departmentNote: "เลือกแผนกของพนักงาน",

      joinDate: "วันที่เข้าทำงาน",
      pickJoinDate: "เลือกวันที่เข้าทำงาน",

      password: "รหัสผ่าน",
      passwordHint: "อย่างน้อย 6 ตัวอักษร",

      confirmTitle: "ยืนยันการลงทะเบียน",
      confirmButton: "ลงทะเบียน",
      cancel: "ยกเลิก",
      submit: "ลงทะเบียน",
      processing: "กำลังดำเนินการ...",

      roleWorker: "พนักงาน",
      roleHR: "ฝ่ายบุคคล",
      selected: "เลือกแล้ว",

      confirmReviewTitle: "โปรดตรวจสอบข้อมูลด้านล่าง",
      successText: "เพิ่มพนักงานใหม่สำเร็จ",

      success: "สำเร็จ",
      failed: "ไม่สำเร็จ",

      loadingOptions: "กำลังโหลดข้อมูล...",
      loadOptionsFailed: "โหลดข้อมูลตำแหน่ง/แผนกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
      noRoles: "ไม่พบข้อมูลตำแหน่ง",
      noDepartments: "ไม่พบข้อมูลแผนก",

      confirmName: "ชื่อ",
      confirmSurname: "นามสกุล",
      confirmEmail: "อีเมล",
      confirmRole: "ตำแหน่ง",
      confirmDepartment: "แผนก",
      confirmJoinDate: "วันที่เข้าทำงาน",

      fetchErrorFallback: "เกิดข้อผิดพลาดระหว่างดึงข้อมูล กรุณาลองใหม่อีกครั้ง",
      unexpectedErrorFallback: "เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง",

      aria: {
        closeDepartmentDropdown: "ปิดเมนูเลือกแผนก",
      },
    },

    workingDays: {
      title: "วันทำงาน",
      subtitle: "เลือกวันทำงานและบันทึกนโยบาย",

      loading: "กำลังโหลดนโยบายวันทำงาน...",
      currently: "ปัจจุบัน:",

      saveBtn: "บันทึก",
      savingBtn: "กำลังบันทึก...",
      loadingBtn: "กำลังโหลด...",

      mon: "จ.",
      tue: "อ.",
      wed: "พ.",
      thu: "พฤ.",
      fri: "ศ.",
      sat: "ส.",
      sun: "อา.",

      confirmTitle: "บันทึกวันทำงานหรือไม่?",
      confirmSubtitle: "ยืนยันวันทำงาน",
      savedText: "อัปเดตวันทำงานเรียบร้อยแล้ว",
    },

    workTimeByRole: {
      title: "เวลาทำงาน (ตามบทบาท)",
      subtitle: "ตั้งเวลาเช็คอิน / เช็คเอาท์ สำหรับแต่ละบทบาท",

      roleHR: "HR",
      roleWorker: "พนักงานทั่วไป",

      checkIn: "เวลาเข้างาน",
      checkOut: "เวลาเลิกงาน",

      current: "ปัจจุบัน:",

      saveBtn: "บันทึกเวลาทำงาน",
      savingBtn: "กำลังบันทึก...",

      confirmTitle: "บันทึกเวลาทำงานหรือไม่?",
      savedText: "บันทึกเวลาทำงานเรียบร้อยแล้ว",
    },

    /* -------- Max Consecutive -------- */
    maxConsecutive: {
      title: "กำหนดวันหยุดต่อเนื่องสูงสุด",
      subtitle: "จำนวนวันหยุดต่อเนื่องสูงสุดที่อนุญาตต่อการขอ 1 ครั้ง",

      confirmTitle: "บันทึกจำนวนวันหยุดต่อเนื่องสูงสุดหรือไม่?",
      savedText: "อัปเดตเรียบร้อยแล้ว",
    },

    /* -------- YearEnd History -------- */
    yearEndHistory: {
      title: "ประวัติการประมวลผล",
      year: "ปี",
      lockStatus: "สถานะการล็อค",
      processedAt: "ประมวลผลเมื่อ",
      action: "การกระทำ",
      closed: "ปิดงวดแล้ว",
      open: "ยังไม่ปิดงวด",
      unlock: "ปลดล็อคปีนี้",
      empty: "ไม่มีประวัติการประมวลผล",
    },

    /* -------- YearEnd Policy -------- */
    yearEndPolicy: {
      title: "Holiday Policy & Special Holidays",
      subtitle: "Configure working days and manage special holidays.",

      buttons: {
        add: "Add",
        update: "Update",
      },

      confirm: {
        saveWorkingDaysTitle: "Save working days?",
        saveWorkTimeTitle: "Save work time?",
        saveMaxConsecutiveTitle: "Save max consecutive holidays?",
        addHolidayTitle: "Confirm add?",
        updateHolidayTitle: "Confirm update?",
        deleteHolidayTitle: "Delete this holiday?",
      },

      success: {
        workingDaysSaved: "Working days updated.",
        workTimeSaved: "Work time saved.",
        maxConsecutiveSaved: "Updated.",
        holidayAdded: "Holidays added.",
        holidayUpdated: "Holiday updated.",
        holidayDeleted: "Holiday removed.",
      },

      errors: {
        loadWorkingDaysFailed: "Failed to load working days. {{msg}}",
        pickAtLeastOneDay: "Select at least 1 day.",
        invalidTime: "Invalid time: {{role}}",
        invalidRange: "Invalid time range: {{role}}",
        invalidLimit: "Invalid limit.",
        missingHolidayName: "Enter at least 1 language.",
        missingDate: "Missing date.",
        invalidRangeGeneric: "Invalid range.",
      },
    },

    yearEndProcess: {
      title: "การประมวลผลสิ้นปีและกำหนดโควต้า",
      subtitle: "ยกยอดวันลาคงเหลือและกำหนดโควต้าปีใหม่ในขั้นตอนเดียว",
    },

    teamCalendar: {
      title: "ปฏิทินทีม",
      subtitle: "ดูการลาของทีมและวันหยุดพิเศษ",
      actions: {
        todayOverview: "ภาพรวมวันนี้ ({{count}})",
        today: "วันนี้",
        prevMonth: "เดือนก่อนหน้า",
        nextMonth: "เดือนถัดไป",
        openDay: "ดูรายละเอียด",
        close: "ปิด",
        refresh: "รีเฟรช",
        clear: "ล้าง",
      },
      filters: {
        leaveTypesLabel: "ประเภทการลา",
        allTypes: "ทั้งหมด",
        leaveTypes: {
          sick: "ลาป่วย",
          vacation: "ลาพักร้อน",
          personal: "ลากิจ",
        },
        roleLabel: "บทบาท",
        allRoles: "ทุกบทบาท",
        searchPlaceholder: "ค้นหาชื่อ / อีเมล...",
      },
      tabs: {
        pending: "รออนุมัติ",
        approved: "อนุมัติแล้ว",
        rejected: "ปฏิเสธแล้ว",
      },
      week: {
        sun: "อา.",
        mon: "จ.",
        tue: "อ.",
        wed: "พ.",
        thu: "พฤ.",
        fri: "ศ.",
        sat: "ส.",
      },
      hints: {
        lateRule: "* กฎการสาย: หลังเวลา {{time}} หากยังไม่เช็คอินจะถือว่า “สาย”",
      },
      loading: {
        calendar: "กำลังโหลดปฏิทิน...",
        modal: "กำลังโหลดรายละเอียด...",
        attendance: "กำลังโหลดข้อมูลการเข้างาน...",
      },
      grid: { loading: "กำลังโหลด...", moreTypes: "+อีก {{count}} ประเภท" },
      status: {
        pending: "รออนุมัติ",
        approved: "อนุมัติแล้ว",
        rejected: "ปฏิเสธแล้ว",
        cancelled: "ยกเลิกแล้ว",
        withdrawn: "ถอนคำขอแล้ว",
      },
      attendance: {
        title: "การเช็คอิน / เช็คเอาท์ ของทีม (วันนี้)",
        subtitle:
          "ทั้งหมด {{total}} • เช็คอินแล้ว {{checkedIn}} • สาย {{late}} • เช็คเอาท์แล้ว {{checkedOut}}",
        cards: {
          checkedIn: "เช็คอินแล้ว",
          late: "สาย",
          checkedOut: "เช็คเอาท์แล้ว",
        },
        searchPlaceholder: "ค้นหาชื่อ, อีเมล, รหัสพนักงาน...",
        table: {
          employee: "พนักงาน",
          role: "บทบาท",
          in: "เข้า",
          out: "ออก",
          statusIn: "สถานะเข้า",
          statusOut: "สถานะออก",
          actions: "การกระทำ",
        },
        loading: "กำลังโหลดข้อมูลการเข้างาน...",
        empty: {
          activeNone: "ไม่มีข้อมูลการเข้างานของพนักงาน",
          noMatch: "ไม่พบพนักงานที่ค้นหา",
        },
        unknown: "ไม่ระบุ",
        buttons: {
          saving: "กำลังบันทึก...",
          checkIn: "เช็คอิน",
          checkOut: "เช็คเอาท์",
        },
        statusIn: {
          onTime: "ตรงเวลา",
          late: "สาย",
          leave: "ลา",
          waiting: "รอเช็คอิน",
          normal: "ปกติ",
        },
        statusOut: {
          none: "-",
          normal: "ปกติ",
          earlyLeave: "ออกก่อนเวลา",
          noCheckout: "ไม่เช็คเอาท์",
          leave: "ลา",
        },
        pagination: {
          label: "หน้า {{page}} / {{totalPages}} • แสดง {{start}}-{{end}} จาก {{total}}",
        },
      },

      // Daily Detail Modal
      modal: {
        title: "รายละเอียดรายวัน",
        pills: {
          checkedIn: "เช็คอินแล้ว",
          late: "สาย",
          absent: "ขาดงาน",
          onLeave: "ลา",
        },
        nav: {
          prevDay: "วันก่อนหน้า",
          nextDay: "วันถัดไป",
          goToday: "ไปที่วันนี้",
        },
        tabs: {
          pending: "รอการอนุมัติ",
          approved: "อนุมัติแล้ว",
          rejected: "ปฏิเสธแล้ว",
        },
        role: { all: "ทุกบทบาท", worker: "พนักงานทั่วไป", hr: "HR" },
        searchPlaceholder: "ค้นหาชื่อ, อีเมล, รหัส...",
        table: {
          employee: "พนักงาน",
          type: "ประเภท",
          noteReason: "หมายเหตุ / เหตุผล",
          duration: "ระยะเวลา",
          evidence: "หลักฐาน",
          action: "การกระทำ",
          approvedBy: "อนุมัติโดย",
          rejectedBy: "ปฏิเสธโดย",
        },
        loading: "กำลังซิงค์ข้อมูล...",
        noData: "ไม่มีข้อมูล",
        noFile: "ไม่มีไฟล์",
        ref: "อ้างอิง: #{{id}}",
        tooltips: {
          viewAttachment: "ดูไฟล์แนบ",
          approve: "อนุมัติ",
          special: "อนุมัติกรณีพิเศษ",
          reject: "ปฏิเสธ",
        },
        actions: {
          approve: "อนุมัติแล้ว",
          special: "พิเศษ",
          reject: "ปฏิเสธแล้ว",
          approveFull: "อนุมัติปกติ",
          specialFull: "อนุมัติพิเศษ (ไม่หักวันลา)",
          rejectFull: "ปฏิเสธ",
        },
        confirm: {
          title: "ยืนยัน {{action}}",
          text: "ต้องการดำเนินการคำขอของ <b>{{name}}</b> เป็น <b>{{action}}</b> ใช่หรือไม่?",
        },
        toast: {
          processedOne: "ดำเนินการ 1 คำขอสำเร็จ",
          actionFailedTitle: "ดำเนินการล้มเหลว",
          unknownError: "เกิดข้อผิดพลาดไม่ทราบสาเหตุ",
        },
        hrNameHint:
          "* แท็บที่อนุมัติ/ปฏิเสธแล้วจะแสดงชื่อ HR หากข้อมูลจากระบบรองรับ",
        specialReasonPrefix: "การอนุมัติกรณีพิเศษ",
        noReason: "ไม่มีเหตุผล",
        reasonTitle: "เหตุผล: {{reason}}",
        noteTitle: "หมายเหตุ: {{note}}",
      },

      exportCsv: {
        openButton: "ส่งออก CSV",
        title: "ส่งออก CSV",

        scope: {
          label: "ขอบเขตข้อมูล (Scope)",
          options: {
            month: "รายเดือน",
            year: "รายปี",
            all: "ทั้งหมด",
          },
        },

        fields: {
          month: "เดือน",
          year: "ปี",
        },

        loading: "กำลังโหลด...",
        typesLoadFailed: "ไม่สามารถโหลดประเภทการลาได้",

        leaveTypes: {
          label: "ประเภทการลา (Leave Types)",
          allTypes: "ทุกประเภท",
          selectedCount: "เลือกไว้ {{count}} ประเภท",
          dropdownTitle: "เลือกประเภท",
          selectAll: "เลือกทั้งหมด",
          clear: "ล้างค่า",
        },

        found: "พบข้อมูล",
        items: "รายการ",

        download: "ดาวน์โหลด CSV",

        pickerTitle: {
          month: "เลือกเดือนที่ต้องการ",
          year: "เลือกปีที่ต้องการ",
        },
      },
    },

    notificationBell: {
      title: "การแจ้งเตือน",
      readAll: "อ่านทั้งหมด",
      empty: "ไม่มีการแจ้งเตือนใหม่",
      view: "ดู",
      tooltip: {
        openEmployee: "ดูรายละเอียดพนักงาน",
        markRead: "ทำเครื่องหมายว่าอ่านแล้ว",
      },
      aria: { toggle: "เปิด/ปิด การแจ้งเตือน" },
    },

    employeeExport: {
      title: "ส่งออก CSV (พนักงาน)",
      exportType: {
        label: "ประเภทการส่งออก",
        attendance: "การเข้างาน",
        leaveRequests: "คำขอการลา",
      },
      period: {
        label: "ช่วงเวลา",
        daily: "รายวัน",
        monthly: "รายเดือน",
        yearly: "รายปี",
        quarter: "รายไตรมาส",
        customRange: "กำหนดเอง",
        selectDate: "เลือกวันที่",
        selectMonth: "เลือกเดือน",
        selectYear: "เลือกปี",
      },
      quarter: {
        year: "ปี",
        quarter: "ไตรมาส",
        q1: "Q1 (ม.ค.–มี.ค.)",
        q2: "Q2 (เม.ย.–มิ.ย.)",
        q3: "Q3 (ก.ค.–ก.ย.)",
        q4: "Q4 (ต.ค.–ธ.ค.)",
      },
      custom: {
        dateFrom: "จากวันที่",
        dateTo: "ถึงวันที่",
        pickDate: "เลือกวันที่",
      },
      range: { label: "ช่วง:" },
      buttons: { export: "ส่งออก" },
      common: { all: "ทั้งหมด" },
      picker: {
        selectDate: "เลือกวันที่",
        selectMonth: "เลือกเดือน",
        selectYear: "เลือกปี",
        dateFrom: "จากวันที่",
        dateTo: "ถึงวันที่",
      },
      errors: {
        noEmployee: "ไม่พบพนักงาน",
        customIncomplete:
          "กรุณาเลือกทั้งวันที่เริ่มและสิ้นสุดสำหรับช่วงเวลาที่กำหนดเอง",
        endpoint404: "ส่งออกล้มเหลว: ไม่พบ Endpoint ในระบบ (404)",
        exportFailed: "การส่งออกล้มเหลว",
      },
    },

    /* -------- Employees All Export -------- */
    employeesAllExport: {
      title: "ส่งออกข้อมูลพนักงาน (ทั้งหมด)",
      rowsToExport: "จำนวนแถวที่ส่งออก:",
      previewRows: "ตัวอย่างแถว:",
      buttons: { exportCsv: "ส่งออก CSV" },
      filters: {
        label: "ตัวกรอง",
        activeTab: "แท็บพนักงานปัจจุบัน",
        resignedTab: "แท็บพนักงานลาออก",
        role: "บทบาท",
        status: "สถานะ",
        keyword: "คำค้นหา",
        keywordPlaceholder: "ค้นหาจากชื่อ, อีเมล, บทบาท, รหัส...",
      },
      options: { all: "ทั้งหมด", worker: "พนักงานทั่วไป", hr: "HR" },
      status: { active: "เปิดใช้งาน", inactive: "ไม่ได้ใช้งาน" },
      columns: {
        label: "คอลัมน์",
        employeeId: "รหัสพนักงาน",
        firstName: "ชื่อ",
        lastName: "นามสกุล",
        email: "อีเมล",
        role: "บทบาท",
        status: "สถานะ",
        joiningDate: "วันที่เริ่มงาน",
        tip: "คำแนะนำ: ปิดคอลัมน์ที่ไม่ต้องการเพื่อลดขนาดไฟล์",
      },
    },

    xlsxWorkbook: {
      title: "ส่งออกเวิร์กบุ๊ก (XLSX)",
      employeesCount: "จำนวนพนักงาน:",

      workbookType: {
        label: "ประเภทเวิร์กบุ๊ก",
        perEmployee: "แยกตามพนักงาน (หลายชีต)",
        employeesList: "รายชื่อพนักงาน (ชีตเดียว)",
      },

      dataType: {
        label: "ประเภทข้อมูล",
        attendance: "การเข้างาน",
        leave: "คำขอลา",
      },

      period: {
        label: "ช่วงเวลา",
        daily: "รายวัน",
        monthly: "รายเดือน",
        yearly: "รายปี",
        quarter: "ไตรมาส",
        custom: "กำหนดช่วงเอง",
      },

      fields: {
        selectDate: "เลือกวันที่",
        selectMonth: "เลือกเดือน",
        selectYear: "เลือกปี",
        year: "ปี",
        quarter: "ไตรมาส",
        dateFrom: "วันที่เริ่มต้น",
        dateTo: "วันที่สิ้นสุด",
      },

      placeholders: {
        pickDate: "เลือกวันที่",
        pickMonth: "เลือกเดือน",
        pickYear: "เลือกปี",
        pickStart: "เลือกวันที่เริ่มต้น",
        pickEnd: "เลือกวันที่สิ้นสุด",
      },

      rangeLabel: "ช่วง:",

      buttons: {
        exportXlsx: "ส่งออก XLSX",
      },

      quarters: {
        q1: "ไตรมาส 1 (ม.ค.–มี.ค.)",
        q2: "ไตรมาส 2 (เม.ย.–มิ.ย.)",
        q3: "ไตรมาส 3 (ก.ค.–ก.ย.)",
        q4: "ไตรมาส 4 (ต.ค.–ธ.ค.)",
      },

      picker: {
        select: "เลือก",
        selectDate: "เลือกวันที่",
        selectMonth: "เลือกเดือน",
        selectYear: "เลือกปี",
        dateFrom: "วันที่เริ่มต้น",
        dateTo: "วันที่สิ้นสุด",
      },

      errors: {
        noEmployees: "ไม่มีพนักงานสำหรับการส่งออก",
        pickDaily: "กรุณาเลือกวันที่ (รายวัน)",
        pickMonthly: "กรุณาเลือกเดือน (รายเดือน)",
        pickCustom: "กรุณาเลือกทั้งวันที่เริ่มต้นและวันที่สิ้นสุด (กำหนดช่วงเอง)",
        exportFailed: "ไม่สามารถส่งออกเวิร์กบุ๊กได้",
      },
    },

    /* -------- Audit Log Export -------- */
    auditLogExport: {
      title: "ตัวกรองการส่งออก CSV",

      period: {
        label: "ช่วงเวลา",
        daily: "รายวัน",
        monthly: "รายเดือน",
        yearly: "รายปี",
        quarter: "ไตรมาส",
        customRange: "กำหนดช่วงเอง",
        selectDate: "เลือกวันที่",
        selectMonth: "เลือกเดือน",
        selectYear: "เลือกปี",
      },

      quarter: {
        year: "ปี",
        quarter: "ไตรมาส",
        q1: "ไตรมาส 1 (ม.ค.–มี.ค.)",
        q2: "ไตรมาส 2 (เม.ย.–มิ.ย.)",
        q3: "ไตรมาส 3 (ก.ค.–ก.ย.)",
        q4: "ไตรมาส 4 (ต.ค.–ธ.ค.)",
      },

      custom: {
        dateFrom: "วันที่เริ่มต้น",
        dateTo: "วันที่สิ้นสุด",
      },

      range: {
        label: "ช่วง:",
        to: "→",
      },

      filters: {
        model: "โมเดล",
        performedBy: "ดำเนินการโดย",
        keyword: "คำค้นหา (รายละเอียด)",
        recordId: "รหัสรายการ (ไม่บังคับ)",
        actions: "การกระทำ (เลือกหลายรายการ)",
      },

      actions: {
        clearActions: "ล้างการกระทำ",
        noActions: "ยังไม่มีการกระทำให้เลือก",
      },

      preview: {
        rowsToExport: "จำนวนแถวที่จะส่งออก:",
      },

      buttons: {
        export: "ส่งออก",
      },

      common: {
        all: "ทั้งหมด",
        reset: "รีเซ็ต",
      },

      placeholders: {
        date: "YYYY-MM-DD",
        month: "YYYY-MM",
        year: "YYYY",
        keyword: 'เช่น "มาสาย", "อนุมัติ", "ถอนคำขอ"...',
        recordId: "เช่น 6 หรือ 10",
      },

      picker: {
        selectDate: "เลือกวันที่",
        selectMonth: "เลือกเดือน",
        selectYear: "เลือกปี",
        dateFrom: "วันที่เริ่มต้น",
        dateTo: "วันที่สิ้นสุด",
      },
    },

    /* -------- Holiday Policy Errors -------- */
    holidayPolicy: {
      success: {
        savedTitle: "บันทึกสำเร็จ",
        updatedTitle: "อัปเดตสำเร็จ",
        addedTitle: "เพิ่มสำเร็จ",
        deletedTitle: "ลบสำเร็จ",
      },
      
      errors: {
        loadFailedTitle: "โหลดไม่สำเร็จ",
        saveFailedTitle: "บันทึกไม่สำเร็จ",
        invalidTitle: "ข้อมูลไม่ถูกต้อง",
        selectAtLeastOneDay: "กรุณาเลือกอย่างน้อย 1 วัน",
        invalidTimeTitle: "เวลาไม่ถูกต้อง",
        invalidRangeTitle: "ช่วงเวลาไม่ถูกต้อง",
        invalidLimitTitle: "ค่าที่กำหนดไม่ถูกต้อง",
        missingNameTitle: "ไม่มีชื่อวันหยุด",
        enterAtLeastOneLanguage: "กรุณากรอกชื่ออย่างน้อย 1 ภาษา",
        missingDateTitle: "ไม่ได้ระบุวันที่",
        invalidRangeOnlyTitle: "ช่วงวันไม่ถูกต้อง",
      },
    },

    /* -------- Confirm Html (SweetAlert confirm bodies) -------- */
    confirmHtml: {
      common: {
        to: "ถึง",
        daySingular: "วัน",
        dayPlural: "วัน",
      },

      workingDays: {
        subtitle: "ยืนยันวันทำงาน",
      },

      workTime: {
        title: "ยืนยันเวลาเข้างาน (ตามบทบาท)",
      },

      maxConsecutive: {
        title: "ยืนยันจำนวนวันหยุดติดต่อกันสูงสุด",
        label: "จำนวนวันติดต่อกันสูงสุด",
      },

      carryOver: {
        title: "ยืนยันจำนวนวันโอนสิทธิ์ (Carry Over)",
        hint: "คุณกำลังจะบันทึกจำนวนวันโอนสิทธิ์ของแต่ละประเภทการลา (ต่อพนักงาน)",
      },

      holiday: {
        fallbackName: "วันหยุด",
        fields: {
          holiday: "วันหยุด",
          date: "วันที่",
        },
        mode: {
          add: "เพิ่ม",
          update: "แก้ไข",
        },
      },

      holidayUpsert: {
        title: "ยืนยันการ{{mode}}",
      },

      holidayDelete: {
        title: "ยืนยันการลบวันหยุด",
        hint: "การดำเนินการนี้ไม่สามารถย้อนกลับได้",
      },
    },
  },
};
