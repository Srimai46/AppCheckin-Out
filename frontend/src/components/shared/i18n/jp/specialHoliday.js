export default {
  specialHoliday: {
    // Titles
    title: "特別休日",
    subtitle: "従業員ごとの特別休日を管理",

    // Basic actions
    add: "特別休日を追加",
    edit: "特別休日を編集",
    delete: "特別休日を削除",

    // Fields
    name: "休日名",
    date: "日付",
    employee: "従業員",
    type: "種類",
    birthday: "誕生日",
    personal: "個人休日",

    save: "保存",
    cancel: "キャンセル",

    // Status / Loading
    noData: "特別休日が見つかりません。",
    loading: "特別休日を読み込み中...",

    // Confirm delete
    confirmDeleteTitle: "特別休日を削除しますか？",
    confirmDeleteText: '"{{name}}" を削除してもよろしいですか？',

    // Results
    successCreated: "特別休日が追加されました。",
    successUpdated: "特別休日が更新されました。",
    successDeleted: "特別休日が削除されました。",
    failed: "操作に失敗しました。",

    // Form (from second file)
    form: {
      holidayName: "休日名",
      startDate: "開始日",
      endDate: "終了日",
      duration: "日数",
      day: "日",
      days: "日",
      add: "追加",
      update: "更新",
      cancelEdit: "編集をキャンセル",
      close: "閉じる",
    },

    // Table (from second file)
    table: {
      title: "特別休日一覧",
      subtitle: "YYYY/MM/DD（合計日数）、名前、編集、削除",
      date: "日付",
      name: "休日名",
      actions: "操作",
      empty: "特別休日はまだありません。",

      // Pagination (from second file)
      pagination: {
        page: "ページ",
        showing: "表示",
        of: "／",
        prev: "前へ",
        next: "次へ",
      },

      // Action labels (from second file)
      action: {
        addHoliday: "休日を追加",
        edit: "編集",
        delete: "削除",
      },
    },
  },
};
