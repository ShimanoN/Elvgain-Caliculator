# リリースとバージョニング

推奨: セマンティックバージョニング（SemVer）を採用します。

- 破壊的変更: MAJOR バージョンを上げる（例: 1.0.0 → 2.0.0）
- 新機能: MINOR バージョンを上げる（例: 1.1.0）
- バグ修正: PATCH を上げる（例: 1.0.1）

リリース手順（簡易）

1. main ブランチに変更をマージする
2. ローカルでテストとビルドを実行する

```bash
npm ci
npm run format:check
npm run lint
npm test
```

3. バージョンを更新する

```bash
npm version patch|minor|major -m "release: %s"
```

4. GitHub Release を作成する（タグは `npm version` が自動で作成します）

5. 必要に応じてリリースノートを追記する

自動化案

- 将来的に GitHub Actions でリリースを自動化（タグ付け時にビルドとアセット作成）
