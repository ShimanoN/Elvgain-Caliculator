# Elevation Loom MVP仕様書 v3.2 (Implementation Final)

---

## 1. 目的

本アプリは、トレイルランナーが**日々の獲得標高トレーニングを客観的に把握し、判断の質を高めるための「鏡」**として機能することを目的とする。

- コーチングや指示は行わない
- 判断はユーザーに委ねる
- 数値と状態を正確に映すことに徹する

最終的なゴールは「再現可能なトレーニングプロセス」を蓄積し、その結果として**強くなった身体**を得ることにある。

---

## 2. 基本コンセプト

- フォーカスは**今週（ミクロサイクル）**のみ（ただし週ナビゲーションは実装で提供）
- 標準化された枠組みの中で、例外＝判断を正しく記録する
- 毎日見ることを前提としたUI（洗面台の鏡）
- **完全ローカル動作**: サーバー不要、オフライン完結

---

## 3. システム構成（実装済）

### 3.1 技術スタック

- **HTML5 / CSS3 / JavaScript (ES6+)**
- **No Modules**: `file://` プロトコルでの直接実行をサポートするため、ES6 Modules (`import`/`export`) は使用せず、`<script>` タグによる順序制御を採用。
- **IndexedDB**: 永続化ストレージ（ライブラリ不使用、生API使用）。
- **localStorage**: バックアップデータの保存に使用（最大10世代保持）。
- **html2canvas**: 画像エクスポート機能で使用（CDN経由で読み込み）。
- **自動バックアップ**: ローカル保存（localStorage）に日次/更新タイミングでスナップショットを保存。最新から最大10世代まで保持。

### 3.2 ファイル構成

index.html               (日次入力画面 / エントリーポイント)
week-target.html         (週目標設定画面)
css/style.css            (共通スタイル)
js/app.js                 (日次入力画面ロジック)
js/week-target.js         (週目標設定画面ロジック)
js/db.js                  (IndexedDB操作 - DayLog/WeekTarget CRUD)
js/iso-week.js            (ISO 8601 週計算ロジック)
js/calculations.js        (週合計・進捗計算ロジック)
js/chart.js               (週次グラフ描画：Canvasベース、累積プロット・目標ライン表示)
js/backup.js              (自動バックアップ機能：localStorageに最大10世代保持)
js/export-image.js        (画像エクスポート機能：html2canvas使用、週進捗のPNG出力)
js/sample-data.js         (サンプルデータ生成：テスト用の過去データ生成ツール)
js/test.js                (コアロジック検証用スクリプト)
scripts/run_local.sh      (ローカルサーバー起動スクリプト：Python3 http.server使用)
docs/Elevation_Loom_MVP仕様書_final.md (仕様書)

---

## 4. 画面構成 & 仕様

### 4.1 日次入力画面 (index.html)

**表示内容**

- **日付選択**: 前日/翌日ボタン、日付ピッカー
- **獲得標高**: 1部（午前）、2部（午後）、合計（自動計算）
- **主観コンディション**: 良い / 普通 / 悪い（ラジオボタン）
- **週進捗**: 週期間、目標、現在合計、差分（目標設定時のみ）

**仕様**

- **自動保存**: 入力欄からフォーカスアウト（`blur`）時、およびラジオボタン変更（`change`）時に即時 IndexedDB へ保存。実装では `part1`/`part2` の `blur` および `condition` の `change` にハンドラが設置されている。
- **日付遷移**: 「前日」「翌日」ボタンで遷移。遷移前に現在の入力内容を保存する処理は設計上考慮されているが、実装上は `blur` による保存を基本動作としている。
- **30日制限**: 本日から30日前まで遡り可能。それ以前の「前日」ボタンは無効化（disabled）。UI側でのボタン無効化（`updateNavButtons()`）が実装されている。
- **フィードバック**: 保存完了時のトースト等は表示しない（サイレント保存）。

※ 追加実装: 日次レコードは予定値フィールド `daily_plan_part1` / `daily_plan_part2` を持ち、週スケジュール（`week-target.html`）と連携して予定表示・編集が可能になっています。

### 4.2 週目標設定画面 (week-target.html)

**表示内容**

- **週情報**: ISO Week番号（例: 2026-W06）、期間
- **目標入力**: 該当週の目標獲得標高（数値）
- **現在進捗**: 現在の合計値
- **週間スケジュール**: 各日ごとの予定（1部/2部）、予定合計、実績、差異

**仕様（実装に合わせた更新）**

- **週ナビゲーション**: 実装では `prev` / `next` ボタンで過去／未来の週へ移動でき、各週ごとに目標設定が可能です（v3.0 の「今週のみ」は実装上変更）。
- **自動保存**: 目標入力欄からフォーカスアウト時に保存。日次の予定（スケジュール）も各セルの `blur` で `DayLog` に保存されます。

---

## 5. データモデル (IndexedDB: "TrainingMirrorDB" v1)

### 5.1 DayLog (Object Store)

| キー | 説明 | 備考 |
|---|---|---|
| date | 日付 (YYYY-MM-DD) | **Key Path** |
| elevation_part1 | 1部獲得標高 (Number) | |
| elevation_part2 | 2部獲得標高 (Number) | |
| elevation_total | 合計獲得標高 (Number) | 自動計算 |
| daily_plan_part1 | 1部予定 (Number|null) | 週スケジュールで入力される予定。実装で追加（v3.2）。 |
| daily_plan_part2 | 2部予定 (Number|null) | 週スケジュールで入力される予定。実装で追加（v3.2）。 |
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
| target_elevation | 目標獲得標高 (Number|null) | |
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

- **ロジック**: `db.js` の `getDayLogsByWeek` で該当週の全レコードを取得し、`elevation_total` を合算（実装は `calculateWeekTotal` にて提供）。
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

**方法1: 直接ブラウザで開く**
- `index.html` を Chrome 等のブラウザで直接開く（ダブルクリック可）。
- サーバー不要。

**方法2: ローカルサーバー経由（推奨）**
- `scripts/run_local.sh` を実行すると、Python3の簡易HTTPサーバーが起動し、自動的にブラウザで `index.html` が開きます。
- ポート 8000 で起動します。

---

## 8. 実装上の注意点 / 既知の差分

- **日次予定フィールド追加**: 実装では `DayLog` に `daily_plan_part1` / `daily_plan_part2` が追加され、`week-target.html` の週間スケジュールで予定を入力・保存できます。仕様書 v3.0 には未記載だったため本書で反映しました。
- **週ナビゲーション**: 実装は過去／未来週への移動と対象週の目標設定をサポートしています（仕様 v3.0 の「今週のみ」は実装に合わせて更新）。
- **グラフ描画の実装**: 仕様 v3.0 で Out-of-Scope とされていた週次グラフは、`chart.js`（Canvas）で実装済みです。特徴: 日次予定/実績の棒グラフ、累積線（予定/実績）、週目標ライン、英語曜日ラベルなど。
- **自動バックアップ**: 日次・週目標の保存時に自動でローカルバックアップを作成します（`backup.js`）。バックアップは `localStorage` に最大10世代保持されます。
- **画像エクスポート**: 週進捗セクションをPNG画像として出力できます（`export-image.js`、html2canvas使用）。
- **サンプルデータ生成**: テスト用のサンプルデータを生成するユーティリティを提供（`sample-data.js`）。過去数週間分のランダムデータを生成し、動作確認やデモに使用できます。
- **ローカルサーバー起動**: `scripts/run_local.sh` を使用することで、Python3の簡易HTTPサーバーが自動起動し、ブラウザで開くことができます。

---

## 9. 将来の拡張性 (Out of Scope for MVP)

- データのCSV/JSONエクスポート
- Strava等の外部連携

**実装済み機能（v3.2時点）**:
- 週進捗の画像エクスポート（PNG形式、`export-image.js` で実装済み）
- 自動バックアップ機能（`backup.js` で実装済み）
- サンプルデータ生成（`sample-data.js` で実装済み）
- グラフ表示（`chart.js` で実装済み）
- 過去/未来週の目標編集（実装済み）

（注）今後はCSV/JSONエクスポートや外部連携等を追加すると実用性が更に向上します。

**v3.2 制定日**: 2026/02/08
**ステータス**: 実装反映済・ドキュメント更新
