# 公式LINEからDiscordへの転送

## 動作

- RFC・友遊・MFSC・SoM・NBの部長として登録したLINEユーザーからの1対1メッセージだけを転送します。グループ・複数人トークと未登録ユーザーは対象外です。
- テキスト、添付の音声ファイル（MP3、M4A、AAC、WAV、FLAC、OGG、Opus、AIF、AIFF）、PDF、PowerPoint（PPT、PPTX）を転送します。LINEアプリで録音したボイスメッセージは転送も通知もしません。画像・動画などの対象外ファイルは、種類とファイル名をDiscordに通知します。
- Discordの添付上限を超えたファイルは添付せず、公式LINEのトークからダウンロードするよう案内します。
- Discordへの送信先は専用WebhookとスレッドIDで指定します。未設定・不正時に他機能のWebhookへは切り替えません。
- LINEのWebhook署名を検証してから処理し、イベントIDで重複転送を抑止します。転送対象の本文やファイル本体はD1に保存しません。処理待ちデータはCloudflare Queuesに一時保存されます。
- 未登録の個別チャットは、登録候補として送信者IDと直近4件までのテキストを幹部向けに表示します。表示対象は直近30日間で、団体への登録時に候補と本文を削除します。添付や過去のトーク履歴は保存しません。
- 一時的な通信エラーは10分間隔で最大3回再試行します。設定不備や恒久的なAPIエラーは再試行しません。

## 設定

Workerの開発環境・本番環境それぞれに以下を設定します。値は環境ごとに分けて登録し、コードや`wrangler.jsonc`には秘密値を置きません。

| 名前                                | 種別             | 用途                                                                        |
| ----------------------------------- | ---------------- | --------------------------------------------------------------------------- |
| `LINE_CHANNEL_SECRET`               | Secret           | LINE DevelopersのMessaging APIチャネルシークレット。Webhook署名の検証に使用 |
| `LINE_CHANNEL_ACCESS_TOKEN`         | Secret           | Messaging APIのチャネルアクセストークン。添付ファイルの取得に使用           |
| `DISCORD_LINE_RELAY_WEBHOOK_URL`    | Secret           | 転送専用Discord Webhook URL                                                 |
| `DISCORD_LINE_RELAY_THREAD_ID`      | Secret           | 転送先の既存DiscordスレッドID                                               |
| `DISCORD_LINE_RELAY_MAX_FILE_BYTES` | Variable（任意） | Discord側の実際の添付上限をバイト単位で指定。未指定時は20 MiB               |

LINE DevelopersのWebhook URLにはWorkerの`/line/webhook`エンドポイントを設定します。LINEチャネルにはWebhook URLが1つだけなので、すでに別のWebhook連携がある場合は置き換える前に統合方法を確認してください。

Cloudflare Queuesは`wrangler.jsonc`に開発用・本番用の名前を定義していますが、実際のQueue作成、D1マイグレーション適用、Secret登録、LINE/Discord接続設定は別途必要です。これらが済むまでは転送は稼働しません。

## 部長とLINE IDの登録

幹部役員はポータルの「LINE転送設定」で5団体分の部長名、表示ラベル、LINEユーザーIDを編集できます。LINEユーザーIDはMessaging APIのWebhookイベントに含まれる`source.userId`を登録します。LINE公式アカウントのトーク上で設定する友だち表示名はMessaging APIイベントから取得できるとは限らないため、ポータルの表示ラベルはここで管理します。

同じLINEユーザーIDを複数団体には登録できません。IDは`U`に続く32桁の16進数として検証します。
