# APIリファレンス

NB-PortalのAPIエンドポイントについて説明する。

## 概要

NB-Portalは2種類のAPIを使用している:

1. **Next.js API Routes**: Next.jsの内部API
2. **GAS API**: Google Apps ScriptによるバックエンドAPI

## Next.js API Routes

### 認証API

#### POST /api/auth/[...nextauth]

NextAuth.jsのハンドラ。OAuth認証フローを処理する。

### プッシュ通知API

#### POST /api/push-subscribe

プッシュ通知の購読を登録する。

**認証**: 必須

**リクエスト**:
```json
{
    "subscription": {
        "endpoint": "https://fcm.googleapis.com/...",
        "keys": {
            "p256dh": "...",
            "auth": "..."
        }
    },
    "studentId": "1234567"
}
```

**レスポンス**:
```json
{
    "success": true,
    "message": "Subscription saved successfully"
}
```

#### DELETE /api/push-subscribe

プッシュ通知の購読を解除する。

**認証**: 必須

**リクエスト**:
```json
{
    "endpoint": "https://fcm.googleapis.com/..."
}
```

**レスポンス**:
```json
{
    "success": true,
    "message": "Subscription removed successfully"
}
```

#### POST /api/push-send

プッシュ通知を送信する。GASから呼び出される。

**認証**: `Authorization: Bearer {PUSH_API_SECRET}`

**リクエスト**:
```json
{
    "title": "新しいお知らせ",
    "body": "本文",
    "url": "/notifications",
    "tag": "notification-123"
}
```

**レスポンス**:
```json
{
    "success": true,
    "sent": 10,
    "failed": 0
}
```

### スケジュールAPI

#### POST /api/schedule

スケジュールを新規作成する。

**認証**: 必須

**リクエスト**:
```json
{
    "date": "2025-01-15",
    "title": "イベント名",
    "time": "14:00",
    "color": "#ff0000"
}
```

**レスポンス**:
```json
{
    "success": true,
    "data": {
        "id": "...",
        "date": "2025-01-15",
        "title": "イベント名",
        "createdBy": "1234567"
    }
}
```

#### PUT /api/schedule

スケジュールを更新する。

**認証**: 必須

**リクエスト**:
```json
{
    "id": "...",
    "date": "2025-01-15",
    "title": "更新後のイベント名",
    "time": "15:00"
}
```

#### DELETE /api/schedule

スケジュールを削除する。

**認証**: 必須

**リクエスト**:
```json
{
    "id": "..."
}
```

### 欠席API

#### POST /api/absence

欠席連絡を送信する。

**認証**: 必須

**リクエスト**:
```json
{
    "eventId": "...",
    "reason": "体調不良のため"
}
```

### バス時刻表API

#### GET /api/bus-schedule

バス時刻表を取得する。NIT公式ページをスクレイピング。

**認証**: 不要

**クエリパラメータ**:
- `date`: 日付（YYYY-MM-DD形式）

**レスポンス**:
```json
{
    "success": true,
    "data": {
        "lastUpdated": "2025-01-15T10:00:00Z",
        "schedules": [
            {
                "departure": "08:00",
                "arrival": "08:30",
                "route": "..."
            }
        ]
    }
}
```

**キャッシュ**: その日の23:59まで有効

## GAS API

Google Apps Scriptで実装されたバックエンドAPI。

### ベースURL

```
NEXT_PUBLIC_GAS_API_URL
```

### 共通レスポンス形式

```typescript
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    count?: number;
    error?: string;
    message?: string;
    timestamp?: string;
}
```

### エンドポイント

#### GET ?path=items

アイテム一覧を取得する。

**レスポンス**:
```json
{
    "success": true,
    "data": [
        {
            "id": "...",
            "name": "アイテム名",
            "category": "カテゴリ",
            "status": "available"
        }
    ],
    "count": 10
}
```

#### GET ?path=schedules

スケジュール一覧を取得する。

**レスポンス**:
```json
{
    "success": true,
    "data": [
        {
            "id": "...",
            "date": "2025-01-15",
            "title": "イベント名",
            "time": "14:00",
            "color": "#ff0000"
        }
    ]
}
```

#### GET ?path=absences&date={date}

指定日の欠席者一覧を取得する。

**クエリパラメータ**:
- `date`: 日付（YYYY-MM-DD形式）

#### GET ?path=event-absences&eventId={eventId}

指定イベントの欠席者一覧を取得する。

#### GET ?path=health

ヘルスチェック。

**レスポンス**:
```json
{
    "success": true,
    "message": "OK"
}
```

#### GET ?path=verify-member&identifier={studentId}

部員確認。

**クエリパラメータ**:
- `identifier`: 学籍番号

**レスポンス**:
```json
{
    "isMember": true
}
```

#### POST ?path=push-subscribe

プッシュ通知の購読を登録（GAS側）。

#### POST ?path=push-unsubscribe

プッシュ通知の購読を解除（GAS側）。

#### GET ?path=push-subscriptions

全購読者一覧を取得。プッシュ通知送信時に使用。

## エラーハンドリング

### HTTPステータスコード

| コード | 説明 |
|--------|------|
| 200 | 成功 |
| 400 | リクエスト不正 |
| 401 | 認証エラー |
| 403 | アクセス拒否 |
| 404 | リソースが見つからない |
| 500 | サーバーエラー |

### エラーレスポンス

```json
{
    "success": false,
    "error": "エラーメッセージ"
}
```

## 認証ヘッダー

### セッション認証（Next.js API）

Cookieベースのセッション認証。`auth()` 関数でセッションを取得。

### APIシークレット認証（push-send）

```
Authorization: Bearer {PUSH_API_SECRET}
```

### GAS API認証

```
Authorization: Bearer {GAS_API_SECRET}
```
