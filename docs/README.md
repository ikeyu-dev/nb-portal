# NB-Portal 技術ドキュメント

NB-Portalの技術的なドキュメントをまとめたディレクトリ。

## ドキュメント一覧

### ユーザー向け

| ドキュメント                                                 | 説明         |
| ------------------------------------------------------------ | ------------ |
| [user-guide.md](./user-guide.md)                             | 使い方ガイド |
| [calendar-feature-summary.md](./calendar-feature-summary.md) | 機能まとめ   |

### 技術ドキュメント

| ドキュメント                                           | 説明                             |
| ------------------------------------------------------ | -------------------------------- |
| [architecture.md](./architecture.md)                   | プロジェクト構成とアーキテクチャ |
| [authentication.md](./authentication.md)               | 認証の仕組み                     |
| [api-reference.md](./api-reference.md)                 | APIリファレンス                  |
| [pwa-push-notification.md](./pwa-push-notification.md) | PWAとプッシュ通知                |
| [security-fixes.md](./security-fixes.md)               | セキュリティ修正履歴             |

## 技術スタック

### フレームワーク

- **Next.js 16**: App Routerを使用したReactフレームワーク
- **React 19**: UIライブラリ
- **TypeScript**: 静的型付け

### 認証

- **NextAuth.js v5 (Auth.js)**: 認証ライブラリ
- **Microsoft Entra ID**: Azure ADによるSSO

### スタイリング

- **Tailwind CSS 4**: ユーティリティファーストCSS
- **DaisyUI 5**: Tailwindコンポーネントライブラリ

### PWA/通知

- **next-pwa**: PWA統合
- **web-push**: Web Push Protocol実装

### バックエンド

- **Google Apps Script**: スプレッドシートベースのAPI
- **Clasp**: GASのCLI管理ツール

## 環境変数

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
