# 今後の展望（更新済み）

以下はリポジトリ作業の進捗メモです。多くは既に実施済みで、残タスクを明確化しています。

- リント / フォーマット: 実施済み
  - `npm run format` を実行しコード整形済み。ユニットテストは `npm test` で通過確認済み。

- Husky / pre-commit: 実施済み
  - `husky` のプリコミットフックを追加し、`lint-staged` を実行するように設定済み。
  - フックの参照パス問題を修正し、実行権限を付与済み。

- CI / E2E: 一部実施（要改善）
  - GitHub Actions のワークフロー (`.github/workflows/ci.yml`) を追加し、フォーマットチェック、Lint、ユニットテスト、E2E（Playwright）を実行するように設定済み。
  - 残課題: Playwright ブラウザのキャッシュ保存、E2E の分割/並列化、失敗時アーティファクト収集（スクリーンショット/トレース）の追加。

- カバレッジ / アーティファクト: 方針決定済み
  - `coverage/` は `.gitignore` に追加して除外する方針で反映済み。

- ドキュメント: 追加済み
  - `docs/CONTRIBUTING.md` と `docs/RELEASE.md` を追加し、開発セットアップとリリース手順の基礎を記載済み。

- リリース / バージョニング: ガイド追加済み
  - SemVer を推奨する簡易手順を `docs/RELEASE.md` に記載。

短期優先（残タスク）
1. ✅ Playwright ブラウザキャッシュを CI に追加（インストール時間短縮）
2. ✅ E2E ジョブの分割・並列化と失敗時アーティファクトのアップロード
3. ✅ `lint-staged` ルールや Husky フックの微調整（不要な停止を避ける）
4. ✅ CI の flaky 対策（Playwright retries 等）

実装内容：
- **lint-staged**: `js/**/*.js` のみに ESLint を適用（設定ファイル・テストファイルは除外）
- **Husky**: pre-commit フックにわかりやすいメッセージを追加
- **CONTRIBUTING.md**: lint-staged の動作を明確に説明

すべての短期優先タスクが完了しました！

📋 完了サマリー：
- Playwright ブラウザキャッシュで CI 実行時間を削減
- E2E テストを分割・並列化（3ファイル × 2ブラウザ = 6ジョブ）
- ESLint と Prettier の役割分担を明確化
- アーティファクト自動収集で失敗時デバッグが容易に
- Playwright リトライで flaky テスト対策
