# ドキュメントインデックス

**Elevation Loom プロジェクトドキュメント一覧**  
**最終更新**: 2026-02-10

---

## 📖 ドキュメントの使い方

このプロジェクトには **10個の目的別ドキュメント** が用意されています。あなたの状況に応じて、適切なドキュメントから始めてください。

### 🎯 あなたはどの立場ですか？

```
┌─────────────────────────────────────────────────────────────┐
│                     スタート地点を選ぶ                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
        ┌─────────────────────┼─────────────────────┐
        ↓                     ↓                     ↓
   👨‍💻 開発者              📊 プロジェクト         🔧 PLC技術者
   （新規参加）           管理者・評価者          （Web開発初心者）
        │                     │                     │
        ↓                     ↓                     ↓
   README.md            DEVELOPMENT_PHASE_     QUICK_START_FOR_
   ↓                    ASSESSMENT.md          PLC_ENGINEERS.md
   CONTRIBUTING.md      ↓                      ↓
   ↓                    ROADMAP.md             LEARNING_PATH.md
   CODE_WALKTHROUGH.md                         ↓
                                               CODE_WALKTHROUGH.md
```

---

## 📚 全ドキュメント一覧（10ファイル）

### 🚀 入門ドキュメント

| ドキュメント | 対象者 | 読了時間 | 内容 |
|------------|--------|---------|------|
| **[QUICK_START_FOR_PLC_ENGINEERS.md](./QUICK_START_FOR_PLC_ENGINEERS.md)** | PLC技術者 | 15分 | PLC/ST技術者向けクイックスタート |
| **[BEGINNER_WORKFLOW.md](./BEGINNER_WORKFLOW.md)** | IT初心者 | 45分 | 標準的な開発ワークフロー、チェックリスト、トラブルシューティング |

### 📚 学習ドキュメント

| ドキュメント | 対象者 | 読了時間 | 内容 |
|------------|--------|---------|------|
| **[LEARNING_PATH.md](./LEARNING_PATH.md)** | PLC技術者 | 60分 | Web開発学習ロードマップ（PLC対応表付き） |
| **[CODE_WALKTHROUGH.md](./CODE_WALKTHROUGH.md)** | 開発者 | 90分 | コード詳細解説（全ファイルの役割と構造） |

### 🔧 開発ドキュメント

| ドキュメント | 対象者 | 読了時間 | 内容 |
|------------|--------|---------|------|
| **[CONTRIBUTING.md](./CONTRIBUTING.md)** | コントリビューター | 10分 | コントリビューションガイド、開発セットアップ、TODOルール |

### 📋 仕様・計画ドキュメント

| ドキュメント | 対象者 | 読了時間 | 内容 |
|------------|--------|---------|------|
| **[Elevation_Loom_MVP仕様書_final.md](./Elevation_Loom_MVP仕様書_final.md)** | 全員 | 30分 | MVP仕様書（機能要件、データモデル） |
| **[DEVELOPMENT_PHASE_ASSESSMENT.md](./DEVELOPMENT_PHASE_ASSESSMENT.md)** | 管理者・評価者 | 30分 | 開発フェーズの現状評価、IT業界標準との比較 |
| **[ROADMAP.md](./ROADMAP.md)** | 全員 | 40分 | 開発ロードマップ（完了済みフェーズ、KGI/KPI、今後の計画） |

### 🚢 運用ドキュメント

| ドキュメント | 対象者 | 読了時間 | 内容 |
|------------|--------|---------|------|
| **[RELEASE.md](./RELEASE.md)** | リリース担当者 | 5分 | リリース手順、バージョニング |

### 📖 ナビゲーション

| ドキュメント | 対象者 | 読了時間 | 内容 |
|------------|--------|---------|------|
| **[DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)** | 全員 | 10分 | このファイル（ドキュメントの索引） |

---

## 🗺️ 状況別ガイド

### 👨‍💻 開発に参加したい

**推奨順序**:
1. [README.md](../README.md) - プロジェクト概要とセットアップ（5分）
2. [CONTRIBUTING.md](./CONTRIBUTING.md) - 開発ワークフロー（10分）
3. [BEGINNER_WORKFLOW.md](./BEGINNER_WORKFLOW.md) - 詳細な手順（45分）
4. [CODE_WALKTHROUGH.md](./CODE_WALKTHROUGH.md) - コード理解（90分）

**習得できること**:
- ✅ ローカル開発環境のセットアップ
- ✅ Git/GitHubの使い方
- ✅ テストの書き方・実行方法
- ✅ コードレビューの受け方

---

### 📊 プロジェクトを評価したい

**推奨順序**:
1. [DEVELOPMENT_PHASE_ASSESSMENT.md](./DEVELOPMENT_PHASE_ASSESSMENT.md) - 現状評価（30分）
2. [ROADMAP.md](./ROADMAP.md) - 今後の計画（40分）

**わかること**:
- ✅ プロジェクトの成熟度レベル（Level 4: Production Ready）
- ✅ テストカバレッジ（89.75%）
- ✅ IT業界標準との比較
- ✅ 今後3-12ヶ月のロードマップとKGI/KPI

---

### 🔧 Web開発を学びたい（PLC技術者）

**推奨順序**:
1. [QUICK_START_FOR_PLC_ENGINEERS.md](./QUICK_START_FOR_PLC_ENGINEERS.md) - クイックスタート（15分）
2. [LEARNING_PATH.md](./LEARNING_PATH.md) - 学習パス（60分）
3. [CODE_WALKTHROUGH.md](./CODE_WALKTHROUGH.md) - コード解説（90分）

**習得できること**:
- ✅ PLCとWeb開発の対応関係
- ✅ JavaScriptの基礎
- ✅ 非同期処理の理解
- ✅ ブラウザAPIの使い方

---

### 💻 コードを理解したい

**推奨順序**:
1. [Elevation_Loom_MVP仕様書_final.md](./Elevation_Loom_MVP仕様書_final.md) - 機能仕様（30分）
2. [CODE_WALKTHROUGH.md](./CODE_WALKTHROUGH.md) - コード詳細（90分）
3. 実際のコードを読む

**理解できること**:
- ✅ アプリケーションの全体構造
- ✅ 各ファイルの役割と依存関係
- ✅ データモデル（IndexedDB）
- ✅ 描画ロジック（Canvas API）

---

## 📝 ドキュメント構造

```
docs/
├── DOCUMENTATION_INDEX.md          【このファイル】ナビゲーションハブ
│
├── 【入門】
│   ├── QUICK_START_FOR_PLC_ENGINEERS.md
│   └── BEGINNER_WORKFLOW.md
│
├── 【学習】
│   ├── LEARNING_PATH.md
│   └── CODE_WALKTHROUGH.md
│
├── 【開発】
│   └── CONTRIBUTING.md
│
├── 【仕様・計画】
│   ├── Elevation_Loom_MVP仕様書_final.md
│   ├── DEVELOPMENT_PHASE_ASSESSMENT.md
│   └── ROADMAP.md
│
└── 【運用】
    └── RELEASE.md
```

---

## 🔄 ドキュメント更新ルール

### 更新が必要なタイミング

| 変更内容 | 更新するドキュメント |
|---------|-------------------|
| 新機能追加 | CODE_WALKTHROUGH.md, README.md |
| 仕様変更 | Elevation_Loom_MVP仕様書_final.md |
| ロードマップ更新 | ROADMAP.md |
| 開発プロセス変更 | CONTRIBUTING.md, BEGINNER_WORKFLOW.md |
| リリース | ROADMAP.md（完了項目）, RELEASE.md |

### ドキュメントレビュー

- ✅ コード変更と同時にドキュメント更新
- ✅ Pull Requestにドキュメント変更を含める
- ✅ 月次で古いドキュメントを見直し

---

## ❓ よくある質問

**Q1: どのドキュメントから読めばいい？**

A: 
- 👨‍💻 **開発者**: README.md → CONTRIBUTING.md → CODE_WALKTHROUGH.md
- 📊 **管理者**: DEVELOPMENT_PHASE_ASSESSMENT.md → ROADMAP.md
- 🔧 **PLC技術者**: QUICK_START_FOR_PLC_ENGINEERS.md → LEARNING_PATH.md

**Q2: 全部読む必要がある？**

A: いいえ！必要なものだけ読んでください。
- 最低限: README.md + 自分の役割に関連するドキュメント1つ
- 必要に応じて他のドキュメントを参照

**Q3: ドキュメントに間違いを見つけた**

A: GitHub Issueで報告するか、Pull Requestで修正してください。

---

## 📊 ドキュメント統計

- **総数**: 10ファイル（整理前: 17ファイル）
- **削減率**: 41%
- **総行数**: 約5,200行
- **総サイズ**: 約160KB
- **最終整理**: 2026-02-10

---

**次のアクション**:

```markdown
自分の状況に当てはまるものにチェック:

[ ] 👨‍💻 開発を始めたい → README.md → CONTRIBUTING.md
[ ] 📊 プロジェクトを評価したい → DEVELOPMENT_PHASE_ASSESSMENT.md
[ ] 🔧 Web開発を学びたい（PLC経験者） → QUICK_START_FOR_PLC_ENGINEERS.md
[ ] 💻 コードを理解したい → CODE_WALKTHROUGH.md
```

---

**ドキュメントバージョン**: 2.0  
**最終更新**: 2026-02-10  
**メンテナー**: プロジェクトチーム
