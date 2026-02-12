# ドキュメントインデックス

Elevation Loom のドキュメントを、**日常的に読むもの（Core）** と
**背景・履歴を参照するもの（Reference）** に分けて整理しました。

**最終更新**: 2026-02-13

---

## ドキュメントの分類ルール

- Core: 日常の開発・運用で継続的に参照する文書
- Reference: 設計背景、監査結果、移行履歴などの保存文書

---

## 最初に読む順番

### 開発に参加する

1. [README.md](../README.md)
2. [CONTRIBUTING.md](./CONTRIBUTING.md)
3. [BEGINNER_WORKFLOW.md](./BEGINNER_WORKFLOW.md)
4. [CODE_WALKTHROUGH.md](./CODE_WALKTHROUGH.md)

### PLC技術者として学ぶ

1. [QUICK_START_FOR_PLC_ENGINEERS.md](./QUICK_START_FOR_PLC_ENGINEERS.md)
2. [LEARNING_PATH.md](./LEARNING_PATH.md)
3. [CODE_WALKTHROUGH.md](./CODE_WALKTHROUGH.md)

### 現状評価・計画を把握する

1. [DEVELOPMENT_PHASE_ASSESSMENT.md](./DEVELOPMENT_PHASE_ASSESSMENT.md)
2. [ROADMAP.md](./ROADMAP.md)
3. [RELEASE.md](./RELEASE.md)

---

## Core Docs（常用）

### 入口・運用

- [README.md](../README.md): プロジェクト概要、セットアップ、コマンド
- [CONTRIBUTING.md](./CONTRIBUTING.md): 開発フロー、品質ゲート、TODO運用
- [RELEASE.md](./RELEASE.md): リリース手順・バージョニング

### 学習・理解

- [QUICK_START_FOR_PLC_ENGINEERS.md](./QUICK_START_FOR_PLC_ENGINEERS.md)
- [BEGINNER_WORKFLOW.md](./BEGINNER_WORKFLOW.md)
- [LEARNING_PATH.md](./LEARNING_PATH.md)
- [CODE_WALKTHROUGH.md](./CODE_WALKTHROUGH.md)

### 仕様・計画

- [Elevation_Loom_MVP仕様書_final.md](./Elevation_Loom_MVP仕様書_final.md)
- [ROADMAP.md](./ROADMAP.md)
- [CHANGELOG.md](../CHANGELOG.md)

### ルート直下の運用文書

- [ARCHITECTURE.md](../ARCHITECTURE.md)
- [PRODUCTION_CHECKLIST.md](../PRODUCTION_CHECKLIST.md)
- [FIRESTORE_RULES.md](../FIRESTORE_RULES.md)

---

## Reference Docs（背景・履歴）

以下は日常運用の一次情報ではなく、背景説明・監査・移行履歴として保持します。

- [CLOUD_NATIVE_ARCHITECTURE.md](./CLOUD_NATIVE_ARCHITECTURE.md)
- [FIREBASE_REFACTORING.md](./FIREBASE_REFACTORING.md)
- [SECURITY_SUMMARY.md](./SECURITY_SUMMARY.md)
- [DEVELOPMENT_PHASE_ASSESSMENT.md](./DEVELOPMENT_PHASE_ASSESSMENT.md)

---

## 更新ルール（簡易）

- 機能変更時: `README.md` / `CODE_WALKTHROUGH.md` / 必要な仕様書を同時更新
- 開発フロー変更時: `CONTRIBUTING.md` を更新
- リリース時: `CHANGELOG.md` と `RELEASE.md` を更新
- 大きな設計変更時: `CLOUD_NATIVE_ARCHITECTURE.md` と関連 Reference を更新

---

## メンテナンス方針

- 新規ドキュメント追加時は、この `DOCUMENTATION_INDEX.md` に必ず追記
- 内容が古くなった文書は削除ではなく Reference 化を優先
- 四半期ごとにリンク切れと重複内容を棚卸し

---

**総ドキュメント数（現行）**: 13 ファイル（`docs/` 配下）

