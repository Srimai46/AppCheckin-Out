export default {
  dashboard: {
    title: "ダッシュボード",
    attendance: "勤怠",
    welcome: "ようこそ、{{firstName}} {{lastName}} さん",
    selectYear: "年を選択",
    year: "年",

    checkIn: "出勤",
    checkOut: "退勤",
    updatecheckOut: "退勤を更新",
    leave: "休暇",

    // ===== Confirm / Alert (Dashboard specific) =====
    attendanceConfirmTitle: "打刻の確認",
    attendanceConfirmText: "{{action}} してもよろしいですか？",

    updateCheckOutTitle: "退勤時刻を更新しますか？",
    updateCheckOutText:
      "すでに退勤しています。再度退勤して時刻を更新しますか？",

    pleaseCheckInFirst: "先に出勤打刻を行ってください。",
    geoNotSupported: "この端末は位置情報（Geolocation）に対応していません。",

    loadFail: "ダッシュボードデータの読み込みに失敗しました。",
  },
};
