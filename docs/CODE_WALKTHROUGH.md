# コードウォークスルー - 主要コードの詳細解説

このドキュメントでは、Elevation Loomアプリの主要なコードを1行ずつ詳細に解説します。PLC/ST技術者が理解しやすいよう、PLCの概念と対応付けながら説明します。

---

## 1. ファイル構成の全体像

```
Elvgain-Caliculator/
│
├── index.html              # エントリーポイント（日次入力画面）
├── week-target.html        # 週目標設定画面
│
├── css/
│   └── style.css           # スタイルシート（HMI デザイン相当）
│
├── js/
│   ├── app.js              # メインロジック（日次入力画面）
│   ├── week-target.js      # 週目標画面ロジック
│   ├── db.js               # IndexedDB操作（保持型メモリ相当）
│   ├── iso-week.js         # ISO週計算ロジック
│   ├── calculations.js     # 週合計・進捗計算
│   ├── chart.js            # グラフ描画（Canvas API）
│   ├── backup.js           # 自動バックアップ
│   ├── export-image.js     # 画像エクスポート
│   └── sample-data.js      # サンプルデータ生成
│
└── scripts/
    └── run_local.sh        # ローカルサーバー起動スクリプト
```

### 各ファイルの役割（PLCでの対応）

| ファイル | 役割 | PLC相当 |
|---------|------|---------|
| `index.html` | UI構造定義 | HMI画面レイアウト |
| `css/style.css` | 見た目の定義 | HMIスタイル設定 |
| `js/app.js` | メイン処理 | メインプログラム |
| `js/db.js` | データ永続化 | 保持型メモリ管理FB |
| `js/iso-week.js` | 週計算 | 日時計算ライブラリ |
| `js/calculations.js` | 集計計算 | 計算処理FB |

---

## 2. db.js の詳細解説（データベース操作）

### 2.1 データベース初期化

```javascript
// 1. データベース名とバージョンの定義
const DB_NAME = 'TrainingMirrorDB';  // DB名（PLCのプロジェクト名相当）
const DB_VERSION = 1;                 // バージョン（スキーマ変更時にインクリメント）

// 2. グローバルなDB接続オブジェクト
let db = null;  // PLCのデバイス接続ハンドル相当

/**
 * IndexedDBの初期化（PLCの初期化処理相当）
 * - DB接続を確立
 * - 必要なテーブル（Object Store）を作成
 */
async function initDB() {
  // 既に接続済みならそれを返す（再初期化不要）
  if (db) return db;
  
  // Promiseで非同期処理をラップ（PLC: 完了フラグ待ち）
  return new Promise((resolve, reject) => {
    // IndexedDBを開く（存在しなければ作成）
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    /**
     * アップグレード処理（初回 or バージョンアップ時）
     * PLC: プロジェクト初期化時のデータエリア確保
     */
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // テーブル1: DayLog（日次データ）
      if (!db.objectStoreNames.contains('DayLog')) {
        // キーは 'date' フィールド（YYYY-MM-DD）
        const dayLogStore = db.createObjectStore('DayLog', { 
          keyPath: 'date'  // PLCのユニークキー相当
        });
        
        // インデックス作成: 週番号での検索を高速化
        dayLogStore.createIndex('week', ['iso_year', 'week_number'], {
          unique: false  // 同じ週に複数のレコード存在
        });
      }
      
      // テーブル2: WeekTarget（週目標）
      if (!db.objectStoreNames.contains('WeekTarget')) {
        // キーは 'key' フィールド（YYYY-Wnn形式）
        db.createObjectStore('WeekTarget', { 
          keyPath: 'key'
        });
      }
    };
    
    // 成功時: DB接続オブジェクトを返す
    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);  // Promise完了（PLC: 完了フラグON）
    };
    
    // エラー時
    request.onerror = (event) => {
      reject(event.target.error);  // Promise失敗（PLC: エラーフラグON）
    };
  });
}
```

**ST言語での類似コード（イメージ）**

```pascal
(* データベース初期化FB *)
FUNCTION_BLOCK FB_InitDB
VAR_INPUT
    Execute : BOOL;  (* 実行指令 *)
END_VAR
VAR_OUTPUT
    Done : BOOL;     (* 完了フラグ *)
    Error : BOOL;    (* エラーフラグ *)
    DB : INT;        (* DB接続ハンドル *)
END_VAR
VAR
    state : INT := 0;
END_VAR

(* 処理 *)
CASE state OF
    0: (* 待機 *)
        IF Execute THEN
            state := 1;
        END_IF
    
    1: (* DB接続 *)
        (* IndexedDB.open() 相当 *)
        DB := OpenDatabase('TrainingMirrorDB');
        state := 2;
    
    2: (* テーブル作成 *)
        IF NOT TableExists('DayLog') THEN
            CreateTable('DayLog', key := 'date');
        END_IF
        Done := TRUE;
        state := 0;
END_CASE
```

### 2.2 データ取得

```javascript
/**
 * 日次データの取得
 * @param {string} date - "YYYY-MM-DD" 形式の日付
 * @returns {Promise<Object>} - DayLogオブジェクト（存在しない場合undefined）
 */
async function getDayLog(date) {
  try {
    // DB初期化（未初期化なら初期化）
    const db = await initDB();
    
    // Promiseでトランザクション処理をラップ
    return new Promise((resolve, reject) => {
      // トランザクション開始（読み取り専用）
      const transaction = db.transaction(['DayLog'], 'readonly');
      
      // DayLog テーブルにアクセス
      const store = transaction.objectStore('DayLog');
      
      // キー（date）でデータ取得
      const request = store.get(date);
      
      // 取得成功（PLC: 読み取り完了）
      request.onsuccess = () => {
        resolve(request.result);  // データを返す（なければundefined）
      };
      
      // 取得失敗
      request.onerror = () => {
        console.error('Error getting day log:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Failed to get day log:', error);
    throw error;  // エラーを上位に伝播
  }
}
```

**ST言語での類似コード**

```pascal
(* データ取得FB *)
FUNCTION_BLOCK FB_GetDayLog
VAR_INPUT
    Execute : BOOL;
    Date : STRING;  (* "YYYY-MM-DD" *)
END_VAR
VAR_OUTPUT
    Done : BOOL;
    Error : BOOL;
    Data : DayLog_Struct;  (* 取得したデータ *)
END_VAR

(* 処理 *)
IF Execute THEN
    (* DBから date をキーにデータ取得 *)
    Data := ReadFromDB('DayLog', Date);
    Done := TRUE;
END_IF
```

### 2.3 データ保存

```javascript
/**
 * 日次データの保存
 * @param {Object} data - DayLogオブジェクト
 * @returns {Promise<void>}
 */
async function saveDayLog(data) {
  try {
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
      // トランザクション開始（読み書き可能）
      const transaction = db.transaction(['DayLog'], 'readwrite');
      
      const store = transaction.objectStore('DayLog');
      
      // データを保存（存在すれば上書き、なければ新規作成）
      const request = store.put(data);  // PLC: メモリ書き込み
      
      request.onsuccess = () => {
        resolve();  // 保存完了
      };
      
      request.onerror = () => {
        console.error('Error saving day log:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Failed to save day log:', error);
    throw error;
  }
}
```

---

## 3. app.js の詳細解説（メインロジック）

### 3.1 初期化処理

```javascript
// ───────────────────────────────────────────
// 1. グローバル変数（PLCのグローバルデバイス相当）
// ───────────────────────────────────────────

// DOM要素への参照を取得（PLCのHMI部品ID相当）
const dateInput = document.getElementById('current-date');      // 日付入力欄
const part1Input = document.getElementById('part1');            // 1部入力欄
const part2Input = document.getElementById('part2');            // 2部入力欄
const dailyTotalSpan = document.getElementById('daily-total'); // 日合計表示

// 条件: ラジオボタン群（good/normal/bad）
const conditionRadios = document.getElementsByName('condition');

// 週進捗表示エリアの要素
const weekRangeSpan = document.getElementById('week-range');           // 週期間
const weekTargetSpan = document.getElementById('weekly-target');       // 週目標
const weekCurrentSpan = document.getElementById('weekly-total');       // 週合計
const weekProgressSpan = document.getElementById('weekly-progress');   // 進捗率
const weekRemainingSpan = document.getElementById('weekly-remaining'); // 残り
const weekProgressBar = document.getElementById('weekly-progress-bar'); // 進捗バー

// コンディションカウント
const condGoodCount = document.getElementById('cond-good-count');
const condNormalCount = document.getElementById('cond-normal-count');
const condBadCount = document.getElementById('cond-bad-count');

// ボタン
const prevDayBtn = document.getElementById('prev-day');  // 前日ボタン
const nextDayBtn = document.getElementById('next-day');  // 翌日ボタン

// 週ナビゲーション用の基準日
let weekBaseDate = new Date();
```

### 3.2 日付処理ヘルパー関数

```javascript
/**
 * DateオブジェクトをローカルタイムでYYYY-MM-DD形式の文字列に変換
 * PLCの日付→文字列変換と同じ
 */
function formatDateLocal(date) {
  // 年・月・日を取得
  const y = date.getFullYear();              // 例: 2026
  const m = String(date.getMonth() + 1)      // 月は0始まりなので+1
            .padStart(2, '0');               // 2桁にゼロパディング
  const d = String(date.getDate())
            .padStart(2, '0');
  
  return `${y}-${m}-${d}`;  // "2026-02-09"
}

/**
 * "YYYY-MM-DD" 文字列をローカルタイム Date オブジェクトに変換
 * 
 * 注意: new Date("YYYY-MM-DD") はUTCとして解釈されるため使わない
 * PLCでも文字列→日付変換時のタイムゾーン問題に注意するのと同じ
 */
function parseDateLocal(str) {
  // バリデーション
  if (!str || typeof str !== 'string') {
    console.error('Invalid date string:', str);
    return new Date();  // エラー時は今日の日付を返す
  }
  
  // "YYYY-MM-DD" を分割して数値化
  const [y, m, d] = str.split('-').map(Number);
  
  // 数値チェック
  if (isNaN(y) || isNaN(m) || isNaN(d)) {
    console.error('Invalid date components:', str);
    return new Date();
  }
  
  // Dateオブジェクト作成（月は0始まりなので-1）
  return new Date(y, m - 1, d);
}
```

**ST言語での類似コード**

```pascal
(* 日付→文字列 *)
FUNCTION FormatDateLocal : STRING
VAR_INPUT
    dt : DATE;
END_VAR
    FormatDateLocal := DATE_TO_STRING(dt);  (* 例: '2026-02-09' *)
END_FUNCTION

(* 文字列→日付 *)
FUNCTION ParseDateLocal : DATE
VAR_INPUT
    str : STRING;
END_VAR
VAR
    year, month, day : INT;
END_VAR
    (* 文字列を分割して年月日を取得 *)
    year := STRING_TO_INT(MID(str, 1, 4));
    month := STRING_TO_INT(MID(str, 6, 2));
    day := STRING_TO_INT(MID(str, 9, 2));
    
    ParseDateLocal := DATE(year, month, day);
END_FUNCTION
```

### 3.3 データ読み込み処理（loadData）

```javascript
/**
 * 画面にデータを読み込む（PLCのHMI更新処理）
 * 
 * 処理フロー:
 * 1. 日付を取得
 * 2. DBからデータ取得
 * 3. 入力欄に値をセット
 * 4. 週進捗を更新
 */
async function loadData() {
  // ───────────────────────────────────────
  // ステップ1: 日付取得
  // ───────────────────────────────────────
  const date = dateInput.value;  // 例: "2026-02-09"
  
  // ───────────────────────────────────────
  // ステップ2: DBからデータ取得（非同期）
  // PLC: FB_GetDayLog の Done フラグ待ち
  // ───────────────────────────────────────
  const log = await getDayLog(date);
  
  // ───────────────────────────────────────
  // ステップ3: UIに反映
  // ───────────────────────────────────────
  if (log) {
    // データが存在する場合
    // Nullish coalescing operator (??) を使用
    // log.elevation_part1 が null/undefined なら空文字
    part1Input.value = log.elevation_part1 ?? '';
    part2Input.value = log.elevation_part2 ?? '';
    dailyTotalSpan.textContent = log.elevation_total || 0;
    
    // ラジオボタンのチェック状態を設定
    for (const radio of conditionRadios) {
      radio.checked = (log.subjective_condition === radio.value);
    }
  } else {
    // データが存在しない場合は空にする
    part1Input.value = '';
    part2Input.value = '';
    dailyTotalSpan.textContent = 0;
    
    // ラジオボタンは全てOFF
    for (const radio of conditionRadios) {
      radio.checked = false;
    }
  }
  
  // ───────────────────────────────────────
  // ステップ4: 週進捗の更新
  // ───────────────────────────────────────
  await updateWeekProgress();
  
  // ───────────────────────────────────────
  // ステップ5: ナビゲーションボタンの状態更新
  // ───────────────────────────────────────
  updateNavButtons();
}
```

**ST言語での類似コード**

```pascal
(* データ読み込み処理 *)
PROGRAM LoadData
VAR
    fbGetDayLog : FB_GetDayLog;
    currentDate : STRING;
    dayLog : DayLog_Struct;
END_VAR

(* ステップ1: 日付取得 *)
currentDate := HMI_DateInput;  (* HMIから日付を取得 *)

(* ステップ2: DB読み取り *)
fbGetDayLog.Execute := TRUE;
fbGetDayLog.Date := currentDate;

IF fbGetDayLog.Done THEN
    dayLog := fbGetDayLog.Data;
    
    (* ステップ3: HMIに反映 *)
    IF dayLog.exists THEN
        HMI_Part1 := dayLog.elevation_part1;
        HMI_Part2 := dayLog.elevation_part2;
        HMI_Total := dayLog.elevation_total;
    ELSE
        (* データなし: 空にする *)
        HMI_Part1 := 0;
        HMI_Part2 := 0;
        HMI_Total := 0;
    END_IF
    
    fbGetDayLog.Execute := FALSE;
END_IF
```

### 3.4 データ保存処理（saveData）

```javascript
/**
 * データを保存する（PLCのデータ書き込み処理）
 * 
 * トリガー:
 * - 入力欄からフォーカスが外れた時（blur イベント）
 * - ラジオボタンが変更された時（change イベント）
 */
async function saveData() {
  // ───────────────────────────────────────
  // ステップ1: 入力値の取得
  // ───────────────────────────────────────
  const date = dateInput.value;
  
  // parseFloat: 文字列を浮動小数点数に変換
  // || 0: NaNの場合は0にする（デフォルト値）
  const part1 = parseFloat(part1Input.value) || 0;
  const part2 = parseFloat(part2Input.value) || 0;
  
  // ───────────────────────────────────────
  // ステップ2: 入力検証（PLCの値チェックと同じ）
  // ───────────────────────────────────────
  // 数値チェック
  if (isNaN(part1) || isNaN(part2)) {
    console.warn('Invalid number input');
    return;  // 早期リターン（処理中断）
  }
  
  // 負の数チェック
  if (part1 < 0 || part2 < 0) {
    console.warn('Elevation cannot be negative');
    return;
  }
  
  // ───────────────────────────────────────
  // ステップ3: 合計計算
  // ───────────────────────────────────────
  const total = part1 + part2;
  
  // 画面にも即座に反映
  dailyTotalSpan.textContent = total;
  
  // ───────────────────────────────────────
  // ステップ4: コンディション取得
  // ───────────────────────────────────────
  let condition = null;
  for (const radio of conditionRadios) {
    if (radio.checked) {
      condition = radio.value;  // "good", "normal", "bad"
      break;
    }
  }
  
  // ───────────────────────────────────────
  // ステップ5: ISO週情報の計算
  // ───────────────────────────────────────
  const currentDate = parseDateLocal(date);
  const weekInfo = getISOWeekInfo(currentDate);
  
  // ───────────────────────────────────────
  // ステップ6: データオブジェクトの作成
  // PLC: 構造体の作成
  // ───────────────────────────────────────
  const data = {
    date: date,                                    // キー（主キー）
    elevation_part1: part1,                        // 1部標高
    elevation_part2: part2,                        // 2部標高
    elevation_total: total,                        // 合計
    subjective_condition: condition,               // コンディション
    iso_year: weekInfo.iso_year,                   // ISO週年
    week_number: weekInfo.week_number,             // ISO週番号
    timezone: 'Asia/Tokyo',                        // タイムゾーン
    created_at: new Date().toISOString(),          // 作成日時
    updated_at: new Date().toISOString()           // 更新日時
  };
  
  // ───────────────────────────────────────
  // ステップ7: DB保存（非同期）
  // PLC: FB_SaveDayLog の Done フラグ待ち
  // ───────────────────────────────────────
  try {
    await saveDayLog(data);  // 保存完了を待つ
    
    // ───────────────────────────────────────
    // ステップ8: バックアップ作成
    // ───────────────────────────────────────
    if (typeof createBackup === 'function') {
      await createBackup();  // 自動バックアップ
    }
    
    // ───────────────────────────────────────
    // ステップ9: 週進捗の再計算
    // ───────────────────────────────────────
    await updateWeekProgress();
    
  } catch (error) {
    console.error('Save failed:', error);
    // エラー時: ユーザーに通知（実装されていない場合はログのみ）
  }
}
```

**ST言語での類似コード**

```pascal
(* データ保存処理 *)
PROGRAM SaveData
VAR
    fbSaveDayLog : FB_SaveDayLog;
    fbGetWeekInfo : FB_GetISOWeekInfo;
    part1, part2, total : REAL;
    condition : STRING;
    weekInfo : WeekInfo_Struct;
    data : DayLog_Struct;
END_VAR

(* ステップ1: 入力値取得 *)
part1 := HMI_Part1;
part2 := HMI_Part2;

(* ステップ2: 入力検証 *)
IF part1 < 0.0 OR part2 < 0.0 THEN
    RETURN;  (* 負の値は不正 *)
END_IF

(* ステップ3: 合計計算 *)
total := part1 + part2;
HMI_Total := total;

(* ステップ4: コンディション取得 *)
IF HMI_RadioGood THEN
    condition := 'good';
ELSIF HMI_RadioNormal THEN
    condition := 'normal';
ELSIF HMI_RadioBad THEN
    condition := 'bad';
END_IF

(* ステップ5: ISO週情報計算 *)
fbGetWeekInfo.Execute := TRUE;
fbGetWeekInfo.Date := HMI_DateInput;
IF fbGetWeekInfo.Done THEN
    weekInfo := fbGetWeekInfo.WeekInfo;
    fbGetWeekInfo.Execute := FALSE;
END_IF

(* ステップ6: データ構造体作成 *)
data.date := HMI_DateInput;
data.elevation_part1 := part1;
data.elevation_part2 := part2;
data.elevation_total := total;
data.subjective_condition := condition;
data.iso_year := weekInfo.iso_year;
data.week_number := weekInfo.week_number;

(* ステップ7: DB保存 *)
fbSaveDayLog.Execute := TRUE;
fbSaveDayLog.Data := data;
IF fbSaveDayLog.Done THEN
    (* 保存完了 *)
    fbSaveDayLog.Execute := FALSE;
END_IF
```

---

## 4. iso-week.js の詳細解説（週計算ロジック）

```javascript
/**
 * 日付からISO 8601準拠の週情報を取得
 * 
 * ISO 8601の定義:
 * - 週の開始は月曜日
 * - その年の第1木曜日を含む週を第1週とする
 * - 12月の最終日が月～水曜日の場合、翌年の第1週に含まれる
 * 
 * PLCでの類似処理: 週番号計算ライブラリ
 */
function getISOWeekInfo(date) {
  // 元のdateオブジェクトを変更しないよう、コピーを作成
  const d = new Date(date.getTime());
  
  // ───────────────────────────────────────
  // ステップ1: その週の木曜日を求める
  // （ISO 8601では木曜日で年を判定）
  // ───────────────────────────────────────
  
  // 曜日取得: 0(日)～6(土)
  // 月曜基準に変換: 0(月)～6(日)
  const dayNum = (date.getDay() + 6) % 7;
  
  // 木曜日の日付にセット（月曜から+3日）
  d.setDate(d.getDate() - dayNum + 3);
  
  // その木曜日が属する年（ISO年）
  const isoYear = d.getFullYear();
  
  // ───────────────────────────────────────
  // ステップ2: その年の第1木曜日を求める
  // ───────────────────────────────────────
  
  // 1月4日は必ず第1週に含まれる（ISO 8601の性質）
  const firstThursday = new Date(isoYear, 0, 4);
  const firstThursdayDayNum = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstThursdayDayNum + 3);
  
  // ───────────────────────────────────────
  // ステップ3: 週番号の計算
  // ───────────────────────────────────────
  
  // 第1木曜日からの経過週数を計算
  const weekNumber = Math.floor(
    1 + (d.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  
  // ───────────────────────────────────────
  // ステップ4: 週の開始日（月曜）と終了日（日曜）
  // ───────────────────────────────────────
  
  const startDate = new Date(date.getTime());
  startDate.setDate(date.getDate() - dayNum);  // 月曜日
  
  const endDate = new Date(startDate.getTime());
  endDate.setDate(startDate.getDate() + 6);    // 日曜日
  
  // ───────────────────────────────────────
  // ステップ5: 日付フォーマット
  // ───────────────────────────────────────
  
  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  
  // 結果を返す
  return {
    iso_year: isoYear,                    // 例: 2026
    week_number: weekNumber,              // 例: 7
    start_date: formatDate(startDate),    // 例: "2026-02-09"（月曜）
    end_date: formatDate(endDate)         // 例: "2026-02-15"（日曜）
  };
}
```

**テストケース（確認用）**

```javascript
// 2026年2月9日（月曜日）
const result = getISOWeekInfo(new Date(2026, 1, 9));
console.log(result);
// => { iso_year: 2026, week_number: 7, start_date: "2026-02-09", end_date: "2026-02-15" }

// 年またぎのケース: 2026年1月1日（木曜日）→ 2026-W01
const result2 = getISOWeekInfo(new Date(2026, 0, 1));
console.log(result2);
// => { iso_year: 2026, week_number: 1, ... }

// 年またぎのケース: 2025年12月29日（月曜日）→ 2026-W01
const result3 = getISOWeekInfo(new Date(2025, 11, 29));
console.log(result3);
// => { iso_year: 2026, week_number: 1, ... }
```

---

## 5. データフロー図

### 5.1 入力 → 保存の流れ

```
┌──────────────────────────────────────────────────────┐
│ ユーザー操作: 入力欄に値を入力 → フォーカスアウト    │
└────────────────────┬─────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────┐
│ イベント: part1Input.addEventListener('blur', ...)   │
└────────────────────┬─────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────┐
│ saveData() 関数呼び出し                               │
│   1. 入力値取得                                       │
│   2. バリデーション（NaN, 負の数チェック）            │
│   3. 合計計算                                         │
│   4. コンディション取得                               │
│   5. ISO週情報計算                                    │
│   6. データオブジェクト作成                           │
└────────────────────┬─────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────┐
│ await saveDayLog(data)                                │
│   → db.js の saveDayLog() 実行                        │
│     └→ IndexedDB に書き込み                          │
└────────────────────┬─────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────┐
│ await createBackup()                                  │
│   → backup.js の createBackup() 実行                  │
│     └→ localStorage にバックアップ保存                │
└────────────────────┬─────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────┐
│ await updateWeekProgress()                            │
│   → 週合計の再計算                                    │
│   → 画面更新（週進捗表示）                            │
└──────────────────────────────────────────────────────┘
```

### 5.2 非同期処理のタイミング図

```
時間軸 →

User Input
    |
    ↓
[blur event]
    |
    ↓
saveData() 開始
    |
    ├─ 値取得・検証（同期処理）
    |
    ↓
await saveDayLog() ─────┐
    |                   │ 
    | [待機中]          │ IndexedDB書き込み
    |                   │ （非同期）
    ← ─────────────────┘ 完了
    |
    ↓
await createBackup() ───┐
    |                   │
    | [待機中]          │ localStorage書き込み
    |                   │ （非同期）
    ← ─────────────────┘ 完了
    |
    ↓
await updateWeekProgress()
    |
    ↓
saveData() 完了
```

**PLCスキャンとの違い**

```
PLC（スキャン実行）:
┌───┬───┬───┬───┬───┬───┐
│S1 │S2 │S3 │S4 │S5 │S6 │  スキャン毎に全処理実行
└───┴───┴───┴───┴───┴───┘

Web（イベント駆動）:
       [blur]        [change]
         ↓              ↓
       ┌───┐          ┌───┐
       │実行│          │実行│  イベント時のみ実行
       └───┘          └───┘
```

---

## 6. 実際にコードを追う手順（デバッガの使い方）

### 6.1 ブレークポイントの設定

1. **DevTools → Sources タブ**

2. **js/app.js を開く**

3. **ブレークポイント設定**
   ```
   106行目: async function saveData() {
   ↑ 行番号をクリック
   ```

### 6.2 ステップ実行

```
F10 (Step Over): 次の行へ
  - 関数呼び出しがあっても中に入らない
  - 現在の関数内での処理を1行ずつ実行

F11 (Step Into): 関数の中へ
  - 関数呼び出しがあったら、その関数の中に入る
  - 詳細な動作を追いたい時に使用

Shift+F11 (Step Out): 関数から出る
  - 現在の関数の残りを実行して呼び出し元に戻る

F8 (Resume): 次のブレークポイントまで実行
  - 通常実行に戻る
```

### 6.3 変数の確認方法

**Scopeパネル（右側）**

```
Scope
├─ Local (ローカル変数)
│  ├─ date: "2026-02-09"
│  ├─ part1: 800
│  ├─ part2: 700
│  └─ total: 1500
├─ Closure (クロージャ変数)
└─ Global (グローバル変数)
   ├─ dateInput: <input#current-date>
   └─ part1Input: <input#part1>
```

**Watch式（監視式）**

```
右クリック → "Add to Watch"
または
Watchパネルで式を入力:
  - total
  - part1 + part2
  - dateInput.value
```

**Console での確認**

```javascript
// ブレークポイントで停止中にConsoleで実行
console.log('current total:', total);
console.log('data object:', data);
```

---

## 7. まとめ

**理解すべきポイント**

1. **非同期処理**
   - `async/await` = PLCの完了フラグ待ち
   - `Promise` = 非同期操作のカプセル化

2. **イベント駆動**
   - `addEventListener` = イベントハンドラ登録
   - PLCのスキャン実行とは異なる実行モデル

3. **データフロー**
   - 入力 → 検証 → 保存 → 更新
   - 各ステップでエラーハンドリング

4. **デバッグ手法**
   - ブレークポイント = PLCのブレーク条件
   - ステップ実行 = PLCと同じ感覚
   - Scope表示 = デバイスモニタ

**次のステップ**

- 実際にブレークポイントを設定して処理を追う
- Console で関数を直接呼び出して動作確認
- 小さな改造を加えて動作を確認

これでコードの詳細な動作が理解できました。次は実際に手を動かして、理解を深めていきましょう！
