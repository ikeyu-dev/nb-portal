# AGENT.md

## ブランチ命名

- 作業ブランチは必ず目的を表す接頭辞を付ける。
- 形式は `{prefix}/{feature-name}` とする。
- 新機能や機能改善は `feat/{機能名}` を使う。
- 不具合修正は `fix/{修正内容}` を使う。
- ドキュメント修正は `docs/{修正内容}` を使う。
- セキュリティ対応は `security/{対応内容}` を使う。
- `codex/...` のようなエージェント名だけを接頭辞にしたブランチ名は使わない。

例:

- `feat/show-absence-times-in-schedule-detail`
- `fix/calendar-modal-layout`
- `docs/update-agent-rules`
- `security/protect-worker-api`

## コミットメッセージ

- コミットメッセージは日本語で統一する。
- 接頭辞の後にコロン「:」を入れ、その後に半角スペースを入れる。
- 具体的でわかりやすい内容にする。
- 語尾は言い切りにする。

例:

- `feat: スケジュール詳細に早退時間を表示`
- `fix: カレンダー詳細モーダルの表示崩れを修正`
- `docs: エージェント作業ルールを追加`
