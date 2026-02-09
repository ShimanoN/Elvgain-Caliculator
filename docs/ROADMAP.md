# Elevation Loom 開発ロードマップ

このドキュメントでは、Elevation Loomの開発計画を学習フェーズと機能拡張フェーズに分けて示します。

---

## 現在地

```
✅ Phase 1 完了: 開発環境の整備
   - ESLint導入（コード品質チェック）
   - Prettier導入（自動整形）
   - Git hooks（pre-commit自動チェック）

📍 現在: Phase 2 の準備完了
   - コードベースの理解
   - ドキュメント整備完了
   
🎯 次のステップ: Phase 2（テスト環境構築）または機能拡張
```

---

## Phase 1: 開発環境の整備（✅完了）

### 実施内容

1. **ESLint導入**
   - コード品質チェックツールの導入
   - ルール設定: `eslint.config.js`
   - ブラウザ環境用の設定
   - グローバル変数の定義

2. **Prettier導入**
   - コード自動整形ツールの導入
   - スタイル設定: `.prettierrc`
   - タブ幅: 2スペース
   - シングルクォート使用

3. **Git hooks設定**
   - Husky導入
   - pre-commitフックで自動チェック
   - lint-stagedでステージングファイルのみチェック

### 成果

- ✅ コードスタイルの統一
- ✅ よくあるバグの自動検出
- ✅ コミット前の自動品質チェック
- ✅ チーム開発への準備

### 使用コマンド

```bash
# ESLintでコードチェック
npm run lint

# ESLintで自動修正
npm run lint:fix

# Prettierでフォーマット
npm run format

# フォーマットチェック（修正なし）
npm run format:check
```

### 所要時間

1-2時間（既に完了）

### PLCとの対応

- **ESLint** = PLCプログラムの構文チェック機能
- **Prettier** = 自動インデント整形
- **Git hooks** = コンパイル前の自動検証

---

## Phase 2: テスト環境構築（次のステップ）

### 目的

- コードの信頼性向上
- リファクタリングの安全性確保
- バグの早期発見
- デプロイ前の品質保証

### 実施内容

#### 2.1 Vitest環境構築（ユニットテスト）

**インストール**

```bash
npm install -D vitest @vitest/ui @vitest/browser
```

**設定ファイル作成: `vitest.config.js`**

```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom', // ブラウザ環境のシミュレーション
    setupFiles: './test/setup.js',
  },
});
```

**package.jsonにスクリプト追加**

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

#### 2.2 IndexedDBモックの作成

**`test/mocks/indexedDB.js`**

```javascript
import 'fake-indexeddb/auto';
```

これでテスト環境でもIndexedDBが使えるようになります。

#### 2.3 ユニットテストの作成

**テスト1: ISO週計算（`test/iso-week.test.js`）**

```javascript
import { describe, it, expect } from 'vitest';
import { getISOWeekInfo } from '../js/iso-week.js';

describe('getISOWeekInfo', () => {
  it('2026-02-09（月）は2026-W07', () => {
    const date = new Date(2026, 1, 9); // 2月9日
    const result = getISOWeekInfo(date);
    
    expect(result.iso_year).toBe(2026);
    expect(result.week_number).toBe(7);
    expect(result.start_date).toBe('2026-02-09');
    expect(result.end_date).toBe('2026-02-15');
  });
  
  it('年またぎ: 2025-12-29（月）は2026-W01', () => {
    const date = new Date(2025, 11, 29);
    const result = getISOWeekInfo(date);
    
    expect(result.iso_year).toBe(2026);
    expect(result.week_number).toBe(1);
  });
  
  it('年またぎ: 2026-01-01（木）は2026-W01', () => {
    const date = new Date(2026, 0, 1);
    const result = getISOWeekInfo(date);
    
    expect(result.iso_year).toBe(2026);
    expect(result.week_number).toBe(1);
  });
});
```

**テスト2: 週集計計算（`test/calculations.test.js`）**

```javascript
import { describe, it, expect } from 'vitest';
import { calculateWeekTotal } from '../js/calculations.js';

describe('calculateWeekTotal', () => {
  it('空配列の場合は0', () => {
    const result = calculateWeekTotal([]);
    expect(result).toBe(0);
  });
  
  it('単一データの合計', () => {
    const logs = [
      { elevation_total: 1500 }
    ];
    const result = calculateWeekTotal(logs);
    expect(result).toBe(1500);
  });
  
  it('複数データの合計', () => {
    const logs = [
      { elevation_total: 1000 },
      { elevation_total: 1500 },
      { elevation_total: 800 }
    ];
    const result = calculateWeekTotal(logs);
    expect(result).toBe(3300);
  });
});
```

**テスト3: データベース操作（`test/db.test.js`）**

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { initDB, saveDayLog, getDayLog } from '../js/db.js';

describe('Database operations', () => {
  beforeEach(async () => {
    // 各テスト前にDBを初期化
    await initDB();
  });
  
  it('データの保存と取得', async () => {
    const testData = {
      date: '2026-02-09',
      elevation_part1: 800,
      elevation_part2: 700,
      elevation_total: 1500,
      subjective_condition: 'good',
      iso_year: 2026,
      week_number: 7
    };
    
    // 保存
    await saveDayLog(testData);
    
    // 取得
    const retrieved = await getDayLog('2026-02-09');
    
    expect(retrieved.date).toBe('2026-02-09');
    expect(retrieved.elevation_total).toBe(1500);
    expect(retrieved.subjective_condition).toBe('good');
  });
  
  it('存在しないデータの取得はundefined', async () => {
    const result = await getDayLog('2099-12-31');
    expect(result).toBeUndefined();
  });
});
```

#### 2.4 Playwright導入（E2Eテスト）

**インストール**

```bash
npm install -D @playwright/test
npx playwright install
```

**設定ファイル作成: `playwright.config.js`**

```javascript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:8000',
  },
  webServer: {
    command: 'python3 -m http.server 8000',
    port: 8000,
    reuseExistingServer: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

**E2Eテスト例: `e2e/daily-input.spec.js`**

```javascript
import { test, expect } from '@playwright/test';

test('日次入力の基本フロー', async ({ page }) => {
  // ページを開く
  await page.goto('/');
  
  // 入力欄に値を入力
  await page.fill('#part1', '800');
  await page.fill('#part2', '700');
  
  // フォーカスを外す（自動保存トリガー）
  await page.click('body');
  
  // 合計が表示されることを確認
  await expect(page.locator('#daily-total')).toHaveText('1500');
  
  // ページをリロード
  await page.reload();
  
  // データが保持されていることを確認
  await expect(page.locator('#part1')).toHaveValue('800');
  await expect(page.locator('#part2')).toHaveValue('700');
});

test('週進捗の表示', async ({ page }) => {
  await page.goto('/');
  
  // 週進捗セクションが表示されることを確認
  await expect(page.locator('.week-progress')).toBeVisible();
  
  // 週情報が表示されることを確認
  await expect(page.locator('#week-range')).not.toBeEmpty();
});
```

### 前提条件

- Phase 1完了
- Chrome DevToolsの基本操作を理解
- JavaScriptの基本文法を理解

### 完了条件

- ✅ コアロジックのテストカバレッジ80%以上
- ✅ 主要フローのE2Eテスト3本以上
- ✅ `npm test`で全テストが通る
- ✅ CIでテストが自動実行される（GitHub Actions）

### 所要時間

2-3時間

### PLCとの対応

- **ユニットテスト** = FB単体のシミュレーション
- **E2Eテスト** = 実機での動作確認
- **テストカバレッジ** = プログラムの検証率
- **CI/CD** = 自動ビルド・テストシステム

---

## Phase 3: TypeScript導入（推奨）

### 目的

- 型安全性の向上（ST言語に近い開発体験）
- エラーの事前検出（コンパイル時）
- IDE補完の強化
- リファクタリングの安全性向上

### 実施内容

#### 3.1 TypeScript環境構築

**インストール**

```bash
npm install -D typescript @types/node
```

**tsconfig.json 作成**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "allowJs": true,
    "checkJs": false
  },
  "include": ["js/**/*", "test/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### 3.2 型定義の作成

**`types/index.ts`**

```typescript
// 日次ログの型定義
export interface DayLog {
  date: string; // YYYY-MM-DD
  elevation_part1: number;
  elevation_part2: number;
  elevation_total: number;
  daily_plan_part1?: number | null;
  daily_plan_part2?: number | null;
  subjective_condition: 'good' | 'normal' | 'bad' | null;
  iso_year: number;
  week_number: number;
  timezone: string;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

// 週目標の型定義
export interface WeekTarget {
  key: string; // YYYY-Wnn
  target_elevation: number | null;
  iso_year: number;
  week_number: number;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

// ISO週情報の型定義
export interface ISOWeekInfo {
  iso_year: number;
  week_number: number;
  start_date: string;
  end_date: string;
}

// 週進捗の型定義
export interface WeekProgress {
  target: number | null;
  current: number;
  remaining: number;
  percentage: number;
  days: DayLog[];
}
```

#### 3.3 段階的な移行

**ステップ1: 型定義ファイルのみ作成（`.d.ts`）**

```typescript
// js/db.d.ts
import { DayLog, WeekTarget } from '../types';

export function initDB(): Promise<IDBDatabase>;
export function getDayLog(date: string): Promise<DayLog | undefined>;
export function saveDayLog(data: DayLog): Promise<void>;
export function getWeekTarget(weekKey: string): Promise<WeekTarget | undefined>;
export function saveWeekTarget(data: WeekTarget): Promise<void>;
```

**ステップ2: JSファイルをTSに変換**

```bash
# 1ファイルずつ変換
mv js/iso-week.js js/iso-week.ts
mv js/calculations.js js/calculations.ts
# ... 順次変換
```

**ステップ3: 型アノテーションの追加**

```typescript
// 変換前（JavaScript）
function getISOWeekInfo(date) {
  // ...
}

// 変換後（TypeScript）
function getISOWeekInfo(date: Date): ISOWeekInfo {
  // ...
  return {
    iso_year: isoYear,
    week_number: weekNumber,
    start_date: formatDate(startDate),
    end_date: formatDate(endDate),
  };
}
```

#### 3.4 TypeScriptの恩恵を実感

**型エラーの検出**

```typescript
// ❌ コンパイルエラー: 型が合わない
const log: DayLog = {
  date: '2026-02-09',
  elevation_part1: 'invalid', // ← number型に string を代入
  // ...
};

// ✅ 正しい型
const log: DayLog = {
  date: '2026-02-09',
  elevation_part1: 800,
  // ...
};
```

**IDE補完の強化**

```typescript
const log = await getDayLog('2026-02-09');

// log. を入力すると、以下の候補が表示される:
// - date
// - elevation_part1
// - elevation_part2
// - subjective_condition
// など、DayLog型のフィールドすべて
```

### 前提条件

- Phase 2完了（テストがあると安心してリファクタリングできる）
- JavaScriptの基本を理解

### 完了条件

- ✅ 全ファイルが`.ts`に移行
- ✅ 型エラーゼロ
- ✅ `npm run build`（tsc）が成功
- ✅ テストも型付きに移行

### 所要時間

3-4時間

### PLCとの対応

| TypeScript | PLC/ST |
|-----------|--------|
| `interface` | `STRUCT`（構造体） |
| `type` | `TYPE`（型定義） |
| `number` | `INT`, `REAL` |
| `string` | `STRING` |
| `boolean` | `BOOL` |
| `null \| undefined` | `オプショナル変数` |

**ST言語との比較**

```pascal
(* ST: 型定義 *)
TYPE DayLog : STRUCT
    date : STRING;
    elevation_part1 : INT;
    elevation_part2 : INT;
    elevation_total : INT;
    condition : (good, normal, bad);
END_STRUCT
END_TYPE
```

```typescript
// TypeScript: 型定義
interface DayLog {
  date: string;
  elevation_part1: number;
  elevation_part2: number;
  elevation_total: number;
  subjective_condition: 'good' | 'normal' | 'bad';
}
```

---

## Phase 4: ビルド環境整備（任意）

### 目的

- 開発効率の向上
- モジュールバンドル（ファイル分割の最適化）
- 本番環境への準備
- ホットリロード（変更即反映）

### 実施内容

#### 4.1 Vite導入

**インストール**

```bash
npm install -D vite
```

**設定ファイル作成: `vite.config.js`（または`.ts`）**

```javascript
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        weekTarget: 'week-target.html'
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
```

#### 4.2 package.jsonスクリプト整備

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

#### 4.3 ES Modulesへの移行

**現在のコード（グローバルスコープ）**

```html
<!-- index.html -->
<script src="js/db.js"></script>
<script src="js/iso-week.js"></script>
<script src="js/app.js"></script>
```

**Vite使用後（ES Modules）**

```html
<!-- index.html -->
<script type="module" src="js/app.js"></script>
```

```javascript
// js/app.js
import { getDayLog, saveDayLog } from './db.js';
import { getISOWeekInfo } from './iso-week.js';

// ... メインコード
```

### 前提条件

- Phase 3完了（TypeScript化済みが望ましい）

### 完了条件

- ✅ `npm run dev`で開発サーバー起動
- ✅ ホットリロード（変更即反映）が動作
- ✅ `npm run build`でビルド成果物生成
- ✅ `dist/`フォルダに最適化されたファイル

### 所要時間

2-3時間

### メリット

- **高速な開発サーバー**: Viteは超高速
- **ホットリロード**: ファイル変更が即座に反映
- **コード分割**: 必要な部分のみ読み込み
- **本番最適化**: ミニファイ、Tree-shaking

---

## 機能拡張計画（Phase 5以降）

Phase 1-4で基盤が整ったら、以下の機能拡張を検討します。

---

### 優先度A: データ分析＆インサイト機能

#### 目的

- トレーニングデータから「気づき」を得る
- 「鏡」としての機能を強化
- 数値を見るだけでなく、傾向を把握

#### 実施内容

**1. 週ごとのトレンド分析**

```javascript
// 移動平均の計算
function calculateMovingAverage(weekData, period = 4) {
  const values = weekData.map(w => w.total);
  const movingAvg = [];
  
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      movingAvg.push(null);
    } else {
      const sum = values.slice(i - period + 1, i + 1)
                        .reduce((a, b) => a + b, 0);
      movingAvg.push(sum / period);
    }
  }
  
  return movingAvg;
}

// 前週比・前月比の計算
function calculateWeekOverWeek(currentWeek, previousWeek) {
  const diff = currentWeek.total - previousWeek.total;
  const percentage = (diff / previousWeek.total) * 100;
  
  return {
    diff,
    percentage,
    trend: diff > 0 ? 'up' : 'down'
  };
}
```

**2. コンディションと標高の相関分析**

```javascript
// コンディション別の平均標高
function analyzeConditionElevation(logs) {
  const byCondition = {
    good: [],
    normal: [],
    bad: []
  };
  
  logs.forEach(log => {
    if (log.subjective_condition) {
      byCondition[log.subjective_condition].push(log.elevation_total);
    }
  });
  
  return {
    good: average(byCondition.good),
    normal: average(byCondition.normal),
    bad: average(byCondition.bad)
  };
}

// インサイト生成
function generateInsights(analysis) {
  const insights = [];
  
  if (analysis.good > analysis.normal * 1.2) {
    insights.push('「良い」の日は平均20%以上多く登っています');
  }
  
  if (analysis.bad < analysis.normal * 0.8) {
    insights.push('「悪い」の日は控えめなトレーニングになっています');
  }
  
  return insights;
}
```

**3. 週パターンの自動診断**

```javascript
function analyzeWeekPattern(weekLogs) {
  // 前半集中型かどうか
  const firstHalf = weekLogs.slice(0, 3).reduce((sum, log) => sum + log.elevation_total, 0);
  const secondHalf = weekLogs.slice(4).reduce((sum, log) => sum + log.elevation_total, 0);
  
  const patterns = [];
  
  if (firstHalf > secondHalf * 1.5) {
    patterns.push({
      type: 'front_loaded',
      message: '前半飛ばしすぎ傾向: 後半にもう少し余力を'
    });
  }
  
  // 週末集中型
  const weekend = weekLogs.slice(5).reduce((sum, log) => sum + log.elevation_total, 0);
  if (weekend > weekLogs.reduce((sum, log) => sum + log.elevation_total, 0) * 0.5) {
    patterns.push({
      type: 'weekend_focused',
      message: '週末集中型: 平日にも分散できないか検討'
    });
  }
  
  return patterns;
}
```

**4. ビジュアライゼーション強化**

- **ヒートマップカレンダー**（GitHub風）
- **月間・年間サマリーダッシュボード**
- **トレンドグラフ**（移動平均線）

#### 所要時間

4-6時間

---

### 優先度A: CSV/JSONエクスポート＆インポート

#### 目的

- データのバックアップ
- 外部ツールとの連携
- 長期データの分析

#### 実施内容

**1. CSVエクスポート**

```javascript
async function exportToCSV() {
  // 全データを取得
  const logs = await getAllDayLogs();
  
  // CSVヘッダー
  const header = [
    'date',
    'elevation_part1',
    'elevation_part2',
    'elevation_total',
    'subjective_condition',
    'iso_year',
    'week_number'
  ].join(',');
  
  // CSVボディ
  const rows = logs.map(log => {
    return [
      log.date,
      log.elevation_part1 || 0,
      log.elevation_part2 || 0,
      log.elevation_total || 0,
      log.subjective_condition || '',
      log.iso_year,
      log.week_number
    ].join(',');
  });
  
  // CSV文字列を生成
  const csv = [header, ...rows].join('\n');
  
  // ダウンロード
  downloadFile(csv, 'elevation-data.csv', 'text/csv');
}
```

**2. JSONエクスポート**

```javascript
async function exportToJSON() {
  const logs = await getAllDayLogs();
  const targets = await getAllWeekTargets();
  
  const data = {
    version: '1.0',
    exported_at: new Date().toISOString(),
    day_logs: logs,
    week_targets: targets
  };
  
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, 'elevation-backup.json', 'application/json');
}
```

**3. インポート機能**

```javascript
async function importFromJSON(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  
  // バリデーション
  if (!data.version || !data.day_logs) {
    throw new Error('Invalid backup file');
  }
  
  // データをインポート
  for (const log of data.day_logs) {
    await saveDayLog(log);
  }
  
  for (const target of data.week_targets) {
    await saveWeekTarget(target);
  }
  
  alert(`${data.day_logs.length}件のデータをインポートしました`);
}
```

#### 所要時間

2-3時間

---

### 優先度B: PWA化

#### 目的

- インストール可能なアプリに
- オフライン動作の完全保証
- スマホ最適化

#### 実施内容

**1. Service Worker導入**

```javascript
// sw.js
const CACHE_NAME = 'elevation-loom-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/week-target.html',
  '/css/style.css',
  '/js/app.js',
  '/js/db.js',
  // ... その他のファイル
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
```

**2. manifest.json作成**

```json
{
  "name": "Elevation Loom",
  "short_name": "ElevLoom",
  "description": "トレイルランニング獲得標高トラッカー",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4CAF50",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**3. レスポンシブデザイン最適化**

```css
/* スマホ最適化 */
@media (max-width: 768px) {
  .input-row {
    flex-direction: column;
  }
  
  button {
    width: 100%;
    margin: 0.5rem 0;
  }
}
```

#### 所要時間

3-4時間

---

### 優先度B: AIコーチング機能（Claude API活用）

#### 目的

- データから「気づき」を提示
- 週末の振り返りコメント生成
- モチベーション維持

#### 実施内容

**1. Claude API統合**

```javascript
async function generateWeeklyInsight(weekData) {
  const prompt = `
あなたはトレイルランニングのコーチです。
以下の1週間のトレーニングデータを分析し、
簡潔なフィードバックを提供してください。

データ:
${JSON.stringify(weekData, null, 2)}

目標: ${weekData.target}m
実績: ${weekData.current}m

以下の観点でコメントしてください:
1. 目標達成状況
2. 週内のペース配分
3. コンディションの傾向
4. 次週へのアドバイス
`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY, // 環境変数から取得
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  });
  
  const data = await response.json();
  return data.content[0].text;
}
```

**2. インサイト表示UI**

```html
<div class="weekly-insight">
  <h3>今週の振り返り 🏃</h3>
  <div id="ai-insight" class="insight-content">
    <!-- Claude APIからの応答を表示 -->
  </div>
  <button id="generate-insight">インサイトを生成</button>
</div>
```

#### 注意事項

- **APIキーの管理**: 環境変数で管理、コードにハードコーディングしない
- **コスト管理**: API利用料が発生するため、使用回数を制限
- **プライバシー**: データを外部に送信することを明示

#### 所要時間

4-5時間

---

### 優先度C: その他のアイデア

- **音声入力機能**（Web Speech API）
  - 「800メートル」→ 自動入力
  
- **データビジュアライゼーション強化**
  - 3D地形図表示
  - アニメーション付きグラフ
  
- **目標達成予測**
  - 機械学習で週末時点での達成予測
  
- **チーム共有機能**
  - Firebase連携でチームメンバーとデータ共有

---

## 判断基準：次に何をやるか？

### 基盤強化を優先すべき場合

```
✅ コードの信頼性を高めたい
   → Phase 2（テスト環境構築）

✅ ST言語的な型付き開発をしたい
   → Phase 3（TypeScript導入）

✅ 開発効率を上げたい
   → Phase 4（Vite導入）
```

### 機能追加を優先すべき場合

```
✅ データから気づきを得たい
   → データ分析＆インサイト機能

✅ バックアップを充実させたい
   → CSV/JSONエクスポート機能

✅ スマホで使いたい
   → PWA化

✅ AIの力を借りたい
   → AIコーチング機能
```

### 学習を優先すべき場合

```
✅ まず理解を深めたい
   → docs/CODE_WALKTHROUGH.md を熟読
   → 小改造タスクに挑戦

✅ 実践しながら学びたい
   → docs/QUICK_START_FOR_PLC_ENGINEERS.md
   → Level 1-5の改造タスク
```

---

## タイムライン目安

```
【1週目】
✅ Phase 1完了（既に完了）
✅ ドキュメント理解
✅ 小改造タスク

【2-3週目】
□ Phase 2（テスト環境構築）
  - Vitest導入
  - ユニットテスト作成
  - E2Eテスト作成

【4-5週目】
□ Phase 3（TypeScript導入）
  - 型定義作成
  - JS→TS段階移行
  - 型エラー解消

【6週目】
□ Phase 4（Vite導入）
  - ビルド環境構築
  - ES Modules移行
  - 開発サーバー確認

【7週目以降】
□ 機能拡張（優先度順）
  - データ分析機能
  - CSV/JSONエクスポート
  - PWA化
  - など
```

---

## まとめ

### 現在の状態

- ✅ 基本機能は完成
- ✅ コード品質ツール導入済み
- ✅ ドキュメント整備完了

### 推奨される次のステップ

1. **学習重視**: `CODE_WALKTHROUGH.md` + 小改造タスク
2. **品質重視**: Phase 2（テスト環境構築）
3. **機能重視**: データ分析機能 or CSV/JSONエクスポート

### 長期的な目標

- テストカバレッジ80%以上
- TypeScript化による型安全性
- PWA化によるネイティブアプリ体験
- AIによるインサイト提供

---

**次に何をするか迷ったら、このロードマップに戻ってきてください。**
**あなたの目的と状況に合わせて、最適なフェーズを選択しましょう。**
