# JavaScript Files Organization

このディレクトリには、Elevation LoomアプリケーションのすべてのJavaScriptファイルが含まれています。

## ファイル構成

### コアライブラリ (Core Libraries)
- **iso-week.js** - ISO週番号の計算ユーティリティ
- **date-utils.js** - 日付のフォーマットとパース処理（ローカルタイム対応）
- **calculations.js** - 進捗計算ロジック

### データ層 (Data Layer)
- **db.js** - IndexedDBデータベース操作
- **backup.js** - バックアップ/復元機能

### UI/ビュー層 (UI/View Layer)
- **app.js** - メインアプリケーションロジック（index.html用）
- **week-target.js** - 週目標管理ページのロジック（week-target.html用）
- **chart.js** - チャート描画機能
- **export-image.js** - 画像エクスポート機能

### 開発/デモ用 (Development/Demo)
- **sample-data.js** - サンプルデータ生成（デモ用）
  - `window.sampleData.generate()` でブラウザコンソールから使用可能
- **dev/** - 開発用ユーティリティ
  - **dev/test.js** - テストユーティリティ（プロダクションでは未使用）

## 重要な注意事項

### スクリプトの読み込み順序
このアプリケーションはES6モジュールを使用せず、グローバルスコープで関数を共有します。
そのため、HTMLファイル内のscriptタグの読み込み順序が重要です。

**依存関係の順序:**
1. iso-week.js（他のファイルから使用される）
2. date-utils.js（日付ユーティリティ）
3. db.js（データ操作の基盤）
4. backup.js、calculations.js（dbに依存）
5. chart.js（データ層に依存）
6. app.js または week-target.js（すべてに依存）

### グローバル関数
以下の関数はグローバルスコープで共有されています：
- `getDayLog`, `saveDayLog`, `deleteDayLog` (db.js)
- `getDayLogsByWeek`, `getAllDayLogs` (db.js)
- `getWeekTarget`, `saveWeekTarget`, `deleteWeekTarget`, `getAllWeekTargets` (db.js)
- `getISOWeekInfo` (iso-week.js)
- `formatDateLocal`, `parseDateLocal` (date-utils.js)
- `calculateWeekTotal`, `calculateWeekProgress` (calculations.js)
- `renderChart`, `drawWeeklyChart` (chart.js)
- その他

詳細は `eslint.config.js` の globals セクションを参照してください。
