# PWAとプッシュ通知
<span style="display:block;height:3px;background:#2a83a2;margin-top:-8px;margin-bottom:16px;"></span>

## PWA構成
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

### マニフェスト（public/manifest.json）

```json
{
    "name": "NB-Portal",
    "short_name": "NB-Portal",
    "start_url": "/home",
    "display": "standalone",
    "theme_color": "#0086bf",
    "icons": [
        { "src": "/icons/icon-192x192.png", "sizes": "192x192", "purpose": "any maskable" },
        { "src": "/icons/icon-512x512.png", "sizes": "512x512", "purpose": "any maskable" }
    ]
}
```

### Service Worker（public/sw.js）

- **install** - 即座にアクティブ化
- **activate** - クライアント制御を取得
- **push** - 通知表示
- **notificationclick** - 通知タップでナビゲーション

## プッシュ通知
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

### アーキテクチャ

```
ユーザー → ブラウザ Push API → Service Worker
                                    ↓
GAS（トリガー）→ Next.js /api/push → Web Pushサービス
```

### VAPID

Web Push認証方式:
- **公開鍵** - クライアント側で購読時に使用
- **秘密鍵** - サーバー側で署名生成

### 購読フロー

1. 通知許可をリクエスト
2. Service Worker登録を取得（リトライ付き）
3. プッシュ購読を作成
4. サーバーに登録

### 送信フロー

1. 認証確認（`PUSH_API_SECRET`）
2. 購読者一覧を取得
3. 各購読者に通知送信
4. 410エラー時は購読を削除

### 通知の状態

| 状態 | 説明 |
|------|------|
| loading | 初期化中 |
| unsupported | ブラウザ非対応 |
| denied | 通知がブロック |
| subscribed | 購読中 |
| unsubscribed | 未購読 |

## 環境変数
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

```bash
# VAPID鍵
NEXT_PUBLIC_VAPID_PUBLIC_KEY    # クライアント側
VAPID_PRIVATE_KEY               # サーバー側
VAPID_SUBJECT                   # "mailto:example@example.com"

# API認証
PUSH_API_SECRET                 # GAS ↔ Next.js間
```

### VAPID鍵の生成

```bash
npx web-push generate-vapid-keys
```

## トラブルシューティング
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

### 「Service Workerが利用できません」

- `public/sw.js`がgitに追加されているか確認
- DevToolsでService Worker状態を確認
- ページを再読み込み

### 「Script load failed」

- sw.jsが404になっていないか確認
- `curl https://your-domain.vercel.app/sw.js`で確認

### 通知が届かない

- VAPID鍵の設定確認
- GASスプレッドシートで購読情報を確認
- 再度購読をオンにする

### iOS/Safariで動作しない

iOS 16.4以降のSafariでサポート。要件:
- PWAとしてホーム画面に追加
- ユーザーによる明示的な許可

## 注意事項
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

- `userVisibleOnly: true`は必須
- 通知にはユーザーの明示的な許可が必要
- 購読情報はブラウザ/デバイスごとに異なる
- 410 Goneエラー時は購読を自動削除
