# 開発への貢献ガイド

短く、ローカルで開発・テストを始める手順です。

前提: Node.js 18+ がインストールされていること。

セットアップ

1. 依存関係をインストール

```bash
npm ci
```

2. Husky フックを有効化（`prepare` スクリプトは package.json に設定済み）

```bash
npm run prepare
# または
npx husky install
```

3. (E2E 用) Playwright ブラウザをインストール

```bash
npm run e2e:install
```

開発ワークフロー

- 形式整形: `npm run format`
- 整形チェック: `npm run format:check`
- Lint: `npm run lint`
- ユニットテスト: `npm test`
- E2E テスト: `npm run e2e`

コミット前に自動で `lint-staged` が実行されます。

CI

GitHub Actions による CI は `.github/workflows/ci.yml` を参照してください。CI はフォーマットチェック、Lint、ユニットテスト、E2E を実行します。

コントリビューションの流れ

1. フォークしてブランチを切る
2. 小さなコミットを心掛ける
3. PR を作成し、説明と関連する issue を追加する
