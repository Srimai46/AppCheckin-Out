export default {
  employeeList: {
    title: "従業員一覧",
    addNew: "新しい従業員を追加",
    leavePolicy: "休暇ポリシー",

    activeTab: "在籍中",
    resignedTab: "退職済み",

    allRoles: "すべての役割",
    roleWorker: "ワーカー",
    roleHR: "HR",

    searchPlaceholder: "名前、メール、IDで検索",

    colId: "ID",
    colName: "名前",
    colEmail: "メール",
    colRole: "役割",
    colStatus: "ステータス",

    statusWorking: "在籍中",
    statusResigned: "退職済み",

    noEmployees: "従業員が見つかりません",

    page: "ページ",
    prev: "前へ",
    next: "次へ",

    colExport: "エクスポート",
    exportEmployee: "従業員をエクスポート",

    aria: {
      closeRoleDropdown: "役割ドロップダウンを閉じる",
    },

    pagination: {
      label: "ページ {{page}} / {{totalPages}}",
    },

    exportAll: {
      button: "すべてエクスポート",
      buttonTitle: "すべてエクスポート",
      title: "すべてエクスポート",

      workbook: {
        title: "(1) Workbook (.xlsx) をエクスポート — 複数シート",
        desc: "複数の従業員を選択する場合（1従業員につき1シート）",
      },
      employeesList: {
        title: "(2) 従業員リストをエクスポート",
        desc: "従業員リストをエクスポート（csv）",
      },
      note: "* 注意: 複数シートは xlsx が必要です（CSV は複数シート非対応）",
    },
  },
};
