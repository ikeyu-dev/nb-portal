# APIリファレンス
<span style="display:block;height:3px;background:#2a83a2;margin-top:-8px;margin-bottom:16px;"></span>

## 概要
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

- **Next.js API Routes** - 内部API
- **GAS API** - Google Apps Scriptバックエンド

## Next.js API Routes
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

### 認証API

#### POST /api/auth/[...nextauth]

NextAuth.jsハンドラ。OAuth認証フローを処理。

### プッシュ通知API

#### POST /api/push-subscribe

プッシュ通知購読を登録。

- **認証**: 必須

```json
// Request
{
    "subscription": { "endpoint": "...", "keys": { "p256dh": "...", "auth": "..." } },
    "studentId": "1234567"
}

// Response
{ "success": true, "message": "Subscription saved successfully" }
```

#### DELETE /api/push-subscribe

プッシュ通知購読を解除。

- **認証**: 必須

```json
// Request
{ "endpoint": "https://fcm.googleapis.com/..." }

// Response
{ "success": true, "message": "Subscription removed successfully" }
```

#### POST /api/push-send

プッシュ通知を送信（GASから呼び出し）。

- **認証**: `Authorization: Bearer {PUSH_API_SECRET}`

```json
// Request
{ "title": "新しいお知らせ", "body": "本文", "url": "/notifications", "tag": "notification-123" }

// Response
{ "success": true, "sent": 10, "failed": 0 }
```

### スケジュールAPI

#### POST /api/schedule

スケジュール新規作成。

- **認証**: 必須

```json
// Request
{ "date": "2025-01-15", "title": "イベント名", "time": "14:00", "color": "#ff0000" }

// Response
{ "success": true, "data": { "id": "...", "date": "2025-01-15", "title": "イベント名" } }
```

#### PUT /api/schedule

スケジュール更新。

- **認証**: 必須

```json
// Request
{ "id": "...", "date": "2025-01-15", "title": "更新後のイベント名", "time": "15:00" }
```

#### DELETE /api/schedule

スケジュール削除。

- **認証**: 必須

```json
// Request
{ "id": "..." }
```

### 機材API

#### POST /api/items

機材新規登録。

- **認証**: 必須

| カテゴリ | 説明 |
|----------|------|
| MIC | マイク |
| SPK | スピーカー |
| CAB | ケーブル |
| OTH | その他 |

```json
// Request
{ "category": "MIC", "name": "SM58", "count": 3 }

// Response
{ "success": true, "data": { "created": ["MIC001", "MIC002", "MIC003"] } }
```

> IDはカテゴリ + 3桁連番で自動生成

#### PUT /api/items

機材更新。

- **認証**: 必須

```json
// Request
{ "itemId": "MIC001", "name": "SM58 (更新後)" }

// Response
{ "success": true, "data": { "updated": "MIC001" } }
```

#### DELETE /api/items

機材削除。

- **認証**: 必須

```json
// Request
{ "itemId": "MIC001" }

// Response
{ "success": true, "data": { "deleted": "MIC001" } }
```

### 欠席API

#### POST /api/absence

欠席連絡送信。

- **認証**: 必須

```json
// Request
{ "eventId": "...", "reason": "体調不良のため" }
```

### バス時刻表API

#### GET /api/bus-schedule

バス時刻表取得（NITページスクレイピング）。

- **認証**: 不要
- **クエリ**: `date` - YYYY-MM-DD形式
- **キャッシュ**: 当日23:59まで有効

```json
// Response
{
    "success": true,
    "data": {
        "lastUpdated": "2025-01-15T10:00:00Z",
        "schedules": [{ "departure": "08:00", "arrival": "08:30", "route": "..." }]
    }
}
```

## GAS API
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

### ベースURL

```
NEXT_PUBLIC_GAS_API_URL
```

### 共通レスポンス

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

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `?path=items` | 機材一覧取得 |
| POST | `?path=items` | 機材登録 |
| POST | `?path=items/update` | 機材更新 |
| POST | `?path=items/delete` | 機材削除 |
| GET | `?path=schedules` | スケジュール一覧取得 |
| GET | `?path=absences&date={date}` | 日付指定の欠席者一覧 |
| GET | `?path=event-absences&eventId={eventId}` | イベント指定の欠席者一覧 |
| GET | `?path=health` | ヘルスチェック |
| GET | `?path=verify-member&identifier={studentId}` | 部員確認 |
| POST | `?path=push-subscribe` | プッシュ購読登録 |
| POST | `?path=push-unsubscribe` | プッシュ購読解除 |
| GET | `?path=push-subscriptions` | 購読者一覧取得 |

## エラーハンドリング
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

### HTTPステータス

| コード | 説明 |
|--------|------|
| 200 | 成功 |
| 400 | リクエスト不正 |
| 401 | 認証エラー |
| 403 | アクセス拒否 |
| 404 | リソースなし |
| 500 | サーバーエラー |

### エラーレスポンス

```json
{ "success": false, "error": "エラーメッセージ" }
```

## 認証ヘッダー
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

| 種類 | 方式 | 用途 |
|------|------|------|
| セッション | Cookie | Next.js API |
| APIシークレット | `Authorization: Bearer {PUSH_API_SECRET}` | push-send |
| GAS API | `Authorization: Bearer {GAS_API_SECRET}` | GAS呼び出し |
