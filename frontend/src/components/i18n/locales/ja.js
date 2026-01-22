export default {
  translation: {
    /* -------- Dashboard -------- */
    dashboard: {
      title: "ダッシュボード",
      attendance: "勤怠", // kintai
      welcome: "ようこそ、{{firstName}} {{lastName}} さん",
      selectYear: "年を選択", // toshi wo sentaku
      year: "年",

      checkIn: "出勤", // shukkin
      checkOut: "退勤", // taikin
      updatecheckOut: "退勤を更新", // taikin wo koushin
      leave: "休暇",

      attendanceConfirmTitle: "打刻の確認",
      attendanceConfirmText: "{{action}} してもよろしいですか？",
      loadFail: "ダッシュボードデータの読み込みに失敗しました。",
      updatecheckOutsweetalert: "チェックアウト時間を更新しますか？",
      updatecheckOutsweetalertconfirm: "すでにチェックアウトされています。更新（再チェックアウト）しますか？",
      alertcheckinfirst: "まずチェックインしてください。",
      alertcheckedinalready: "本日はすでにチェックインしています。",
      checkedsuccess:"チェックイン成功",
    },

    /* -------- Layout / Sidebar -------- */
    layout: {
      mainMenu: "メインメニュー",
      hrManagement: "人事管理",
      approveLeave: "休暇申請承認",
      employees: "従業員一覧",
      calendar: "カレンダー",
      yearEnd: "設定",
      logout: "ログアウト",
      auditLog: "監査ログ",
      settingadmin:"設定管理",
      adminmanagement:"管理者管理",
    },

    /* -------- Common -------- */
    common: {
      loading: "読み込み中...",
      success: "成功",
      error: "エラー",

      yes: "はい",
      no: "いいえ",
      save: "保存",
      delete: "削除",
      confirm: "確認",
      cancel: "キャンセル",

      days: "日",
      unlimited: "無制限",
      today: "今日",
      page: "ページ",
      showing: "表示中",
      of: "／",

      prev: "前へ",
      next: "次へ",
      back: "戻る",

      close: "閉じる",
      daysShort: "日",

      // Alerts / Validation
      missingInfo: "必須項目が不足しています",
      invalidValue: "無効な値です",
      saveFailed: "保存に失敗しました",
      deleteFailed: "削除に失敗しました",
      systemError: "システムエラーが発生しました",
    },

    /* -------- QuotaCard -------- */
    quota: {
      noData: "この期間の休暇クォーターデータが見つかりません",
      carryOver: "繰越分",
      used: "消化済み",
      specialUsage: "特別休暇の使用",
      days: "日",
      usedTotal: "使用 {{used}} / 合計 {{total}}",
      carriedDetail: "（基本 {{base}} + 繰り越し {{carry}}）",
    },

    /* -------- History -------- */
    history: {
      attendanceLog: "勤怠履歴",
      leaveHistory: "休暇履歴",
      tabAttendance: "勤怠",
      tabLeave: "休暇",
      date: "日付",
      inOut: "出退勤",
      status: "状態",
      statusIn: "出勤状態",
      statusOut: "退勤状態",
      signedBy: "承認者",
      type: "種類",
      period: "期間",
      days: "日数",
      note: "備考",
      file: "ファイル",
      noData: "データなし",
      filter: "フィルター",
      clear: "クリア",
      selectDate: "日付を選択",

      // Status Badges
      late: "遅刻",
      onTime: "時間通り",
      absent: "欠勤",
      leave: "休暇",
      early: "早退",
      normal: "通常",
      noCheckout: "退勤登録",
      notCheckedOutYet: "勤務中",
      waitingForHr: "人事の確認待ち",

      // Alerts
      deleteTitle: "休暇申請を削除しますか？",
      deleteText: "この申請を削除してもよろしいですか？<br/><b>{{type}}</b>",
      deleteButton: "削除",
      requestCancelButton: "キャンセル申請",
    },

    /* -------- Leave Approval -------- */
    leaveApproval: {
      title: "承認待ち",
      selected: "{{count}} 件選択",
      bulkApprove: "一括承認",
      bulkSpecial: "一括特別承認",
      bulkReject: "一括却下",

      table: {
        employee: "従業員",
        type: "種類",
        reason: "申請理由",
        duration: "期間",
        evidence: "添付書類",
        action: "操作",
      },

      loading: "データ同期中...",
      noData: "保留中のタスクはありません",
      ref: "参照: #{{id}}",
      days: "日",
      noFile: "ファイルなし",

      actions: {
        approve: "承認",
        special: "特別",
        reject: "却下",
      },

      tooltips: {
        viewAttachment: "添付を表示",
        approve: "承認",
        special: "特別承認",
        reject: "却下",
      },

      labels: {
        reason: "理由",
        cancelReason: "キャンセル理由",
        note: "メモ",
      },

      cancellationRequests: "キャンセル申請",
      newrequest: "新規申請",

      selectionEmptyTitle: "未選択",
      selectionEmptyText: "少なくとも 1 件選択してください。",

      confirmTitle: "{{action}} の確認",
      confirmText: "{{count}} 件の申請を {{action}} してもよろしいですか？",

      processed: "{{count}} 件の申請を処理しました。",
      actionFailed: "操作に失敗しました",

      actionText: {
        approve: "承認",
        special: "特別承認",
        reject: "却下",
      },

      tabs: {
        new: "新規申請",
        cancel: "キャンセル申請",
      },
    },

    /* -------- Special Holidays -------- */
    specialHoliday: {
      title: "特別休日",
      subtitle: "休日を追加／編集してすぐに適用",

      form: {
        holidayName: "休日名",
        startDate: "開始日",
        endDate: "終了日",
        duration: "日数",
        day: "日",
        days: "日",
        pickStartDate: "開始日を選択",
        pickEndDate: "終了日を選択",
        add: "追加",
        update: "更新",
        cancelEdit: "編集をキャンセル",
        close: "閉じる",
      },

      table: {
        title: "特別休日一覧",
        subtitle: "YYYY/MM/DD（合計日数）、名前、編集、削除",
        date: "日付",
        name: "休日名",
        actions: "操作",
        empty: "特別休日はまだありません。",
      },

      pagination: {
        page: "ページ",
        showing: "表示中",
        of: "／",
        prev: "前へ",
        next: "次へ",
      },

      action: {
        addHoliday: "休日を追加",
        edit: "編集",
        delete: "削除",
      },

      confirm: {
        addTitle: "追加してもよろしいですか？",
        updateTitle: "更新してもよろしいですか？",
        deleteTitle: "この祝日を削除しますか？",
      },
      toast: {
        added: "祝日を追加しました。",
        updated: "祝日を更新しました。",
        deleted: "祝日を削除しました。",
      },
    },

    /* -------- Leave Type -------- */
    leaveType: {
      table: {
        title: "休暇タイプ",
        subtitle: "休暇タイプ、有給設定、上限を管理",
        name: "休暇タイプ",
        paid: "有給",
        maxCarryOver: "繰り越し上限",
        maxConsecutive: "連続上限",
        actions: "操作",
        color: "色",
      },

      action: {
        add: "休暇タイプを追加",
        edit: "編集",
        delete: "削除",
        color: "色変更",
      },

      form: {
        typeName: "タイプ名",
        paid: "有給",
        labelTh: "ラベル（TH）",
        labelEn: "ラベル（EN）",
        labelJa: "ラベル（JP）",
        maxCarryOver: "繰り越し上限（日）",
        maxConsecutive: "連続上限（日）",
        cancelEdit: "キャンセル",
        editTitle: "休暇タイプを編集",
        addTitle: "休暇タイプを追加",
        subtitle: "休暇タイプを追加／編集してすぐに適用",
        add: "追加",
        update: "更新",
        close: "閉じる",
        color: "休暇タイプの色",

        // validation text
        requiredLabel: "必須項目をすべて入力してください。",
        invalidNumber: "値は 0 以上である必要があります。",
      },

      color: {
        title: "休暇タイプの色",
        subtitle: "この休暇タイプの色を選択します",
        current: "現在の色",
        pick: "色を選択",
        presets: "プリセット",
        save: "保存",
        confirmTitle: "色変更の確認",
        confirmMessage: "「{{name}}」の色を変更しますか？",
        saved: "色を更新しました。",
      },

      // confirm popups
      confirm: {
        addTitle: "休暇タイプ追加の確認",
        addMessage: "この休暇タイプを作成してもよろしいですか？",
        updateTitle: "休暇タイプ更新の確認",
        updateMessage: "この休暇タイプを更新してもよろしいですか？",
        deleteTitle: "休暇タイプ削除の確認",
        deleteMessage: "「{{name}}」を削除してもよろしいですか？",
      },

      // success messages
      success: {
        created: "休暇タイプを作成しました。",
        updated: "休暇タイプを更新しました。",
        deleted: "休暇タイプを削除しました。",
      },
    },

    /* -------- SweetAlert -------- */
    sweetAlert: {
      reject: {
        title: "休暇申請を却下",
        label: "却下理由",
        placeholder: "却下理由を入力してください...",
        confirm: "却下",
        required: "却下理由は必須です",
        requestcancelleave:"休暇キャンセルを申請",
        reasonforcancellation:"キャンセル理由",
        placeholdercancellation:"キャンセル理由を入力してください...",
        leaveRequest: "送信",
        cancelreasonrequired: "キャンセル理由は必須です",
      },
    },

    /* -------- Date Grid Picker -------- */
    dateGridPicker: {
      title: "日付を選択",
      all: "すべて",
      allOn: "全選択",
      allOff: "全解除",
      year: "年",
      month: "月",
      day: "日",
      reset: "リセット",
      cancel: "キャンセル",
      done: "決定",
    },

    /* -------- Leave Request -------- */
    leaveRequest: {
      type: "休暇タイプ",
      none: "なし",

      fullDay: "終日",
      halfMorning: "半日（午前）",
      halfAfternoon: "半日（午後）",

      loadingTypes: "休暇タイプを読み込み中...",
      startDate: "開始日",
      endDate: "終了日",
      pickStartDate: "開始日を選択",
      pickEndDate: "終了日を選択",
      browse: "参照",

      errors: {
        missingType: "休暇タイプを選択してください。",
        missingDates: "開始日と終了日を両方指定してください。",
        invalidDate: "終了日は開始日より後である必要があります。",
      },

      blockedTitle: "申請エラー",
      blockedMessage: "休日または非稼働日に休暇申請はできません。",

      submissionFailed: "送信に失敗しました",
      sumbitfailedtext:"休日/非稼働日に休暇申請はできません",

      headerTitle: "休暇申請",
      headerSubtitle: "従業員休暇管理システム",

      step1: "1. 休暇タイプを選択",
      step2: "2. 日付と時間帯を選択",
      step3: "3. 申請理由",
      step4: "4. 添付（任意）",

      start: "開始日",
      end: "終了日",

      chooseFile: "ファイルを選択",
      removeFile: "ファイルを削除",
      noFileSelected: "ファイルが選択されていません",

      attachNote: "証明書類（例：診断書）を添付できます。",

      placeholderReason: "詳細を入力してください...",

      summaryTitle: "休暇申請の概要",
      summaryReview: "送信前に内容を確認してください。",
      summary: {
        type: "種類",
        period: "期間",
        duration: "時間帯",
        attachment: "添付書類",
        reason: "理由",
      },

      confirmTitle: "休暇申請の確認",
      confirmText: "この休暇申請を送信しますか？",
      confirmButton: "申請を送信",

      successTitle: "申請を送信しました",
      successMessage: "休暇申請を送信しました。",
      

      cancel: "キャンセル",
      submitting: "申請を送信中...",
      submit: "休暇申請を送信",
    },

    /* -------- Attendance Dashboard -------- */
    attendanceDashboard: {
      title: "勤怠",
      viewing: "表示中: ",
      noData: "勤怠データがありません。",
      selectMonthHint: "カレンダー表示には月を選択してください。",
      allYear: "{{year}}年（すべて）",

      workingDays: "稼働日数",
      presentExpected: "出勤／予定",
      late: "遅刻回数",
      early: "早退回数",
      leave: "承認済み休暇",
      absent: "欠勤",
      daysTaken: "取得日数",
      unexcused: "無断欠勤日数",
      minutes: "分",

      present: "出勤",
      attendanceRatio: "出勤率",
      leaveTypes: "休暇タイプ",

      subtitle: "勤怠概要",
      filterAll: "{{year}}年（すべて）",
      clear: "クリア",
      selectPeriod: "期間を選択",
      loading: "統計を読み込み中...",
      noDataFound: "勤怠データが見つかりません。",
      yearlyView: "年間表示",
      calendar: "{{month}} のカレンダー",

      stat: {
        workingDays: "稼働日数",
        presentExpected: "出勤／予定",
        late: "遅刻",
        earlyLeave: "早退",
        leaves: "休暇",
        absences: "欠勤",
        approved: "承認済み",
        unexcused: "無断",
        minutes: "分",
      },

      ratio: "出勤率",

      legend: {
        holiday: "休日",
        absent: "欠勤",
        late: "遅刻",
        leave: "休暇",
        early: "早退",
      },

      calendarHint: "カレンダー表示には月を選択してください。",

      events: {
        absent: "欠勤",
        late: "遅刻",
        early: "早退",
      },

      weekdays: {
        sun: "日",
        mon: "月",
        tue: "火",
        wed: "水",
        thu: "木",
        fri: "金",
        sat: "土",
      },
    },

    /* -------- Year End Configuration -------- */
    yearEndConfig: {
      title: "年末設定",
      subtitle: "繰り越し日数・付与日数・全体ポリシーを設定します。",

      carryOverTitle: "休暇タイプの繰り越し",
      carryOverHint: "翌年に繰り越せる最大日数（従業員ごと）",

      quotaTitle: "{{year}}年の付与日数を設定",
      quotaHint: "従業員ごとの基本付与日数",

      maxConsecutiveTitle: "全体ポリシー：連続休日の上限",
      unlimitedHint: "0 = 無制限",

      targetYear: "対象年",
      yearLabel: "{{year}}年",

      process: "確定して処理",
      processing: "処理中...",

      warning:
        "この操作により全従業員の付与日数が上書きされ、過去データはロックされます。",
    },

    /* -------- Employee Detail -------- */
    employeeDetail: {
      loading: "プロフィールを読み込み中...",
      working: "在職",
      resigned: "退職",
      joined: "入社日",
      manageInfo: "情報管理",
      leaveBalance: "休暇残高",
      employeeInfo: "従業員情報",
      fullAccess: "フルアクセス",
      standardAccess: "標準アクセス",
      roleNote: "注意：役割の変更はシステム権限に影響します。",
      newPassword: "新しいパスワード",
      passwordOptional: "（空欄の場合は変更しません）",
      passwordMin: "6 文字以上",
      confirmPassword: "パスワード（確認用）",
      confirmPasswordPlaceholder: "同じ新しいパスワードを入力",

      terminate: "退職処理",
      reinstate: "復職処理",

      adjustQuota: "クォータ調整",
      fetchFailed: "従業員データを取得できませんでした。",
      quotaUpdated: "クォータを更新しました。",
      quotaFailed: "クォータの更新に失敗しました。",
      passwordMismatch: "パスワードが一致しません。",
      infoUpdated: "情報を更新しました。",
    },

    /* -------- Employee list -------- */
    employeeList: {
      title: "従業員一覧",
      addNew: "従業員を追加",
      leavePolicy: "休暇ポリシー",

      activeTab: "在職",
      resignedTab: "退職",

      allRoles: "全ての役割",
      roleWorker: "従業員",
      roleHR: "HR",

      allDepartments: "すべての部署",
      departmentUnassigned: "未所属",

      searchPlaceholder: "名前、メール、ID で検索",

      colId: "ID",
      colName: "氏名",
      colEmail: "メール",
      colDepartment: "部署",
      colRole: "役割",
      colStatus: "状態",

      statusWorking: "在職",
      statusResigned: "退職",

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
        button: "一括エクスポート",
        buttonTitle: "一括エクスポート",
        title: "一括エクスポート",

        workbook: {
          title: "（1）ワークブックをエクスポート（.xlsx）— 複数シート",
          desc: "複数従業員を選択（xlsx、従業員ごとに 1 シート）",
        },
        employeesList: {
          title: "（2）従業員リストをエクスポート",
          desc: "従業員リストをエクスポート（csv）",
        },
        note: "※ 複数シートは xlsx が必要です（CSV は複数シート不可）。",
      },
    },

    /* -------- Employee Create -------- */
    employeeCreate: {
      title: "従業員情報",

      firstName: "名",
      firstNamePlaceholder: "名を入力してください",
      lastName: "姓",
      lastNamePlaceholder: "姓を入力してください",
      email: "メール",
      emailPlaceholder: "メールを入力してください",

      role: "役割",
      workerAccess: "標準権限",
      hrAccess: "フル権限",
      roleNote: "※ 役割の変更はシステム権限に影響します。",

      department: "部署",
      departmentNote: "従業員の部署を選択してください",

      joinDate: "入社日",
      pickJoinDate: "入社日を選択",

      password: "パスワード",
      passwordHint: "6文字以上",

      confirmTitle: "登録内容の確認",
      confirmButton: "登録",
      cancel: "キャンセル",
      submit: "登録",
      processing: "処理中...",

      roleWorker: "従業員",
      roleHR: "人事",
      selected: "選択済み",

      confirmReviewTitle: "以下の内容をご確認ください",
      successText: "新しい従業員を追加しました。",

      success: "成功",
      failed: "失敗",

      loadingOptions: "選択肢を読み込み中...",
      loadOptionsFailed: "役割/部署の読み込みに失敗しました。再度お試しください。",
      noRoles: "役割が見つかりません",
      noDepartments: "部署が見つかりません",

      confirmName: "名",
      confirmSurname: "姓",
      confirmEmail: "メール",
      confirmRole: "役割",
      confirmDepartment: "部署",
      confirmJoinDate: "入社日",

      fetchErrorFallback: "情報の取得中にエラーが発生しました。もう一度お試しください。",
      unexpectedErrorFallback: "予期しないエラーが発生しました。もう一度お試しください。",

      aria: {
        closeDepartmentDropdown: "部署のドロップダウンを閉じる",
      },
    },

    /* -------- working days -------- */
    workingDays: {
      title: "稼働日",
      subtitle: "稼働日を選択してポリシーを保存",
      loading: "稼働日ポリシーを読み込み中...",
      currently: "現在：",

      saveBtn: "保存",
      savingBtn: "保存中...",
      loadingBtn: "読み込み中...",

      mon: "月",
      tue: "火",
      wed: "水",
      thu: "木",
      fri: "金",
      sat: "土",
      sun: "日",

      confirmTitle: "勤務日を保存しますか？",
      confirmSubtitle: "勤務日を確認",
      savedText: "勤務日を更新しました。",
    },

    /* -------- worktimeby role -------- */
    workTimeByRole: {
      title: "勤務時間（役割別）",
      subtitle: "役割ごとの出勤／退勤時間を設定",

      roleHR: "HR",
      roleWorker: "従業員",

      checkIn: "出勤時刻",
      checkOut: "退勤時刻",

      current: "現在：",

      saveBtn: "勤務時間を保存",
      savingBtn: "保存中...",

      confirmTitle: "勤務時間を保存しますか？",
      savedText: "勤務時間を保存しました。",
    },

    /* -------- Max Consecutive -------- */
    maxConsecutive: {
      title: "連続休日の上限",
      subtitle: "申請ごとに許可される連続休日の日数の上限",

      confirmTitle: "連続休日の上限を保存しますか？",
      savedText: "更新しました。",
    },

    /* -------- YearEnd History -------- */
    yearEndHistory: {
      title: "処理履歴",

      year: "年",
      lockStatus: "ロック状態",
      processedAt: "処理日時",
      action: "操作",

      closed: "クローズ",
      open: "オープン",

      unlock: "この年を解除",
      empty: "処理履歴がありません。",
    },

    /* -------- YearEnd Policy -------- */
    yearEndPolicy: {
      title: "勤務日ポリシーと特別休日",
      subtitle: "勤務日を設定し、特別休日を管理します。",

      buttons: {
        add: "追加",
        update: "更新",
      },

      confirm: {
        saveWorkingDaysTitle: "勤務日を保存しますか？",
        saveWorkTimeTitle: "勤務時間を保存しますか？",
        saveMaxConsecutiveTitle: "連続休日の上限を保存しますか？",
        addHolidayTitle: "追加を確認しますか？",
        updateHolidayTitle: "更新を確認しますか？",
        deleteHolidayTitle: "この休日を削除しますか？",
      },

      success: {
        workingDaysSaved: "勤務日を更新しました。",
        workTimeSaved: "勤務時間を保存しました。",
        maxConsecutiveSaved: "更新しました。",
        holidayAdded: "休日を追加しました。",
        holidayUpdated: "休日を更新しました。",
        holidayDeleted: "休日を削除しました。",
      },

      errors: {
        loadWorkingDaysFailed: "勤務日の読み込みに失敗しました: {{msg}}",
        pickAtLeastOneDay: "少なくとも1日選択してください。",
        invalidTime: "無効な時間: {{role}}",
        invalidRange: "無効な時間範囲: {{role}}",
        invalidLimit: "無効な上限です。",
        missingHolidayName: "少なくとも1言語で名前を入力してください。",
        missingDate: "日付を指定してください。",
        invalidRangeGeneric: "無効な期間です。",
      },
    },

    /* -------- YearEnd Process -------- */
    yearEndProcess: {
      title: "年末処理 & クォータ付与",
      subtitle: "休暇残高の繰り越しと年間クォータ付与を一括で実行します。",
    },

    /* -------- Team Calendar -------- */
    teamCalendar: {
      title: "チームカレンダー",
      subtitle: "チームの休暇と特別休日を表示",

      actions: {
        todayOverview: "今日の概要（{{count}}）",
        today: "今日",
        prevMonth: "前の月",
        nextMonth: "次の月",
        openDay: "詳細を見る",
        close: "閉じる",
        refresh: "更新",
        clear: "クリア",
      },

      filters: {
        leaveTypesLabel: "休暇タイプ",
        allTypes: "すべて",

        leaveTypes: {
          sick: "病気休暇",
          vacation: "年次休暇",
          personal: "私用休暇",
        },

        roleLabel: "役割",
        allRoles: "すべて",
        searchPlaceholder: "名前／メールで検索...",
      },

      tabs: {
        pending: "保留",
        approved: "承認済み",
        rejected: "却下",
      },

      week: {
        sun: "日",
        mon: "月",
        tue: "火",
        wed: "水",
        thu: "木",
        fri: "金",
        sat: "土",
      },

      hints: {
        lateRule:
          "* 遅刻ルール：{{time}} 以降に出勤していない場合「遅刻」としてカウントされます。",
      },

      loading: {
        calendar: "カレンダーを読み込み中...",
        modal: "詳細を読み込み中...",
        attendance: "勤怠を読み込み中...",
      },

      grid: {
        loading: "読み込み中...",
        moreTypes: "+{{count}} 件",
      },

      status: {
        pending: "保留",
        approved: "承認済み",
        rejected: "却下",
        cancelled: "キャンセル",
        withdrawn: "取り下げ",
      },

      attendance: {
        title: "チーム出勤／退勤（今日）",
        subtitle:
          "合計 {{total}} • 出勤 {{checkedIn}} • 遅刻 {{late}} • 退勤 {{checkedOut}}",

        cards: {
          checkedIn: "出勤",
          late: "遅刻",
          checkedOut: "退勤",
        },

        searchPlaceholder: "名前、メール、ID で検索...",

        table: {
          employee: "従業員",
          role: "役割",
          in: "出勤",
          out: "退勤",
          statusIn: "出勤状態",
          statusOut: "退勤状態",
          actions: "操作",
        },

        loading: "勤怠を読み込み中...",
        empty: {
          activeNone: "在職者の勤怠データがありません",
          noMatch: "一致する従業員がいません",
        },

        unknown: "不明",

        buttons: {
          saving: "保存中...",
          checkIn: "出勤",
          checkOut: "退勤",
        },

        statusIn: {
          onTime: "時間通り",
          late: "遅刻",
          leave: "休暇",
          waiting: "待機",
          normal: "正常",
        },

        statusOut: {
          none: "-",
          normal: "正常",
          earlyLeave: "早退",
          noCheckout: "退勤なし",
          leave: "休暇",
        },

        pagination: {
          label:
            "ページ {{page}} / {{totalPages}} • {{start}}-{{end}} 件（全 {{total}} 件）",
        },
      },

      // Daily Detail Modal
      modal: {
        title: "日次詳細",

        pills: {
          checkedIn: "出勤",
          late: "遅刻",
          absent: "欠勤",
          onLeave: "休暇中",
        },

        nav: {
          prevDay: "前日",
          nextDay: "翌日",
          goToday: "今日へ",
        },

        tabs: {
          pending: "承認待ち",
          approved: "承認済み",
          rejected: "却下",
        },

        role: {
          all: "すべて",
          worker: "従業員",
          hr: "HR",
        },

        searchPlaceholder: "名前、メール、ID で検索...",

        table: {
          employee: "従業員",
          type: "種類",
          noteReason: "メモ／理由",
          duration: "期間",
          evidence: "証拠",
          action: "操作",
          approvedBy: "承認者",
          rejectedBy: "却下者",
        },

        loading: "データ同期中...",
        noData: "データなし",
        noFile: "ファイルなし",
        ref: "参照: #{{id}}",

        tooltips: {
          viewAttachment: "添付を表示",
          approve: "承認",
          special: "特別承認",
          reject: "却下",
        },

        actions: {
          approve: "承認",
          special: "特別",
          reject: "却下",

          approveFull: "通常承認",
          specialFull: "特別承認（控除なし）",
          rejectFull: "却下",
        },

        confirm: {
          title: "{{action}} の確認",
          text: "<b>{{name}}</b> の申請を <b>{{action}}</b> として処理しますか？",
        },

        toast: {
          processedOne: "1 件処理しました。",
          actionFailedTitle: "処理に失敗しました",
          unknownError: "不明なエラー",
        },

        hrNameHint:
          "* 承認／却下タブには、backend が approvedBy / rejectedBy を返す場合 HR 名が表示されます。",

        specialReasonPrefix: "特別承認",
        noReason: "理由なし",

        reasonTitle: "理由: {{reason}}",
        noteTitle: "メモ: {{note}}",
      },

      exportCsv: {
        openButton: "CSVをエクスポート",
        title: "CSVエクスポート",

        scope: {
          label: "範囲",
          options: {
            month: "月別",
            year: "年別",
            all: "すべて",
          },
        },

        fields: {
          month: "月",
          year: "年",
        },

        loading: "読み込み中...",
        typesLoadFailed: "休暇タイプの読み込みに失敗しました",

        leaveTypes: {
          label: "休暇タイプ",
          allTypes: "すべてのタイプ",
          selectedCount: "{{count}}件選択済み",
          dropdownTitle: "タイプを選択",
          selectAll: "すべて選択",
          clear: "クリア",
        },

        found: "件数",
        items: "件",

        download: "CSVをダウンロード",

        pickerTitle: {
          month: "月を選択",
          year: "年を選択",
        },
      },
    },

    /* -------- Notification Bell -------- */
    notificationBell: {
      title: "通知",
      readAll: "すべて既読にする",
      empty: "新しい通知はありません",
      view: "表示",
      tooltip: {
        openEmployee: "従業員詳細を開く",
        markRead: "既読にする",
      },
      aria: {
        toggle: "通知の切り替え",
      },
    },

    /* -------- Employee Export -------- */
    employeeExport: {
      title: "CSV エクスポート（従業員）",
      exportType: {
        label: "エクスポート種別",
        attendance: "勤怠",
        leaveRequests: "休暇申請",
      },
      period: {
        label: "期間",
        daily: "日次",
        monthly: "月次",
        yearly: "年次",
        quarter: "四半期",
        customRange: "カスタム範囲",
        selectDate: "日付を選択",
        selectMonth: "月を選択",
        selectYear: "年を選択",
      },
      quarter: {
        year: "年",
        quarter: "四半期",
        q1: "Q1（1月〜3月）",
        q2: "Q2（4月〜6月）",
        q3: "Q3（7月〜9月）",
        q4: "Q4（10月〜12月）",
      },
      custom: {
        dateFrom: "開始日",
        dateTo: "終了日",
        pickDate: "日付を選択",
      },
      range: {
        label: "範囲:",
      },
      buttons: {
        export: "エクスポート",
      },
      common: {
        all: "すべて",
      },
      picker: {
        selectDate: "日付を選択",
        selectMonth: "月を選択",
        selectYear: "年を選択",
        dateFrom: "開始日",
        dateTo: "終了日",
      },
      errors: {
        noEmployee: "従業員が見つかりません。",
        customIncomplete:
          "カスタム範囲では開始日と終了日を両方選択してください。",
        endpoint404:
          "エクスポート失敗：Backend のエンドポイントが見つかりません（404）。Backend の API ルートを確認し、このファイルの paths を更新してください。",
        exportFailed: "エクスポートに失敗しました",
      },
    },

    /* -------- Employees All Export -------- */
    employeesAllExport: {
      title: "従業員をエクスポート（全員）",
      rowsToExport: "エクスポート行数:",
      previewRows: "プレビュー行数:",
      buttons: {
        exportCsv: "CSV エクスポート",
      },
      filters: {
        label: "フィルター",
        activeTab: "在職タブ",
        resignedTab: "退職タブ",
        role: "役割",
        status: "状態",
        keyword: "キーワード",
        keywordPlaceholder: "名前、メール、役割、ID で検索...",
      },
      options: {
        all: "すべて",
        worker: "従業員",
        hr: "HR",
      },
      status: {
        active: "在職",
        inactive: "退職",
      },
      columns: {
        label: "列",
        employeeId: "従業員ID",
        firstName: "名",
        lastName: "姓",
        email: "メール",
        role: "役割",
        status: "状態（在職／退職）",
        joiningDate: "入社日",
        tip: "ヒント：不要な列をオフにすると、エクスポートファイルのサイズを減らせます。",
      },
    },

    /* -------- XLSX Workbook Export -------- */
    xlsxWorkbook: {
      title: "ワークブックをエクスポート（XLSX）",
      employeesCount: "従業員数:",
      workbookType: {
        label: "ワークブック種別",
        perEmployee: "従業員ごと（複数シート）",
        employeesList: "従業員リスト（1シート）",
      },
      dataType: {
        label: "データ種別",
        attendance: "勤怠",
        leave: "休暇申請",
      },
      period: {
        label: "期間",
        daily: "日次",
        monthly: "月次",
        yearly: "年次",
        quarter: "四半期",
        custom: "カスタム範囲",
      },
      fields: {
        selectDate: "日付を選択",
        selectMonth: "月を選択",
        selectYear: "年を選択",
        year: "年",
        quarter: "四半期",
        dateFrom: "開始日",
        dateTo: "終了日",
      },
      placeholders: {
        pickDate: "日付を選択",
        pickMonth: "月を選択",
        pickYear: "年を選択",
        pickStart: "開始日を選択",
        pickEnd: "終了日を選択",
      },
      rangeLabel: "範囲:",
      buttons: {
        exportXlsx: "XLSX エクスポート",
      },
      quarters: {
        q1: "Q1（1月〜3月）",
        q2: "Q2（4月〜6月）",
        q3: "Q3（7月〜9月）",
        q4: "Q4（10月〜12月）",
      },
      picker: {
        select: "選択",
        selectDate: "日付を選択",
        selectMonth: "月を選択",
        selectYear: "年を選択",
        dateFrom: "開始日",
        dateTo: "終了日",
      },
      errors: {
        noEmployees: "エクスポート対象の従業員がいません。",
        pickDaily: "日付（日次）を選択してください。",
        pickMonthly: "月（月次）を選択してください。",
        pickCustom: "開始日と終了日（カスタム）を両方選択してください。",
        exportFailed: "ワークブックのエクスポートに失敗しました。",
      },
    },

    /* -------- Audit Log Export -------- */
    auditLogExport: {
      title: "CSV エクスポートフィルター",
      period: {
        label: "期間",
        daily: "日次",
        monthly: "月次",
        yearly: "年次",
        quarter: "四半期",
        customRange: "カスタム範囲",
        selectDate: "日付を選択",
        selectMonth: "月を選択",
        selectYear: "年を選択",
      },
      quarter: {
        year: "年",
        quarter: "四半期",
        q1: "Q1（1月〜3月）",
        q2: "Q2（4月〜6月）",
        q3: "Q3（7月〜9月）",
        q4: "Q4（10月〜12月）",
      },
      custom: {
        dateFrom: "開始日",
        dateTo: "終了日",
      },
      range: {
        label: "範囲:",
        to: "→",
      },
      filters: {
        model: "モデル",
        performedBy: "実行者",
        keyword: "キーワード（詳細）",
        recordId: "レコードID（任意）",
        actions: "操作（複数選択）",
      },
      actions: {
        clearActions: "操作をクリア",
        noActions: "操作がまだ読み込まれていません",
      },
      preview: {
        rowsToExport: "エクスポート行数:",
      },
      buttons: {
        export: "エクスポート",
      },
      common: {
        all: "すべて",
        reset: "リセット",
      },
      placeholders: {
        date: "YYYY-MM-DD",
        month: "YYYY-MM",
        year: "YYYY",
        keyword: '例: "遅刻", "承認", "withdraw"...',
        recordId: "例: 6 または 10",
      },
      picker: {
        selectDate: "日付を選択",
        selectMonth: "月を選択",
        selectYear: "年を選択",
        dateFrom: "開始日",
        dateTo: "終了日",
      },
    },

    /* -------- Holiday Policy Errors -------- */
    holidayPolicy: {
      success: {
        savedTitle: "保存しました",
        updatedTitle: "更新しました",
        addedTitle: "追加しました",
        deletedTitle: "削除しました",
      },

      errors: {
        loadFailedTitle: "読み込みに失敗しました",
        saveFailedTitle: "保存に失敗しました",
        invalidTitle: "入力内容が無効です",
        selectAtLeastOneDay: "少なくとも1日を選択してください。",
        invalidTimeTitle: "無効な時刻",
        invalidRangeTitle: "無効な範囲",
        invalidLimitTitle: "無効な上限",
        missingNameTitle: "名称が未入力です",
        enterAtLeastOneLanguage: "少なくとも1つの言語で名称を入力してください。",
        missingDateTitle: "日付が未選択です",
        invalidRangeOnlyTitle: "無効な期間",
      },
    },

    /* -------- Confirm Html (SweetAlert confirm bodies) -------- */
    confirmHtml: {
      common: {
        to: "〜",
        daySingular: "日",
        dayPlural: "日",
      },

      workingDays: {
        subtitle: "勤務日を確認",
      },

      workTime: {
        title: "勤務時間の確認（役割別）",
      },

      maxConsecutive: {
        title: "連続休日の上限を確認",
        label: "連続日数の上限",
      },

      carryOver: {
        title: "繰越上限の確認",
        hint: "各休暇タイプの繰越上限（日数）を保存します（従業員ごと）。",
      },

      holiday: {
        fallbackName: "祝日",
        fields: {
          holiday: "祝日",
          date: "日付",
        },
        mode: {
          add: "追加",
          update: "更新",
        },
      },

      holidayUpsert: {
        title: "{{mode}}の確認",
      },

      holidayDelete: {
        title: "祝日の削除確認",
        hint: "この操作は元に戻せません。",
      },
    },
  },
};
