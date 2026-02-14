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

## 次のステップ

1. GitHub Secretsの設定を完了する
2. E2Eテストを拡充する（週目標設定、エクスポート機能など）
3. 実運用を開始する（30日間の連続データ入力）
