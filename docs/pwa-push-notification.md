# PWAとプッシュ通知

NB-PortalのPWA（Progressive Web App）とプッシュ通知機能について説明する。

## PWA構成

### マニフェスト（public/manifest.json）

```json
{
    "name": "NB-Portal",
    "short_name": "NB-Portal",
    "description": "NB-Portal - 部活動管理ポータル",
    "start_url": "/home",
    "display": "standalone",
    "scope": "/",
    "background_color": "#ffffff",
    "theme_color": "#0086bf",
    "orientation": "portrait-primary",
    "icons": [
        {
            "src": "/icons/icon-192x192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any maskable"
        },
        {
            "src": "/icons/icon-512x512.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any maskable"
        }
    ]
}
```

### Service Worker（public/sw.js）

```javascript
// Install: 即座にアクティブ化
self.addEventListener("install", function (event) {
    self.skipWaiting();
});

// Activate: クライアント制御を取得
self.addEventListener("activate", function (event) {
    event.waitUntil(clients.claim());
});

// Push: 通知表示
self.addEventListener("push", function (event) {
    const data = event.data.json();
    const options = {
        body: data.body,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
        tag: data.tag,
        data: { url: data.url },
        vibrate: [100, 50, 100]
    };
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification Click: ナビゲーション
self.addEventListener("notificationclick", function (event) {
    event.notification.close();
    const url = event.notification.data?.url || "/notifications";
    event.waitUntil(
        clients.matchAll({ type: "window" }).then(function (clientList) {
            // 既存ウィンドウがあればフォーカス
            for (const client of clientList) {
                if (client.url.includes(self.location.origin)) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            // なければ新規ウィンドウ
            return clients.openWindow(url);
        })
    );
});
```

### Service Worker登録

`src/components/ServiceWorkerRegistration.tsx`:

```typescript
export function ServiceWorkerRegistration() {
    useEffect(() => {
        if (!("serviceWorker" in navigator)) return;

        const register = async () => {
            // 既存登録を確認
            const existing = await navigator.serviceWorker.getRegistration("/");
            if (existing?.active) {
                window.dispatchEvent(new Event("sw-ready"));
                return;
            }

            // 新規登録
            const registration = await navigator.serviceWorker.register("/sw.js");

            // アクティブ化を待機
            if (registration.installing) {
                registration.installing.addEventListener("statechange", function() {
                    if (this.state === "activated") {
                        window.dispatchEvent(new Event("sw-ready"));
                    }
                });
            }
        };

        register();
    }, []);

    return null;
}
```

## プッシュ通知

### アーキテクチャ

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   ユーザー    │     │  ブラウザ    │     │   Service    │
│   操作       │────▶│  Push API   │────▶│   Worker     │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                                                  ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  GAS         │────▶│  Next.js     │────▶│  Web Push    │
│  (トリガー)   │     │  /api/push   │     │  サービス    │
└──────────────┘     └──────────────┘     └──────────────┘
```

### VAPID（Voluntary Application Server Identification）

Web Push Protocolで使用される認証方式:

- **公開鍵**: クライアント側で購読時に使用
- **秘密鍵**: サーバー側で通知送信時に署名生成

### プッシュ通知の購読

`src/features/push-notification/ui/PushNotificationToggle.tsx`:

```typescript
const subscribe = async () => {
    // 1. 通知許可をリクエスト
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    // 2. Service Worker登録を取得（リトライ付き）
    const registration = await getServiceWorkerRegistration(5, 2000);

    // 3. プッシュ購読を作成
    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    // 4. サーバーに登録
    await fetch("/api/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            subscription: subscription.toJSON(),
            studentId
        })
    });
};
```

### プッシュ通知の送信

`app/api/push-send/route.ts`:

```typescript
export async function POST(request: Request) {
    // 1. 認証確認
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${PUSH_API_SECRET}`) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. 購読者一覧を取得
    const subscriptions = await getSubscriptions();

    // 3. 各購読者に通知送信
    for (const sub of subscriptions) {
        try {
            await webpush.sendNotification(
                sub.subscription,
                JSON.stringify({ title, body, url, tag })
            );
        } catch (error) {
            if (error.statusCode === 410) {
                // 購読が無効になっている場合は削除
                await removeSubscription(sub.endpoint);
            }
        }
    }
}
```

### 通知の状態管理

| 状態 | 説明 |
|------|------|
| loading | 初期化中 |
| unsupported | ブラウザ非対応 |
| denied | 通知がブロックされている |
| subscribed | 購読中 |
| unsubscribed | 未購読 |

## 環境変数

```bash
# VAPID鍵（web-pushで生成）
NEXT_PUBLIC_VAPID_PUBLIC_KEY    # クライアント側で使用
VAPID_PRIVATE_KEY               # サーバー側で使用
VAPID_SUBJECT                   # "mailto:example@example.com"

# API認証
PUSH_API_SECRET                 # GAS ↔ Next.js間の認証
```

### VAPID鍵の生成

```bash
npx web-push generate-vapid-keys
```

## トラブルシューティング

### 「Service Workerが利用できません」

原因:
- sw.jsがデプロイされていない（.gitignoreに含まれていた）
- Service Workerの登録に失敗している

対処:
1. `public/sw.js`がgitに追加されているか確認
2. ブラウザのDevToolsでService Worker状態を確認
3. ページを再読み込み

### 「Script load failed」

原因:
- sw.jsファイルがサーバーから提供されていない（404）

対処:
1. Vercelにデプロイされているか確認
2. `curl https://your-domain.vercel.app/sw.js` で確認

### 通知が届かない

原因:
- VAPID鍵の設定ミス
- 購読情報がサーバーに保存されていない
- 410エラーで購読が削除された

対処:
1. 環境変数を確認
2. GASのスプレッドシートで購読情報を確認
3. 再度購読をオンにする

### iOS/Safariで動作しない

iOS 16.4以降のSafariでWeb Push通知がサポートされている。要件:
- PWAとしてホーム画面に追加
- ユーザーによる明示的な許可

## 注意事項

- `userVisibleOnly: true`は必須（バックグラウンド通知は許可されていない）
- 通知にはユーザーの明示的な許可が必要
- 購読情報はブラウザ/デバイスごとに異なる
- 410 Goneエラー時は購読を自動削除する必要がある
