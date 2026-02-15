# モバイル同期ガイド / Mobile Sync Guide

## 概要 / Overview

Elevation Loom アプリは、モバイル・PC 間でのデータ同期をサポートしています。このガイドでは、データが正常に同期されない場合のトラブルシューティングと対処方法について説明します。

The Elevation Loom app supports data synchronization between mobile and PC devices. This guide explains troubleshooting and solutions when data sync issues occur.

---

## 同期ステータス UI / Sync Status UI

### 同期ステータスバッジ / Sync Status Badge

アプリケーションのヘッダーには、現在の同期状況を示すバッジが表示されます。バッジの色で状態を一目で確認できます：

The application header displays a badge showing the current sync status. The badge color indicates the state at a glance:

- **緑色 (Green) - OK**: すべてのデータが同期済み（未同期アイテム: 0）/ All data synced (pending items: 0)
- **黄色 (Yellow) - Pending**: 未送信のデータあり / Unsent data exists
- **灰色 (Gray) - Offline**: オフライン状態 / Offline status
- **赤色 (Red) - Error**: 同期APIが利用できない、またはエラー発生 / Sync API unavailable or error occurred

### バッジ表示内容 / Badge Display

同期ステータスバッジには以下の情報が表示されます：

The sync status badge displays the following information:

- **Pending**: 未同期アイテムの数 / Number of unsynced items
- **Last**: 最後に同期が完了した時刻（相対表記: "2m ago", "1h ago" など）/ Last sync completion time (relative: "2m ago", "1h ago", etc.)

### 手動同期ボタン / Manual Sync Button

「Sync Now」ボタンをクリックすると、手動で同期を実行できます：

Click the "Sync Now" button to manually trigger sync:

1. ボタンをクリック / Click the button
2. 同期が完了するまで待機 / Wait for sync to complete
3. 成功時はトースト通知が表示されます / Success notification shown via toast
4. 失敗時はエラーメッセージが表示されます / Error message shown on failure

**注意 / Note**: オフライン時や同期APIが利用できない場合、ボタンは無効化されます。/ The button is disabled when offline or when sync API is unavailable.

---

## データ同期の仕組み / How Data Sync Works

### 標準フロー / Standard Flow

1. **ユーザー入力** → モバイルまたはPCで日次データ/週間目標を入力
2. **Firestore への保存** → クラウドデータベース（Firestore）に保存
3. **自動同期** → 他のデバイスでアプリを開くと最新データが表示される

### フォールバックメカニズム / Fallback Mechanism

ネットワークエラーや認証遅延が発生した場合、アプリは以下の順序でデータを保存します：

1. **Firestore** （クラウドストレージ - 最優先）
2. **IndexedDB** （ブラウザ内キャッシュ - フォールバック）
3. **LocalStorage** （ブラウザ内ストレージ - 最終手段）

When network errors or authentication delays occur, the app saves data in this order:

1. **Firestore** (Cloud storage - highest priority)
2. **IndexedDB** (Browser cache - fallback)
3. **LocalStorage** (Browser storage - last resort)

---

## よくある問題と対処方法 / Common Issues and Solutions

### 1. モバイルで保存したデータが PC に反映されない

#### 原因 / Causes

- **ネットワーク接続の問題**: モバイルデータ通信が不安定
- **認証遅延**: ページ読み込み直後に保存操作を行った
- **プライベートモード**: ブラウザのプライベートモードで IndexedDB がブロックされている

#### 対処方法 / Solutions

**A. データが一時保存されている場合（推奨）**

データはモバイル端末内に保存されていますが、Firestore への同期が保留されています。以下の手順で同期を行います：

1. **ネットワーク接続を確認**
   - Wi-Fi またはモバイルデータ通信が有効か確認
   - ブラウザで他のサイトが開けるか確認

2. **手動同期を実行**
   ```javascript
   // ブラウザのコンソール (DevTools) で実行
   await window.elvSync.trigger();
   ```

3. **同期結果を確認**
   ```javascript
   // 同期待ちアイテム数を確認
   window.elvSync.getPendingCount();
   // 0 なら同期完了、0 以外なら未同期データあり
   ```

**When data is temporarily saved (Recommended)**

Data is saved on your mobile device but pending sync to Firestore. Follow these steps:

1. **Check network connection**
   - Verify Wi-Fi or mobile data is enabled
   - Confirm other websites can be accessed

2. **Trigger manual sync**
   ```javascript
   // Execute in browser console (DevTools)
   await window.elvSync.trigger();
   ```

3. **Check sync status**
   ```javascript
   // Check pending sync items count
   window.elvSync.getPendingCount();
   // 0 = sync complete, non-zero = pending items remain
   ```

**B. 手動バックアップ/リストアを使用（代替手段）**

同期がうまくいかない場合、手動でデータをエクスポート/インポートできます：

**モバイル側（データのエクスポート）:**
```javascript
// ブラウザコンソールで実行
const backup = await window.elvBackup.exportBackup();
console.log(backup); // JSON文字列をコピー
```

**PC側（データのインポート）:**
```javascript
// コピーしたJSON文字列を貼り付け
const backupData = '...'; // エクスポートしたJSON
await window.elvBackup.importBackup(backupData);
```

**When manual backup/restore is needed (Alternative)**

If sync doesn't work, you can manually export/import data:

**Mobile side (Export data):**
```javascript
// Execute in browser console
const backup = await window.elvBackup.exportBackup();
console.log(backup); // Copy JSON string
```

**PC side (Import data):**
```javascript
// Paste copied JSON string
const backupData = '...'; // Exported JSON
await window.elvBackup.importBackup(backupData);
```

---

### 2. 「すべての保存方法が失敗しました」エラー

#### 原因 / Cause

- ブラウザのプライベートモードで IndexedDB と LocalStorage が両方ブロックされている
- ブラウザのストレージ容量が上限に達している

#### 対処方法 / Solution

1. **通常モードでブラウザを開く**（プライベートモードを無効化）
2. **ブラウザのキャッシュとストレージをクリア**
   - 設定 → プライバシー → ブラウザデータを削除
3. **別のブラウザを試す**（Chrome、Safari、Firefox など）

**Switch to normal browsing mode** (disable private/incognito mode)
**Clear browser cache and storage**
**Try a different browser** (Chrome, Safari, Firefox, etc.)

---

### 3. 認証が完了していないエラー

#### 原因 / Cause

ページ読み込み直後（認証処理が完了する前）にデータを保存しようとした

#### 対処方法 / Solution

1. **ページを再読み込み**
2. **2〜3秒待ってから入力を開始**
3. コンソールで認証状態を確認:
   ```javascript
   // 認証完了していれば true
   console.log('Auth ready:', window.__ELV_CACHE_READY);
   ```

**Reload the page**
**Wait 2-3 seconds before entering data**
**Check authentication status in console**

---

## 開発者向け情報 / Developer Information

### 同期リトライメカニズム / Sync Retry Mechanism

アプリは自動的に以下の処理を行います：

- **30秒ごとに同期をリトライ** (バックグラウンド)
- **オンライン復帰時に即座に同期を試行**
- **同期キューに失敗したデータを保持**

The app automatically:
- **Retries sync every 30 seconds** (background)
- **Attempts sync immediately when network is restored**
- **Maintains a queue of failed sync items**

### デバッグ API / Debug API

```javascript
// 同期待ちアイテム数を取得
window.elvSync.getPendingCount();

// 手動で同期をトリガー
await window.elvSync.trigger();

// 同期キューをクリア (注意: 未同期データが失われます)
window.elvSync.clear();

// バックアップのエクスポート
const backup = await window.elvBackup.exportBackup();

// バックアップのインポート
await window.elvBackup.importBackup(backupData);
```

### ログの確認 / Check Logs

ブラウザの開発者ツール（DevTools）を開き、コンソールで以下のログを確認:

- `Authentication ready` - 認証完了
- `Firestore transaction failed` - Firestore 保存失敗
- `IndexedDB cache-only fallback succeeded` - ローカルキャッシュに保存成功
- `Added to pending sync queue` - 同期キューに追加
- `Successfully synced to Firestore` - Firestore への同期成功

Open browser DevTools and check console for these logs:
- `Authentication ready` - Authentication complete
- `Firestore transaction failed` - Firestore save failed
- `IndexedDB cache-only fallback succeeded` - Local cache save success
- `Added to pending sync queue` - Added to sync queue
- `Successfully synced to Firestore` - Firestore sync success

---

## 技術詳細 / Technical Details

### 関連ファイル / Related Files

- `js/storage.ts` - データ保存とキャッシュロジック
- `js/sync-retry.ts` - 同期リトライメカニズム
- `js/firebase-config.ts` - 認証と Firebase 初期化
- `js/backup.ts` - バックアップ/リストア機能

### エラー種別 / Error Types

| エラー種別 | 説明 | 対処方法 |
|----------|------|---------|
| `AUTH_FAILED` | 認証失敗 | ページ再読み込み |
| `FIRESTORE_FAILED` | Firestore 保存失敗 | ネットワーク確認、自動リトライ待ち |
| `CACHE_FAILED` | IndexedDB 失敗 | 通常モードで開く |
| `ALL_FAILED` | すべて失敗 | ブラウザ設定確認、別のブラウザを試す |

### セキュリティとプライバシー / Security and Privacy

- **匿名認証**: ユーザー登録不要で自動的に匿名 UID が発行されます
- **データの所有権**: 各ユーザーは自分のデータにのみアクセス可能
- **ローカルキャッシュ**: オフライン時のデータはブラウザ内に安全に保存されます

**Anonymous Authentication**: No registration required, anonymous UID is automatically issued
**Data Ownership**: Each user can only access their own data
**Local Cache**: Offline data is securely stored in the browser

---

## トラブルシューティングフロー / Troubleshooting Flow

```
データが保存できない
    ↓
ネットワーク接続を確認
    ↓
問題なし → プライベートモードか？
    ↓
    Yes → 通常モードで開く
    ↓
    No → コンソールでエラーログを確認
        ↓
        "AUTH_FAILED" → ページ再読み込み
        ↓
        "FIRESTORE_FAILED" → window.elvSync.trigger() で手動同期
        ↓
        "ALL_FAILED" → 手動バックアップ/リストアを使用
```

---

## サポート / Support

問題が解決しない場合は、以下の情報を添えて GitHub Issues にご報告ください：

- 使用ブラウザ（名前とバージョン）
- OS（iOS/Android/Windows/Mac）
- エラーメッセージ（コンソールログのスクリーンショット）
- 再現手順

If issues persist, please report on GitHub Issues with:
- Browser name and version
- OS (iOS/Android/Windows/Mac)
- Error messages (console log screenshots)
- Steps to reproduce

---

**最終更新 / Last Updated**: 2026-02-14
