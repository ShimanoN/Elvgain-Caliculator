# Firebase Deployment Setup Guide

## GitHub Actions 自動デプロイの設定手順

GitHub Actionsによる自動デプロイを有効化するには、Firebase Service Accountキーを設定する必要があります。

### 手順

1. **Firebase Service Account キーの取得**

   以下のコマンドを実行して、サービスアカウントキーを作成します：

   ```bash
   firebase init hosting:github
   ```

   または、手動で設定する場合：

   a. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
   b. プロジェクト「Elevation Loom」を選択
   c. 左メニューから「IAM と管理」→「サービスアカウント」を選択
   d. 「Firebase Admin SDK」サービスアカウントを見つける
   e. 「キー」タブで「鍵を追加」→「新しい鍵を作成」
   f. JSON形式を選択してダウンロード

2. **GitHub Secretsの設定**

   a. GitHubリポジトリページに移動
   b. 「Settings」→「Secrets and variables」→「Actions」を選択
   c. 「New repository secret」をクリック
   d. 以下の情報を入力：
      - Name: `FIREBASE_SERVICE_ACCOUNT_ELEVATION_LOOM`
      - Secret: ダウンロードしたJSONファイルの内容全体をペースト
   e. 「Add secret」をクリック

3. **動作確認**

   設定完了後、mainブランチにコミットをpushすると自動的にデプロイが実行されます：

   ```bash
   git add .
   git commit -m "Setup Firebase deployment"
   git push origin main
   ```

   デプロイの進行状況は、GitHubリポジトリの「Actions」タブで確認できます。

## 現在のデプロイ状況

✅ Firebase プロジェクト作成完了
✅ Firebase Hosting 初回デプロイ完了
✅ Firestore ルールデプロイ完了
✅ GitHub Actions ワークフローファイル作成完了
⏳ GitHub Secrets 設定待ち（上記手順を実行してください）

## デプロイURL

- **本番環境**: https://elevation-loom.web.app
- **プロジェクトコンソール**: https://console.firebase.google.com/project/elevation-loom/overview

## Firebase Hosting設定に関する重要な注意事項

### マルチページアプリケーション構成

このアプリケーションは、以下の2つのHTMLページを持つ**マルチページアプリケーション (MPA)** です：
- `index.html` - メインの日次入力ページ
- `week-target.html` - 週目標設定ページ

### firebase.jsonの設定

`firebase.json` の `hosting` セクションには、**rewrites ルールを設定しないでください**。

❌ **誤った設定例（SPAパターン）**:
```json
"rewrites": [
  {
    "source": "**",
    "destination": "/index.html"
  }
]
```

この設定を追加すると、すべてのリクエストが `index.html` にリダイレクトされ、`week-target.html` にアクセスできなくなります。

✅ **正しい設定**: rewritesセクションを含めない（現在の設定）

これにより、各HTMLファイルへ直接アクセスできます：
- `https://elevation-loom.web.app/` → `index.html`
- `https://elevation-loom.web.app/week-target.html` → `week-target.html`
- `https://elevation-loom.web.app/assets/*` → CSS/JSファイル

## 次のステップ

1. GitHub Secretsの設定を完了する
2. E2Eテストを拡充する（週目標設定、エクスポート機能など）
3. 実運用を開始する（30日間の連続データ入力）
