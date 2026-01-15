export default {
  leaveRequest: {
    type: "休暇タイプ",
    none: "なし",

    fullDay: "全日",
    halfMorning: "半日（午前）",
    halfAfternoon: "半日（午後）",

    errors: {
      missingType: "休暇タイプを選択してください。",
      missingDates: "開始日と終了日を両方指定してください。",
      invalidDate: "終了日は開始日より後である必要があります。",
    },

    blockedTitle: "休暇申請がブロックされました",
    blockedMessage: "休日または非稼働日には休暇申請できません。",

    submissionFailed: "申請に失敗しました",

    headerTitle: "休暇申請",
    headerSubtitle: "従業員休暇管理システム",

    step1: "1. 休暇タイプを選択",
    step2: "2. 日付と期間を選択",
    step3: "3. 理由を入力",
    step4: "4. 添付ファイル（任意）",

    start: "開始",
    end: "終了",

    chooseFile: "ファイルを選択",
    removeFile: "ファイルを削除",
    noFileSelected: "ファイルが選択されていません",

    attachNote: "必要に応じて証明書類を添付できます（例：診断書）。",

    placeholderReason: "詳細を入力してください...",

    summaryTitle: "休暇申請の概要",
    summaryReview: "送信前に内容を確認してください。",
    summary: {
      type: "タイプ",
      period: "期間",
      duration: "日数",
      attachment: "添付ファイル",
      reason: "理由",
    },

    confirmTitle: "休暇申請の確認",
    confirmText: "この休暇申請を送信しますか？",
    confirmButton: "申請を送信",

    successTitle: "申請完了",
    successMessage: "休暇申請が送信されました。",

    cancel: "キャンセル",
    submitting: "送信中...",
    submit: "休暇申請を送信",
  },
};
