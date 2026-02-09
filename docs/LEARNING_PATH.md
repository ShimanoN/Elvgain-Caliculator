# Web開発学習パス - PLC/ST技術者向け

本ドキュメントは、PLC（Programmable Logic Controller）やST（Structured Text）言語の経験を持つ技術者が、Web開発の世界に移行するための体系的な学習ロードマップを提供します。

---

## 1. PLC ↔ Web 対応表

PLCプログラミングとWeb開発の概念対応を理解することで、既存の知識を活用できます。

### 基本概念の対応

| PLC/ST | Web開発 | 説明 |
|--------|---------|------|
| **ラベル/デバイス** | **変数/ID** | データを識別する名前。PLCの`D100`は、Web開発では`const elevation = 100`のような変数として扱います |
| **ST言語** | **JavaScript** | ロジックを記述する言語。STは型付き言語、JavaScriptは動的型付け（TypeScriptで型を追加可能） |
| **FB（Function Block）** | **関数（function）** | 再利用可能なコードブロック。入力・出力・内部処理の構造は同じ |
| **保持型メモリ（Retentive）** | **IndexedDB / localStorage** | 電源OFF後もデータを保持する仕組み |
| **スキャン実行** | **イベント駆動** | PLCは定期的にプログラムを実行、Webはユーザー操作やタイマーに反応 |
| **HMI画面** | **DOM（HTML/CSS）** | ユーザーインターフェース。ボタン、入力欄、表示領域など |
| **PLC ↔ HMI通信** | **JavaScript ↔ DOM操作** | PLCが内部メモリを更新してHMIに反映するように、JavaScriptがDOM要素を更新 |
| **完了フラグ待ち** | **async/await** | 処理の完了を待つ仕組み。非同期処理の制御 |
| **タイマー・カウンタ** | **setTimeout / setInterval** | 時間ベースの処理制御 |
| **シーケンス制御** | **Promise チェーン** | 順次処理の実装方法 |

### データ型の対応

| PLC/ST | JavaScript | TypeScript | 例 |
|--------|-----------|-----------|-----|
| `INT` | `number` | `number` | `let count = 42;` |
| `REAL` | `number` | `number` | `let elevation = 1234.5;` |
| `STRING` | `string` | `string` | `let name = "training";` |
| `BOOL` | `boolean` | `boolean` | `let isActive = true;` |
| `ARRAY` | `Array` | `Array<T>` | `let data = [1, 2, 3];` |
| `STRUCT` | `Object` | `interface` | `let log = {date: "2026-02-09", elevation: 1500};` |

### 処理フローの対応

**PLCのスキャン実行**
```
┌─────────────────┐
│   入力読み取り     │
└────────┬────────┘
         ↓
┌─────────────────┐
│  プログラム実行    │  ← 毎スキャン実行
└────────┬────────┘
         ↓
┌─────────────────┐
│   出力書き込み     │
└─────────────────┘
```

**Webのイベント駆動**
```
┌─────────────────┐
│  ユーザー操作     │ ← ボタンクリック、入力など
└────────┬────────┘
         ↓
┌─────────────────┐
│ イベントハンドラ  │  ← 必要な時だけ実行
└────────┬────────┘
         ↓
┌─────────────────┐
│   DOM更新        │
└─────────────────┘
```

---

## 2. このアプリの構造（PLC的理解）

Elevation Loomアプリを、PLCのFB（ファンクションブロック）階層として理解します。

### FBの階層構造

```
┌────────────────────────────────────────────────────┐
│  Main Program (index.html / app.js)                │
│  ┌──────────────────────────────────────────────┐ │
│  │  FB_LoadData()                               │ │
│  │  - 入力: date (String)                        │ │
│  │  - 出力: dayLog (Object)                      │ │
│  │  - 処理: IndexedDBからデータ取得              │ │
│  └──────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────┐ │
│  │  FB_SaveData()                               │ │
│  │  - 入力: date, part1, part2, condition       │ │
│  │  - 出力: success (Boolean)                    │ │
│  │  - 処理: データ検証 → DB保存 → バックアップ   │ │
│  └──────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────┐ │
│  │  FB_UpdateWeekProgress()                     │ │
│  │  - 入力: weekInfo (Object)                   │ │
│  │  - 出力: weekSummary (Object)                │ │
│  │  - 処理: 週集計 → 進捗計算 → 画面更新        │ │
│  └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  Low-level FB Library (db.js, iso-week.js など)    │
│  ┌──────────────┐  ┌──────────────┐              │
│  │ getDayLog()  │  │ saveDayLog() │              │
│  └──────────────┘  └──────────────┘              │
│  ┌──────────────┐  ┌──────────────┐              │
│  │getISOWeekInfo│  │calculateWeek │              │
│  │     ()       │  │  Total()     │              │
│  └──────────────┘  └──────────────┘              │
└────────────────────────────────────────────────────┘
```

### データフロー（ラダー図的表現）

**「1部入力」の処理フロー**

```
┌──[ part1Input.blur イベント ]──┐
│                                 │
├──[ 入力値取得 ]─────────────────┤
│   const value = part1Input.value│
│                                 │
├──[ 数値検証 ]───────────────────┤
│   if (isNaN(value)) return;    │
│   if (value < 0) return;       │
│                                 │
├──[ 合計計算 ]───────────────────┤
│   total = part1 + part2        │
│                                 │
├──[ オブジェクト作成 ]───────────┤
│   dayLog = {                   │
│     date: "2026-02-09",        │
│     elevation_part1: value,    │
│     elevation_part2: ...       │
│   }                            │
│                                 │
├──[ DB保存（非同期）]────────────┤
│   await saveDayLog(dayLog)     │
│   ↓                            │
│   [完了フラグ待ち]             │
│                                 │
├──[ バックアップ作成 ]───────────┤
│   await createBackup()         │
│                                 │
├──[ 画面更新 ]───────────────────┤
│   dailyTotalSpan.textContent   │
│   weekCurrentSpan.textContent  │
│                                 │
└──[ 処理完了 ]───────────────────┘
```

### 保持型メモリの仕組み

**PLCの保持型メモリ**
```
┌─────────────────┐
│  D100: 電源OFF  │
│   でも保持      │ → バッテリーバックアップ
└─────────────────┘
```

**WebのIndexedDB**
```
┌─────────────────┐
│ DayLog Store    │
│  date: "2026..."│
│  elevation: 1500│ → ブラウザのストレージに永続保存
└─────────────────┘
```

---

## 3. 重要概念の深掘り

### 3.1 非同期処理（async/await）と完了フラグ待ち

**PLCでの完了フラグ待ち（ST言語）**
```pascal
(* FBインスタンス *)
fbReadFile : FB_ReadFile;

(* 処理開始 *)
fbReadFile.Execute := TRUE;

(* 完了待ち - 次のスキャンで確認 *)
IF fbReadFile.Done THEN
    (* 処理完了時の動作 *)
    data := fbReadFile.Data;
    fbReadFile.Execute := FALSE;
END_IF
```

**Webでのasync/await（JavaScript）**
```javascript
// 非同期関数の定義
async function loadData() {
    // データ取得開始（完了を待つ）
    const log = await getDayLog(date);
    
    // 処理完了後の動作
    if (log) {
        part1Input.value = log.elevation_part1 ?? '';
        part2Input.value = log.elevation_part2 ?? '';
    }
}
```

**対応関係**
- `fbReadFile.Execute := TRUE` ≈ `getDayLog(date)` を呼び出す
- `IF fbReadFile.Done THEN` ≈ `await` で完了を待つ
- 次のスキャンでのフラグ確認 ≈ `await`が自動的に待機

### 3.2 イベント駆動 vs スキャン実行

**PLCのスキャン実行（周期的）**
```pascal
(* 毎スキャン実行される *)
PROGRAM Main
    (* 入力読み取り *)
    currentValue := InputRegister;
    
    (* 常に監視 *)
    IF currentValue > threshold THEN
        alarm := TRUE;
    ELSE
        alarm := FALSE;
    END_IF
    
    (* 出力書き込み *)
    OutputRegister := alarm;
END_PROGRAM
```
- **特徴**: プログラムは常に実行される（例: 10msごと）
- **メリット**: リアルタイム性が高い
- **デメリット**: 無駄な処理も実行される

**Webのイベント駆動（必要時のみ）**
```javascript
// イベントリスナーを登録（待機状態）
part1Input.addEventListener('blur', async () => {
    // ユーザーが入力欄から離れた時だけ実行
    const value = parseFloat(part1Input.value);
    
    if (isNaN(value)) return;
    
    // データ保存
    await saveData();
});
```
- **特徴**: イベント発生時のみ実行される
- **メリット**: CPU使用率が低い、省電力
- **デメリット**: 厳密なリアルタイム性は保証されない

### 3.3 DOM操作 = HMI操作

**PLCでのHMI更新（例: メモリ → 画面表示）**
```pascal
(* PLCの内部メモリに書き込み *)
HMI_DisplayValue := currentElevation;  (* D100番地など *)

(* HMI側で自動的に画面更新される *)
```

**WebでのDOM更新（例: JavaScript → HTML表示）**
```javascript
// HTML要素を取得（PLCの番地指定に相当）
const displayElement = document.getElementById('daily-total');

// 値を更新（メモリ書き込みに相当）
displayElement.textContent = currentElevation;

// ブラウザが自動的に画面を再描画
```

**対応関係**
- PLCの番地（D100）≈ DOM要素のID（`#daily-total`）
- メモリ書き込み ≈ `.textContent = ...`
- HMIの自動更新 ≈ ブラウザの自動再描画

### 3.4 エラーハンドリング

**PLCでのエラー処理（ST言語）**
```pascal
fbOperation : FB_Operation;

fbOperation.Execute := TRUE;

IF fbOperation.Error THEN
    (* エラー時の処理 *)
    errorCode := fbOperation.ErrorID;
    LogError(errorCode);
    fbOperation.Execute := FALSE;
END_IF
```

**Webでのエラー処理（JavaScript）**
```javascript
try {
    // 処理実行
    await saveDayLog(data);
} catch (error) {
    // エラー時の処理
    console.error('Failed to save:', error);
    // ユーザーに通知、リトライなど
}
```

---

## 4. Phase別学習計画

このアプリを通じて、段階的にWeb開発スキルを習得します。

### Phase 0: 環境準備と基礎理解（1-2時間）

**目標**
- 開発環境のセットアップ
- アプリの基本動作を理解

**実施内容**
1. Node.jsのインストール（v20以上）
2. リポジトリのクローン
3. 依存パッケージのインストール（`npm install`）
4. アプリの起動と動作確認

**完了条件**
- `npm install`が成功
- ブラウザでアプリが動作
- Chrome DevToolsが開ける

**学習リソース**
- `README.md` - プロジェクト概要
- `docs/QUICK_START_FOR_PLC_ENGINEERS.md` - 実践ガイド

---

### Phase 1: コード品質ツールの理解（完了）

**目標**
- ESLint、Prettierの理解
- Git hooksの仕組みを理解

**実施内容**
✅ ESLint導入（コード品質チェック）  
✅ Prettier導入（自動整形）  
✅ Git hooks（pre-commit自動チェック）

**成果**
- コードスタイルが統一されている
- よくあるバグが自動検出される
- コミット前に自動チェックが実行される

**PLCとの対応**
- ESLint = プログラムの構文チェック機能
- Prettier = 自動インデント整形
- Git hooks = コンパイル前の自動検証

---

### Phase 2: テスト環境構築（次のステップ）

**目標**
- ユニットテストの作成
- E2Eテストの基礎

**実施内容**
1. **Vitest環境構築**
   - `npm install -D vitest @vitest/ui` でインストール
   - `vitest.config.js` を作成
   - テスト用のIndexedDBモック作成

2. **ユニットテスト作成**
   ```javascript
   // iso-week.test.js の例
   import { describe, it, expect } from 'vitest';
   import { getISOWeekInfo } from '../js/iso-week.js';
   
   describe('getISOWeekInfo', () => {
     it('2026-02-09 (月) は 2026-W07', () => {
       const date = new Date(2026, 1, 9); // 2月9日
       const result = getISOWeekInfo(date);
       expect(result.iso_year).toBe(2026);
       expect(result.week_number).toBe(7);
     });
   });
   ```

3. **E2Eテスト（Playwright）**
   - ユーザー操作のシミュレーション
   - 主要フローの自動テスト

**前提条件**
- Phase 1完了
- JavaScriptの基本文法を理解

**完了条件**
- コアロジックのカバレッジ80%以上
- `npm test`で全テストが通る
- 主要フローのE2Eテスト3本以上

**所要時間**: 2-3時間

**PLCとの対応**
- ユニットテスト = FB単体のシミュレーション
- E2Eテスト = 実機での動作確認
- テストカバレッジ = プログラムの検証率

---

### Phase 3: TypeScript導入（推奨）

**目標**
- 型安全性の向上
- ST言語に近い開発体験

**実施内容**
1. **TypeScript環境構築**
   ```bash
   npm install -D typescript
   npx tsc --init
   ```

2. **型定義の作成**
   ```typescript
   // types.ts
   interface DayLog {
     date: string;
     elevation_part1: number;
     elevation_part2: number;
     elevation_total: number;
     subjective_condition: 'good' | 'normal' | 'bad';
     iso_year: number;
     week_number: number;
   }
   
   interface WeekTarget {
     key: string;
     target_elevation: number | null;
     iso_year: number;
     week_number: number;
   }
   ```

3. **段階的な移行**
   - `db.js` → `db.ts`（1ファイルずつ）
   - 型アノテーションの追加
   - 型エラーの解消

**前提条件**
- Phase 2完了（テストがあると安心）
- JavaScriptの基本を理解

**完了条件**
- 全ファイルが`.ts`に移行
- 型エラーゼロ
- `npm run build`が成功

**所要時間**: 3-4時間

**PLCとの対応**
- TypeScript = ST言語（型付き）
- JavaScript = ラダー図（型なし）
- `interface` = PLCの構造体（STRUCT）
- `type` = PLCのデータ型定義

**STとTypeScriptの比較**

```pascal
(* ST: 型定義 *)
TYPE DayLog : STRUCT
    date : STRING;
    elevation_part1 : INT;
    elevation_part2 : INT;
    elevation_total : INT;
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
}
```

---

### Phase 4: ビルド環境整備（任意）

**目標**
- 開発効率の向上
- モジュールバンドル

**実施内容**
1. **Vite導入**
   ```bash
   npm install -D vite
   ```

2. **設定ファイル作成**
   ```javascript
   // vite.config.js
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
     }
   });
   ```

3. **開発サーバー**
   ```bash
   npm run dev    # 開発モード（ホットリロード）
   npm run build  # 本番ビルド
   ```

**前提条件**
- Phase 3完了（TypeScript化済み）

**完了条件**
- `npm run dev`で開発サーバー起動
- ホットリロード（変更即反映）が動作
- `npm run build`でビルド成果物生成

**所要時間**: 2-3時間

---

## 5. 学習の進め方

### 推奨学習順序

```
Phase 0（環境準備）
    ↓
コードを読む（CODE_WALKTHROUGH.md）
    ↓
小改造タスクに挑戦（QUICK_START.md）
    ↓
Phase 2（テスト）or Phase 3（TypeScript）
    ↓
機能拡張（ROADMAP.md参照）
```

### 学習のコツ

1. **PLCの知識を活かす**
   - 「これはFBのこの機能に似ている」と対応付ける
   - ST言語の経験があればTypeScriptは理解しやすい

2. **実践重視**
   - コードを読むだけでなく、必ず手を動かす
   - 小さな改造から始める

3. **DevToolsを使いこなす**
   - PLCのモニタ機能と同じように使う
   - ブレークポイントでステップ実行

4. **段階的に進める**
   - 全てを一度に理解しようとしない
   - 1つずつ確実に習得する

---

## 6. 次のステップ

学習を始める準備ができたら：

1. **まず理解する**: `docs/CODE_WALKTHROUGH.md`を読む
2. **実践する**: `docs/QUICK_START_FOR_PLC_ENGINEERS.md`の小改造タスクに挑戦
3. **計画を立てる**: `docs/ROADMAP.md`で次に何をするか決める

Web開発の世界へようこそ！PLCでの経験は必ず活きます。
