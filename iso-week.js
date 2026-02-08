/**
 * 日付からISO週情報を取得
 * ISO 8601準拠: 週の開始は月曜日、その年の第1木曜日を含む週を第1週とする。
 * @param {Date} date 
 * @returns {{ iso_year: number, week_number: number, start_date: string, end_date: string }}
 */
export function getISOWeekInfo(date) {
    const d = new Date(date.getTime());

    // 指定された日の直近の木曜日を求める (ISO 8601の定義用)
    // 日曜(0)〜土曜(6) -> 月曜を週の始まりとするなら
    // 木曜日(4)に近い方の日付を年度判定に使う
    const dayNum = (date.getDay() + 6) % 7; // 0:月, 1:火, ... 6:日
    d.setDate(d.getDate() - dayNum + 3); // その週の木曜日にセット
    const isoYear = d.getFullYear();

    // その年の第1木曜日を求める
    const firstThursday = new Date(isoYear, 0, 4);
    const firstThursdayDayNum = (firstThursday.getDay() + 6) % 7;
    firstThursday.setDate(firstThursday.getDate() - firstThursdayDayNum + 3);

    // 週番号の計算
    const weekNumber = Math.floor(1 + (d.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));

    // 週の開始日（月曜日）と終了日（日曜日）の計算
    const startDate = new Date(date.getTime());
    startDate.setDate(date.getDate() - dayNum);

    const endDate = new Date(startDate.getTime());
    endDate.setDate(startDate.getDate() + 6);

    const formatDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    return {
        iso_year: isoYear,
        week_number: weekNumber,
        start_date: formatDate(startDate),
        end_date: formatDate(endDate)
    };
}
