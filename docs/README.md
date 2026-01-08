# NB-Portal 技術ドキュメント
<span style="display:block;height:3px;background:#2a83a2;margin-top:-8px;margin-bottom:16px;"></span>

## ドキュメント一覧
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

### ユーザー向け

| ドキュメント | 説明 |
|-------------|------|
| [user-guide.md](./user-guide.md) | 使い方ガイド |
| [calendar-feature-summary.md](./calendar-feature-summary.md) | 機能まとめ |

### 技術ドキュメント

| ドキュメント | 説明 |
|-------------|------|
| [architecture.md](./architecture.md) | アーキテクチャ |
| [authentication.md](./authentication.md) | 認証 |
| [api-reference.md](./api-reference.md) | APIリファレンス |
| [pwa-push-notification.md](./pwa-push-notification.md) | PWA・プッシュ通知 |
| [security-fixes.md](./security-fixes.md) | セキュリティ修正履歴 |

## 技術スタック
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

### フレームワーク

- **Next.js 16** - App Router
- **React 19** - UI
- **TypeScript** - 静的型付け

### 認証

- **NextAuth.js v5** - 認証ライブラリ
- **Microsoft Entra ID** - SSO

### スタイリング

- **Tailwind CSS 4** - ユーティリティCSS
- **DaisyUI 5** - コンポーネント

### PWA・通知

- **next-pwa** - PWA統合
- **web-push** - Web Push

### バックエンド

- **Google Apps Script** - スプレッドシートベースAPI
- **Clasp** - GAS CLI

## 環境変数
<span style="display:block;height:2px;background:#2a83a2;margin-top:-8px;margin-bottom:12px;"></span>

```bash
# 認証
AUTH_SECRET
AUTH_MICROSOFT_ENTRA_ID_ID
AUTH_MICROSOFT_ENTRA_ID_SECRET
AUTH_MICROSOFT_ENTRA_ID_TENANT_ID

# GAS API
NEXT_PUBLIC_GAS_API_URL
GAS_API_SECRET

# プッシュ通知
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
PUSH_API_SECRET
```
