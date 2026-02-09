# クイックスタートガイド - PLC技術者向け（30分で理解）

このガイドでは、PLC/ST技術者が30分でElevation Loomアプリの動作を理解し、簡単な改造ができるようになることを目指します。

---

## 1. アプリ起動方法

### 方法1: 直接ブラウザで開く（最も簡単）

```bash
# リポジトリのディレクトリに移動
cd /path/to/Elvgain-Caliculator

# index.htmlをブラウザで開く
# ファイルをダブルクリックするか、以下のコマンド:
# Windows: start index.html
# Mac: open index.html
# Linux: xdg-open index.html
```

**特徴**
- サーバー不要
- `file://` プロトコルで動作
- IndexedDBはローカルに保存

### 方法2: ローカルサーバー経由（推奨）

```bash
# シェルスクリプトで起動
./scripts/run_local.sh

# または手動でPythonサーバー起動
python3 -m http.server 8000

# ブラウザで開く
# http://localhost:8000/index.html
```

**推奨する理由**
- より本番環境に近い
- デバッグがしやすい
- エラーメッセージが明確

---

## 2. Chrome DevToolsの使い方（PLCモニタ機能相当）

PLCでは専用のモニタソフトを使ってメモリを監視しますが、Webでは**Chrome DevTools**を使います。

### 2.1 DevToolsの起動

```
F12キーを押す
または
右クリック → 「検証」を選択
または
Ctrl+Shift+I (Windows/Linux)
Cmd+Option+I (Mac)
```

### 2.2 主要なタブの使い方

#### Application タブ: IndexedDBの中身確認（PLCのモニタ機能相当）

```
DevTools開く
  ↓
[Application]タブをクリック
  ↓
左側のツリーで展開:
  Storage
    └─ IndexedDB
        └─ TrainingMirrorDB
            ├─ DayLog      ← 日次データ
            └─ WeekTarget  ← 週目標データ
```

**実際の操作例**
1. `DayLog`をクリック
2. 保存されている日付とデータが一覧表示される
3. 任意のレコードをダブルクリックで詳細表示
4. **値を直接編集可能**（PLCのデバイス強制と同じ）

**PLCとの対応**
- `DayLog` = PLCの日次データ保存エリア（例: D100～D199）
- レコード = 1日分のデータ構造体
- 直接編集 = デバイス強制書き込み

#### Console タブ: コマンド実行（テスト実行相当）

```
DevTools開く
  ↓
[Console]タブをクリック
  ↓
コマンドを入力して実行
```

**便利なコマンド例**

```javascript
// 1. 今日のデータを取得
await getDayLog('2026-02-09')

// 2. データベースの全レコード数を確認
const db = await initDB();
const tx = db.transaction(['DayLog'], 'readonly');
const store = tx.objectStore('DayLog');
await store.count()

// 3. 週情報を計算
getISOWeekInfo(new Date())

// 4. 特定の日のデータを保存（テストデータ作成）
await saveDayLog({
  date: '2026-02-09',
  elevation_part1: 500,
  elevation_part2: 800,
  elevation_total: 1300,
  subjective_condition: 'good',
  iso_year: 2026,
  week_number: 7
})
```

**PLCとの対応**
- Console = PLCのテストモード実行
- `await` = 処理完了待ち
- 関数呼び出し = FBの手動実行

#### Sources タブ: ブレークポイント設定（ステップ実行相当）

```
DevTools開く
  ↓
[Sources]タブをクリック
  ↓
左側のファイルツリーで対象ファイルを開く
  例: js/app.js
  ↓
行番号をクリックしてブレークポイント設定
```

**デバッグの流れ**

1. **ブレークポイント設定**
   ```
   js/app.js の 106行目をクリック
   → 青い印が表示される
   ```

2. **処理を実行**
   ```
   ブラウザで入力欄に値を入力してフォーカスを外す
   → ブレークポイントで処理が停止
   ```

3. **変数の値を確認**
   ```
   右側の[Scope]パネルに変数一覧が表示される
   - Local: ローカル変数
   - Global: グローバル変数
   ```

4. **ステップ実行**
   ```
   F10: Step Over（次の行へ）
   F11: Step Into（関数の中へ）
   Shift+F11: Step Out（関数から出る）
   F8: Resume（次のブレークポイントまで実行）
   ```

**PLCとの対応**
- ブレークポイント = PLCのブレーク条件
- Step Over = PLCのステップ実行
- Scope表示 = デバイスモニタ
- Resume = 連続実行

---

## 3. 具体的な実践例

### 実践1: IndexedDBのデータを直接編集（5分）

**目的**: データベースの仕組みを体感する

**手順**

1. **DevToolsを開く**（F12）

2. **Application → IndexedDB → TrainingMirrorDB → DayLog**

3. **既存データを選択**（なければ次の実践でデータを作成）

4. **値をダブルクリックして編集**
   ```
   elevation_part1: 500 → 1000 に変更
   ```

5. **画面をリロード**（F5）
   - 変更が反映されていることを確認

**学んだこと**
- IndexedDBはブラウザ内の永続ストレージ
- PLCの保持型メモリと同じ動作
- 直接編集可能（デバッグに便利）

---

### 実践2: Consoleでサンプルデータ生成（10分）

**目的**: 非同期処理（async/await）を体験する

**手順**

1. **DevTools → Console**

2. **サンプルデータ生成コマンドを実行**
   ```javascript
   // 今日のデータを作成
   await saveDayLog({
     date: formatDateLocal(new Date()),
     elevation_part1: 800,
     elevation_part2: 700,
     elevation_total: 1500,
     subjective_condition: 'good',
     iso_year: 2026,
     week_number: 7,
     created_at: new Date().toISOString(),
     updated_at: new Date().toISOString()
   })
   ```

3. **画面をリロード**
   - 入力欄に値が表示されることを確認

4. **複数日分のデータを作成**
   ```javascript
   // 過去7日間のデータを生成
   for (let i = 0; i < 7; i++) {
     const date = new Date();
     date.setDate(date.getDate() - i);
     const dateStr = formatDateLocal(date);
     const weekInfo = getISOWeekInfo(date);
     
     await saveDayLog({
       date: dateStr,
       elevation_part1: 600 + Math.random() * 400,
       elevation_part2: 500 + Math.random() * 400,
       elevation_total: 1100 + Math.random() * 800,
       subjective_condition: ['good', 'normal', 'bad'][Math.floor(Math.random() * 3)],
       iso_year: weekInfo.iso_year,
       week_number: weekInfo.week_number,
       created_at: new Date().toISOString(),
       updated_at: new Date().toISOString()
     });
   }
   console.log('7日分のデータ生成完了');
   ```

5. **週進捗を確認**
   - 週合計が自動計算されていることを確認

**学んだこと**
- `await`で非同期処理の完了を待つ
- `for`ループでも`await`が使える
- ランダムデータでテストができる

---

### 実践3: ブレークポイントでsaveData()を追跡（10分）

**目的**: プログラムの実行フローを理解する

**手順**

1. **DevTools → Sources**

2. **js/app.js を開く**

3. **saveData関数にブレークポイント設定**
   ```
   106行目付近の「async function saveData()」にブレークポイント
   ```

4. **入力欄に値を入力してフォーカスを外す**
   - 処理がブレークポイントで停止

5. **変数の値を確認**
   ```
   Scope パネルで確認:
   - part1: 入力した値
   - part2: 入力した値
   - date: 現在の日付
   ```

6. **ステップ実行（F10）で処理を追う**
   ```
   1. 値の取得
   2. 数値変換（parseFloat）
   3. NaNチェック
   4. 負の数チェック
   5. データオブジェクト作成
   6. saveDayLog呼び出し
   7. バックアップ作成
   8. 画面更新
   ```

7. **各ステップで変数の値を確認**

**学んだこと**
- 関数の実行フローを追える
- 変数の値の変化を確認できる
- PLCのステップ実行と同じ感覚

---

## 4. 小さな改造タスク

実際にコードを変更して、動作を確認します。

### Level 1: CSSで色を変える（5分）

**目標**: CSSの基礎を理解

**タスク**: 週進捗の背景色を変更

**手順**

1. **css/style.css を開く**

2. **`.week-progress`セクションを探す**

3. **背景色を変更**
   ```css
   /* 変更前 */
   .week-progress {
     background-color: #f5f5f5;
   }
   
   /* 変更後 */
   .week-progress {
     background-color: #e3f2fd; /* 薄い青色 */
   }
   ```

4. **ブラウザをリロード**（Ctrl+F5で強制リロード）

5. **変更を確認**

**PLCとの対応**
- CSS = HMIのスタイル設定
- `background-color` = 背景色プロパティ

---

### Level 2: ボタンのテキスト変更（5分）

**目標**: HTMLの構造を理解

**タスク**: 「前日」ボタンを「◀前日」に変更

**手順**

1. **index.html を開く**

2. **ボタンのテキストを探す**
   ```html
   <!-- 変更前 -->
   <button id="prev-day">前日</button>
   
   <!-- 変更後 -->
   <button id="prev-day">◀前日</button>
   ```

3. **保存してリロード**

4. **ボタン表示を確認**

**応用**: 「翌日」ボタンも「翌日▶」に変更してみる

---

### Level 3: 表示の単位を変える（10分）

**目標**: JavaScriptでの文字列操作

**タスク**: 合計標高に「m」単位を追加

**手順**

1. **js/app.js を開く**

2. **updateDailyTotal関数を探す**（または該当箇所）

3. **表示部分を変更**
   ```javascript
   // 変更前（85-86行目付近）
   dailyTotalSpan.textContent = log.elevation_total || 0;
   
   // 変更後
   dailyTotalSpan.textContent = `${log.elevation_total || 0}m`;
   ```

4. **他の箇所も同様に変更**
   ```javascript
   // 週進捗の表示も変更（例）
   weekCurrentSpan.textContent = `${weekCurrent}m`;
   ```

5. **保存してリロード**

6. **「1500」が「1500m」と表示されることを確認**

**学んだこと**
- テンプレートリテラル（`` `${変数}m` ``）の使い方
- 文字列と数値の結合

---

### Level 4: 保存時のログ出力（10分）

**目標**: デバッグ用ログの追加

**タスク**: データ保存時にConsoleにログ出力

**手順**

1. **js/app.js の saveData関数を開く**

2. **保存処理の直後にログ追加**
   ```javascript
   async function saveData() {
     // ... 既存のコード ...
     
     await saveDayLog(data);
     
     // ログ追加（この行を追加）
     console.log('✅ Data saved:', data);
     
     // ... 残りのコード ...
   }
   ```

3. **保存してリロード**

4. **DevTools → Console を開いた状態で入力**

5. **保存時にログが表示されることを確認**
   ```
   ✅ Data saved: {date: "2026-02-09", elevation_part1: 800, ...}
   ```

**応用**
```javascript
// より詳細なログ
console.log('📝 Saving data for', data.date);
console.log('  Part1:', data.elevation_part1);
console.log('  Part2:', data.elevation_part2);
console.log('  Total:', data.elevation_total);
```

**PLCとの対応**
- `console.log` = PLCのログ出力
- DevTools Console = PLCのログビューア

---

### Level 5: 3部入力欄の追加（30分）★チャレンジ

**目標**: HTML/CSS/JavaScript を総合的に理解

**タスク**: 午前・午後に加えて「夜」の入力欄を追加

**手順**

#### ステップ1: HTML修正（index.html）

```html
<!-- 既存の2部の下に追加 -->
<div class="input-row">
  <label for="part3">3部（夜）:</label>
  <input
    type="number"
    id="part3"
    min="0"
    step="50"
    placeholder="例: 500"
  />
  <span class="unit">m</span>
</div>
```

#### ステップ2: JavaScript修正（js/app.js）

1. **変数追加**（ファイル上部）
   ```javascript
   const part3Input = document.getElementById('part3');
   ```

2. **loadData関数に追加**
   ```javascript
   async function loadData() {
     // ... 既存のコード ...
     
     if (log) {
       part1Input.value = log.elevation_part1 ?? '';
       part2Input.value = log.elevation_part2 ?? '';
       part3Input.value = log.elevation_part3 ?? ''; // 追加
       // ...
     } else {
       part1Input.value = '';
       part2Input.value = '';
       part3Input.value = ''; // 追加
       // ...
     }
   }
   ```

3. **saveData関数に追加**
   ```javascript
   async function saveData() {
     // ... 既存のコード ...
     
     const part1 = parseFloat(part1Input.value) || 0;
     const part2 = parseFloat(part2Input.value) || 0;
     const part3 = parseFloat(part3Input.value) || 0; // 追加
     
     const total = part1 + part2 + part3; // 修正
     
     const data = {
       // ... 既存のフィールド ...
       elevation_part3: part3, // 追加
       elevation_total: total,
       // ...
     };
   }
   ```

4. **イベントリスナー追加**
   ```javascript
   // 既存のイベントリスナーの下に追加
   part3Input.addEventListener('blur', saveData);
   ```

#### ステップ3: CSS修正（css/style.css）

```css
/* 必要に応じてスタイル調整 */
.input-row {
  margin-bottom: 1rem;
}
```

#### ステップ4: データベーススキーマ更新

**注意**: 既存のデータには`elevation_part3`フィールドがないため、新しいデータのみ3部対応となります。

#### ステップ5: 動作確認

1. リロード
2. 3部に値を入力
3. 合計が正しく計算されることを確認
4. DevTools → Application → DayLog で`elevation_part3`が保存されていることを確認

**学んだこと**
- HTMLとJavaScriptの連携
- データモデルの拡張
- イベントリスナーの追加
- データベーススキーマの変更

---

## 5. トラブルシューティング

### 問題: データが保存されない

**確認事項**
1. Console にエラーが出ていないか（F12 → Console）
2. IndexedDBが有効か（プライベートモードでは制限あり）
3. ブラウザのストレージ容量は十分か

**解決方法**
```javascript
// Console で実行
console.log('DB status:', db);
await initDB(); // DBの再初期化
```

---

### 問題: 画面が更新されない

**確認事項**
1. キャッシュをクリア（Ctrl+Shift+Delete）
2. スーパーリロード（Ctrl+F5）
3. JavaScript エラーがないか

---

### 問題: ブレークポイントで止まらない

**確認事項**
1. ファイルが正しく読み込まれているか（Sources タブで確認）
2. ブレークポイントが正しい行にあるか
3. 該当のコードが実行されているか（Console で確認）

---

## 6. 次のステップ

このクイックスタートで基本操作を体験したら：

1. **コードを深く理解する**
   - `docs/CODE_WALKTHROUGH.md` を読む
   - 各関数の役割を理解する

2. **学習計画を立てる**
   - `docs/LEARNING_PATH.md` でPhase別学習
   - `docs/ROADMAP.md` で機能拡張計画を確認

3. **実際に機能を追加する**
   - 小さな機能から始める
   - テストを書く習慣をつける

---

## 7. まとめ

**30分で学んだこと**
- ✅ Chrome DevToolsの基本操作
- ✅ IndexedDBの確認・編集方法
- ✅ Consoleでのコマンド実行
- ✅ ブレークポイントでのデバッグ
- ✅ 簡単なコード改造

**PLCからの知識が活きる場面**
- デバッグ手法（ステップ実行、変数監視）
- データ構造の理解（構造体 = オブジェクト）
- 非同期処理（完了フラグ待ち = await）

これで基本的な開発フローが理解できました。次は実際のコードを読んで、より深く理解していきましょう！
