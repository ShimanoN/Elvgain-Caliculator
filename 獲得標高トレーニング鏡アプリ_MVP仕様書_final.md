# 獲得標高トレーニング鏡アプリ MVP仕様書 v3.0 (Implementation Final)

---

## 1. 目的

本アプリは、トレイルランナーが**日々の獲得標高トレーニングを客観的に把握し、判断の質を高めるための「鏡」**として機能することを目的とする。

- コーチングや指示は行わない
- 判断はユーザーに委ねる
- 数値と状態を正確に映すことに徹する

最終的なゴールは「再現可能なトレーニングプロセス」を蓄積し、その結果として**強くなった身体**を得ることにある。

---

## 2. 基本コンセプト

- フォーカスは**今週（ミクロサイクル）**のみ
- 標準化された枠組みの中で、例外＝判断を正しく記録する
- 毎日見ることを前提としたUI（洗面台の鏡）
- **完全ローカル動作**: サーバー不要、オフライン完結

---

## 3. システム構成（実装済）

### 3.1 技術スタック

- **HTML5 / CSS3 / JavaScript (ES6+)**
- **No Modules**: `file://` プロトコルでの直接実行をサポートするため、ES6 Modules (`import`/`export`) は使用せず、`<script>` タグによる順序制御を採用。
- **IndexedDB**: 永続化ストレージ（ライブラリ不使用、生API使用）。

### 3.2 ファイル構成

```
index.html          (日次入力画面 / エントリーポイント)
week-target.html    (週目標設定画面)
style.css           (共通スタイル - ミニマリストデザイン)
app.js              (日次入力画面ロジック)
week-target.js      (週目標設定画面ロジック)
db.js               (IndexedDB操作 - DayLog/WeekTarget CRUD)
iso-week.js         (ISO 8601 週計算ロジック)
calculations.js     (週合計・進捗計算ロジック)
test.js             (コアロジック検証用スクリプト)
```

---

## 4. 画面構成 & 仕様

### 4.1 日次入力画面 (index.html)

**表示内容**

- **日付選択**: 前日/翌日ボタン、日付ピッカー
- **獲得標高**: 1部（午前）、2部（午後）、合計（自動計算）
- **主観コンディション**: 良い / 普通 / 悪い（ラジオボタン）
- **週進捗**: 週期間、目標、現在合計、差分（目標設定時のみ）

**仕様**

- **自動保存**: 入力欄からフォーカスアウト（`blur`）時、およびラジオボタン変更（`change`）時に即時 IndexedDB へ保存。
- **日付遷移**: 「前日」「翌日」ボタンで遷移。遷移前に現在の入力内容を自動保存。
- **30日制限**: 本日から30日前まで遡り可能。それ以前の「前日」ボタンは無効化（disabled）。
- **フィードバック**: 保存完了時のトースト等は表示しない（サイレント保存）。

### 4.2 週目標設定画面 (week-target.html)

**表示内容**

- **週情報**: ISO Week番号（例: 2026-W06）、期間
- **目標入力**: 今週の目標獲得標高
- **現在進捗**: 現在の合計値

**仕様**

- **今週のみ**: 過去・未来の週の目標設定機能はなし。
- **自動保存**: 入力欄からフォーカスアウト時に保存。

---

## 5. データモデル (IndexedDB: "TrainingMirrorDB" v1)

### 5.1 DayLog (Object Store)

| キー | 説明 | 備考 |
|---|---|---|
| date | 日付 (YYYY-MM-DD) | **Key Path** |
| elevation_part1 | 1部獲得標高 (Number) | |
| elevation_part2 | 2部獲得標高 (Number) | |
| elevation_total | 合計獲得標高 (Number) | 自動計算 |
| subjective_condition | コンディション (String) | "good", "normal", "bad" |
| iso_year | ISO週年 (Number) | Index: `week` |
| week_number | ISO週番号 (Number) | Index: `week` |
| timezone | タイムゾーン (String) | 固定: "Asia/Tokyo" |
| created_at | 作成日時 (ISO String) | |
| updated_at | 更新日時 (ISO String) | |

### 5.2 WeekTarget (Object Store)

| キー | 説明 | 備考 |
|---|---|---|
| key | 週ID (YYYY-Wnn) | **Key Path** |
| target_elevation | 目標獲得標高 (Number) | |
| iso_year | ISO週年 (Number) | |
| week_number | ISO週番号 (Number) | |
| start_date | 週開始日 (YYYY-MM-DD) | |
| end_date | 週終了日 (YYYY-MM-DD) | |
| created_at | 作成日時 (ISO String) | |
| updated_at | 更新日時 (ISO String) | |

---

## 6. ロジック仕様

### 6.1 ISO Week計算

- **定義**: ISO 8601準拠。月曜始まり、第1木曜日を含む週を第1週とする。
- **実装**: `iso-week.js` / `getISOWeekInfo(date)`
- **境界**: 月曜日のデータは新しい週として集計される。

### 6.2 週合計計算

- **ロジック**: `db.js` の `getDayLogsByWeek` で該当週の全レコードを取得し、`elevation_total` を合算。
- **タイミング**: 画面表示時、およびデータ保存直後に再計算して表示更新。

---

## 7. 検証・品質保証

### 7.1 検証済み項目

- **Test 1**: 入力データの永続化（リロード後の保持）
- **Test 2**: 日付変更時のデータ切り替えと週合計の正しい集計
- **Test 3**: 週目標設定と差分表示の整合性
- **Test 4**: `blur` イベントによる自動保存
- **Test 5**: 30日遡り制限（UI無効化）
- **Test 6**: ラジオボタン（コンディション）の保存
- **Test 7**: ISO週境界（月曜またぎ）での集計リセット

### 7.2 起動方法

- `index.html` を Chrome 等のブラウザで直接開く（ダブルクリック可）。
- サーバー不要。

---

## 8. 将来の拡張性 (Out of Scope for MVP)

- データのCSV/JSONエクスポート
- グラフによる可視化
- 過去データのリスト表示
- Strava等の外部連携

---

**v3.0 制定日**: 2026/02/08
**ステータス**: 実装完了・本番稼働可能
