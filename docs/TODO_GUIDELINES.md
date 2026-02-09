# TODO 記録と取り扱いルール

このプロジェクトでドキュメントやコード内に残す TODO の標準形式と運用フローを定義します。

目的: チャットや複数の開発セッションをまたいでも一貫して TODO を収集・追跡できるようにします。

推奨フォーマット（Markdown 内の HTML コメント）:

<!-- TODO: short description | assignee:@github-username | priority:low|medium|high | due:YYYY-MM-DD | issue:#123 -->

- `short description`: TODO の簡潔な説明（必須）
- `assignee`: 任意（例: `@shimanotakumi`）
- `priority`: 任意、`low|medium|high` のいずれか
- `due`: 任意、期限（ISO 日付）
- `issue`: 任意、関連 Issue 番号

例:

<!-- TODO: adjust Playwright timeout for flaky test | assignee:@shimanotakumi | priority:medium | due:2026-03-01 | issue:#42 -->

運用ルール:
- ドキュメントやコードに TODO を残すときは上記フォーマットを使う。
- UI に表示してはならないため、コメント形式（HTML コメント）で残す。
- 重要な TODO は必ず GitHub Issue に紐付ける（可能な限り）。
- 週次で `docs/TODO_SUMMARY.md` を確認し、対応/移動（Issue 作成）を行う。

自動化:
- ルートにある `scripts/extract_todos.js` を使って、リポジトリ内の TODO コメントを集約できます。
- npm スクリプト `npm run docs:todos` を実行すると `docs/TODO_SUMMARY.md` が更新されます。