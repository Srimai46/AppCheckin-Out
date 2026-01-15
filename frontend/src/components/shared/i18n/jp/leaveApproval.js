export default {
  leaveApproval: {
    // Titles
    title: "承認待ち",
    subtitle: "従業員の休暇申請を確認・管理",

    // Bulk actions
    selected: "{{count}} 件選択",
    bulkApprove: "一括承認",
    bulkSpecial: "一括特別承認",
    bulkReject: "一括却下",

    // Table
    table: {
      employee: "従業員",
      type: "種類",
      reason: "申請理由",
      duration: "期間",
      evidence: "添付書類",
      action: "操作",
    },

    // General fields
    employee: "従業員",
    type: "休暇タイプ",
    duration: "期間",
    reason: "理由",
    file: "添付ファイル",
    status: "ステータス",
    date: "日付",
    days: "日",
    noFile: "ファイルなし",
    ref: "参照: #{{id}}",

    // Loading / Empty
    loading: "データ同期中...",
    noData: "承認待ちのタスクはありません",

    // Actions
    approve: "承認",
    reject: "却下",
    cancel: "キャンセル",

    actions: {
      approve: "承認",
      special: "特別",
      reject: "却下",
    },

    // Tooltips
    tooltips: {
      viewAttachment: "添付を表示",
      approve: "承認",
      special: "特別承認",
      reject: "却下",
    },
  },

  // Labels
  labels: {
    reason: "理由",
    cancelReason: "キャンセル理由",
    note: "メモ",
  },

  // Tabs
  tabs: {
    new: "新規申請",
    cancel: "キャンセル申請",
  },

  cancellationRequests: "キャンセル申請",
  newrequest: "新規申請",

  // Selection validation
  selectionEmptyTitle: "未選択",
  selectionEmptyText: "少なくとも 1 件選択してください。",

  // Confirm dialogs
  confirmTitle: "{{action}} の確認",
  confirmText: "{{count}} 件の申請を {{action}} してもよろしいですか？",

  confirmApproveTitle: "休暇申請の承認",
  confirmApproveText: "この申請を承認してもよろしいですか？",

  confirmRejectTitle: "休暇申請の却下",
  confirmRejectText: "却下理由を入力してください。",

  // Results
  processed: "{{count}} 件の申請が正常に処理されました。",
  actionFailed: "操作に失敗しました",
  successApproved: "休暇申請を承認しました。",
  successRejected: "休暇申請を却下しました。",
  failed: "操作に失敗しました。",

  // Action text for dynamic confirm
  actionText: {
    approve: "承認",
    special: "特別承認",
    reject: "却下",
  },
};
