# 当日の欠席者・部会通知

## 実行基盤

GAS の時間主導型トリガーは使わない。Cloudflare Worker `nb-portal-api`
の Cron Triggers で実行する。

本番環境の cron:

- `0 15 * * *`: 00:00 JST
- `0 23 * * *`: 08:00 JST
- `30 3 * * *`: 12:30 JST
- `0 9 * * *`: 18:00 JST

Cloudflare の cron は UTC 指定のため、JST から 9 時間引いた時刻で設定する。

## 出欠入力期限

`schedules.attendance_deadline` は日付のみを保存する。アプリ側ではその日の
08:00 JST を締め切り時刻として扱い、期限未指定の予定は予定開始日を期限日に
する。

## 00:00 JST の処理

`schedules` の `is_past` を更新する。

- `date < 今日(JST)`: `is_past = 1`
- `date >= 今日(JST)`: `is_past = 0`

予定作成・更新時にも同じ判定を行うため、cron 実行前でも API レスポンスの
`IS_PAST` は現在日付に基づいた値になる。

## 08:00 JST の処理

`schedules` と `absences` を D1 から読み、当日の予定に紐づく申告を
イベントごとの Embed にして Discord へ送信する。

全員参加（`ABSENCE`）の予定で送信する対象:

- `欠席`
- `遅刻`
- `早退`
- `中抜け`

希望者参加（`ATTENDANCE`）の予定では `出席` のみを送信する。異なる
出欠方式の予定が同じ日にある場合も、申告者をイベント間で混在させない。
1イベントの対象者が25人を超える場合は、Discord の Embed フィールド上限に
合わせて25人ごとの継続 Embed に分割する。
Cron 通知が1メッセージあたりの Embed 数または合計文字数の上限を超える場合は、
複数メッセージに分割して全件送信する。`/absences`（`/欠席者`）コマンドは
先頭メッセージ分を表示し、残りがある場合は省略件数を表示する。

早退・中抜けの場合は、入力されている時間も表示する。

対象者がいない場合:

- 今日の予定がない場合: `本日の予定はありません`
- 全員参加の予定に欠席系申告がない場合: `本日の欠席者はいません`
- 希望者参加の予定に出席申告がない場合: `本日の出席者はいません`

Discord の `/absences`（`/欠席者`）コマンドも同じ Embed 生成処理を使う。

同じ 08:00 JST の処理で `next_meeting_settings` も確認する。次回部会日が当日かつ通知モードが `IN_PERSON` の場合だけ、対面部会通知を送信する。当日以降の予定が登録されていない場合は次回部会未設定の通知も送信する。

## 12:30 JST の処理

`next_meeting_settings` を D1 から読み、次回部会日が当日かつ通知モードが
`IN_PERSON` の場合だけ、対面部会通知を送信する。

## 18:00 JST の処理

`next_meeting_settings` を D1 から読み、次回部会日が当日かつ通知モードが
`DISCORD` の場合だけ Discord に送信する。

## Discord 送信

Worker は Discord Webhook を直接持たず、Next.js 側の
`/api/discord-send` に送信を委譲する。

Cloudflare Cron は少なくとも1回実行のため、Worker は
`cron_executions` に `running` / `completed` / `failed` を記録する。同じ
cron と scheduled time が `completed` の場合は再送しない。失敗した実行は
`failed` として保存され、Cloudflare の再試行時に再実行できる。

必要な Cloudflare Worker 設定:

- `PUSH_API_SECRET`: Next.js の `/api/discord-send` を呼び出すための共有シークレット
- `APP_DISCORD_SEND_URL`: 本番 Next.js の `/api/discord-send`
- `NEXT_MEETING_ROLE_MENTION`: 部会通知でメンションする文字列
- `NEXT_MEETING_UNSET_ROLE_MENTION`: 次回部会未設定通知でメンションする文字列

`PUSH_API_SECRET` は secret として設定し、リポジトリには保存しない。
