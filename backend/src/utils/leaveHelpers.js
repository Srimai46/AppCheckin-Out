//  * คำนวณวันทำงานจริง (จันทร์-ศุกร์) และหักลบกรณีลาครึ่งวัน
exports.calculateTotalDays = (start, end, startDuration, endDuration) => {
    let count = 0;
    let cur = new Date(start);
    
    // วนลูปนับเฉพาะวันจันทร์-ศุกร์
    while (cur <= end) {
        const dayOfWeek = cur.getDay(); // 0 = อาทิตย์, 6 = เสาร์
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            count++;
        }
        cur.setDate(cur.getDate() + 1);
    }

    if (count === 0) return 0;

    // กรณีลาวันเดียว
    if (start.getTime() === end.getTime()) {
        return startDuration === "Full" ? 1 : 0.5;
    }
    
    // กรณีลาหลายวัน: หักออกวันละ 0.5 ถ้าวันแรกหรือวันสุดท้ายลาไม่เต็มวัน
    let deduction = 0;
    if (startDuration !== "Full") deduction += 0.5;
    if (endDuration !== "Full") deduction += 0.5;
    
    return count - deduction;
};